
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Wallet = {
  id: string;
  name: string;
  account_type: string;
  balance: number | string;
};

type Debt = {
  id: string;
  name: string;
  creditor?: string | null;
  amount: number | string;
  paid_amount?: number | string | null;
  due_date: string;
  status: string;
  category?: string | null;
};

type Payment = {
  id: string;
  debt_id: string;
  account_id: string;
  amount: number | string;
  paid_at: string;
  created_at?: string;
};

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const numberValue = (value: number | string | null | undefined) =>
  Number(value ?? 0);

function remaining(debt: Debt) {
  return Math.max(
    0,
    numberValue(debt.amount) - numberValue(debt.paid_amount),
  );
}

function debtStatus(debt: Debt) {
  if (remaining(debt) <= 0 || debt.status === "pago") return "Pago";

  if (debt.due_date) {
    const due = new Date(`${debt.due_date}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = Math.ceil(
      (due.getTime() - today.getTime()) / 86_400_000,
    );

    if (days < 0) return "Atrasado";
    if (days <= 3) return "Vence em breve";
  }

  return "Pendente";
}

export default function FinanceiroPage() {
  const supabase = getSupabaseBrowserClient();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");

  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState("banco");
  const [walletBalance, setWalletBalance] = useState("");

  const [selectedDebt, setSelectedDebt] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const user = authData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const [walletResult, debtResult, paymentResult] = await Promise.all([
        supabase
          .from("wallet_accounts")
          .select("id,name,account_type,balance")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),

        supabase
          .from("debts")
          .select("*")
          .eq("user_id", user.id)
          .order("due_date", { ascending: true }),

        supabase
          .from("debt_payments")
          .select("id,debt_id,account_id,amount,paid_at,created_at")
          .eq("user_id", user.id)
          .order("paid_at", { ascending: false }),
      ]);

      if (walletResult.error) throw walletResult.error;
      if (debtResult.error) throw debtResult.error;
      if (paymentResult.error) throw paymentResult.error;

      setWallets((walletResult.data ?? []) as Wallet[]);
      setDebts((debtResult.data ?? []) as Debt[]);
      setPayments((paymentResult.data ?? []) as Payment[]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados financeiros.",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalWallets = wallets.reduce(
    (sum, wallet) => sum + numberValue(wallet.balance),
    0,
  );

  const totalDebt = debts.reduce(
    (sum, debt) => sum + numberValue(debt.amount),
    0,
  );

  const totalPaid = debts.reduce(
    (sum, debt) => sum + numberValue(debt.paid_amount),
    0,
  );

  const totalRemaining = debts.reduce(
    (sum, debt) => sum + remaining(debt),
    0,
  );

  const overdueTotal = debts
    .filter((debt) => debtStatus(debt) === "Atrasado")
    .reduce((sum, debt) => sum + remaining(debt), 0);

  async function addWallet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const balance = Number(walletBalance.replace(",", "."));

    if (!userId || !walletName.trim()) {
      setMessage("Informe o nome da conta.");
      return;
    }

    if (!walletBalance.trim() || !Number.isFinite(balance) || balance < 0) {
      setMessage("Informe um saldo válido, igual ou maior que zero.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("wallet_accounts").insert({
        user_id: userId,
        name: walletName.trim(),
        account_type: walletType,
        balance,
      });

      if (error) throw error;

      setWalletName("");
      setWalletBalance("");
      setMessage("Conta adicionada com sucesso.");
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao adicionar a conta.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function adjustWallet(
    wallet: Wallet,
    direction: "add" | "subtract",
  ) {
    const promptText =
      direction === "add"
        ? "Quanto deseja adicionar ao saldo?"
        : "Quanto deseja retirar do saldo?";

    const answer = window.prompt(promptText);

    if (answer === null) return;

    const amount = Number(answer.replace(",", "."));

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Informe um valor maior que zero.");
      return;
    }

    const current = numberValue(wallet.balance);
    const next =
      direction === "add" ? current + amount : current - amount;

    if (next < 0) {
      setMessage("O saldo da conta não pode ficar negativo.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("wallet_accounts")
        .update({ balance: next, updated_at: new Date().toISOString() })
        .eq("id", wallet.id)
        .eq("user_id", userId);

      if (error) throw error;

      setMessage("Saldo atualizado.");
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível atualizar o saldo.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function registerPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const amount = Number(paymentAmount.replace(",", "."));
    const debt = debts.find((item) => item.id === selectedDebt);

    if (!debt || !selectedWallet) {
      setMessage("Selecione a dívida e a conta usada para pagar.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Informe um valor de pagamento válido.");
      return;
    }

    if (amount > remaining(debt)) {
      setMessage("O pagamento não pode ultrapassar o saldo restante da dívida.");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc("register_debt_payment", {
        p_debt_id: selectedDebt,
        p_account_id: selectedWallet,
        p_amount: amount,
        p_paid_at: paymentDate,
      });

      if (error) throw error;

      if (data && data.success === false) {
        throw new Error(data.message || "O pagamento não foi registrado.");
      }

      setPaymentAmount("");
      setMessage("Pagamento registrado e saldo atualizado.");
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o pagamento.",
      );
    } finally {
      setSaving(false);
    }
  }

  const debtNames = new Map(debts.map((debt) => [debt.id, debt.name]));
  const walletNames = new Map(wallets.map((wallet) => [wallet.id, wallet.name]));

  return (
    <main className="finance-page">
      <style jsx>{`
        .finance-page {
          min-height: 100vh;
          padding: 28px 18px 48px;
          background: #f3f6fb;
          color: #172033;
        }
        .container {
          max-width: 1180px;
          margin: 0 auto;
        }
        .top {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        h1 {
          margin: 0;
          font-size: clamp(27px, 4vw, 36px);
          font-weight: 800;
        }
        .muted {
          color: #64748b;
          margin-top: 7px;
        }
        .nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .nav a, button {
          border: 0;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }
        .nav a {
          background: white;
          color: #1e293b;
          border: 1px solid #dbe3ee;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 5px 20px #0f172a08;
          margin-bottom: 18px;
        }
        .stat-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }
        .stat-value {
          margin-top: 8px;
          font-size: clamp(21px, 3vw, 27px);
          font-weight: 800;
          overflow-wrap: anywhere;
        }
        h2 {
          margin: 0 0 16px;
          font-size: 19px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px;
          align-items: end;
        }
        label {
          display: grid;
          gap: 7px;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
        }
        input, select {
          width: 100%;
          min-width: 0;
          padding: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: white;
          color: #172033;
          font: inherit;
        }
        button.primary {
          background: #0f766e;
          color: white;
        }
        button.secondary {
          background: #e8eef7;
          color: #1e293b;
        }
        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .account-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }
        .account {
          border: 1px solid #dce5ef;
          border-radius: 13px;
          padding: 16px;
        }
        .account-name {
          font-weight: 800;
        }
        .balance {
          font-size: 23px;
          font-weight: 800;
          margin: 10px 0;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .debt-list {
          display: grid;
          gap: 10px;
        }
        .debt-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          border: 1px solid #e2e8f0;
          border-left: 5px solid #eab308;
          border-radius: 12px;
          padding: 14px;
        }
        .debt-row.overdue { border-left-color: #dc2626; }
        .debt-row.soon { border-left-color: #f97316; }
        .debt-row.paid { border-left-color: #16a34a; }
        .debt-title {
          font-weight: 800;
          overflow-wrap: anywhere;
        }
        .debt-details {
          color: #64748b;
          font-size: 13px;
          margin-top: 5px;
        }
        .status {
          display: inline-block;
          border-radius: 999px;
          background: #fef3c7;
          color: #92400e;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
        .status.red { background: #fee2e2; color: #991b1b; }
        .status.green { background: #dcfce7; color: #166534; }
        .notice {
          border-radius: 10px;
          padding: 12px 14px;
          background: #e0f2fe;
          color: #075985;
          margin-bottom: 16px;
          overflow-wrap: anywhere;
        }
        .empty {
          color: #64748b;
          padding: 14px 0;
        }
        .table-wrap { overflow-x: auto; }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 500px;
        }
        th, td {
          padding: 12px 10px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
        }
        th { color: #64748b; }
        @media (max-width: 520px) {
          .finance-page { padding: 20px 12px 35px; }
          .card { padding: 15px; }
          .debt-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="container">
        <header className="top">
          <div>
            <h1>Financeiro</h1>
            <p className="muted">
              Contas, saldos, dívidas e pagamentos em um só lugar.
            </p>
          </div>
          <nav className="nav">
            <Link href="/dashboard">Painel</Link>
            <Link href="/dividas">Dívidas</Link>
            <Link href="/perfil">Perfil</Link>
          </nav>
        </header>

        {message && <div className="notice" role="status">{message}</div>}

        {loading ? (
          <section className="card">Carregando seus dados financeiros...</section>
        ) : (
          <>
            <section className="stats">
              <article className="card">
                <div className="stat-label">Dinheiro disponível</div>
                <div className="stat-value">{money(totalWallets)}</div>
              </article>
              <article className="card">
                <div className="stat-label">Total original das dívidas</div>
                <div className="stat-value">{money(totalDebt)}</div>
              </article>
              <article className="card">
                <div className="stat-label">Total já pago</div>
                <div className="stat-value">{money(totalPaid)}</div>
              </article>
              <article className="card">
                <div className="stat-label">Dívida restante</div>
                <div className="stat-value">{money(totalRemaining)}</div>
              </article>
              <article className="card">
                <div className="stat-label">Dívidas atrasadas</div>
                <div className="stat-value">{money(overdueTotal)}</div>
              </article>
            </section>

            <section className="card">
              <h2>Minhas contas e carteiras</h2>
              {wallets.length === 0 ? (
                <p className="empty">
                  Cadastre seu primeiro banco, carteira digital ou dinheiro em espécie.
                </p>
              ) : (
                <div className="account-grid">
                  {wallets.map((wallet) => (
                    <article className="account" key={wallet.id}>
                      <div className="account-name">{wallet.name}</div>
                      <div className="muted">{wallet.account_type}</div>
                      <div className="balance">{money(numberValue(wallet.balance))}</div>
                      <div className="actions">
                        <button
                          className="secondary"
                          disabled={saving}
                          onClick={() => void adjustWallet(wallet, "add")}
                        >
                          + Adicionar
                        </button>
                        <button
                          className="secondary"
                          disabled={saving}
                          onClick={() => void adjustWallet(wallet, "subtract")}
                        >
                          − Retirar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="card">
              <h2>Adicionar conta ou carteira</h2>
              <form className="form-grid" onSubmit={addWallet}>
                <label>
                  Nome da conta
                  <input
                    required
                    value={walletName}
                    onChange={(event) => setWalletName(event.target.value)}
                    placeholder="Ex.: Caixa Tem, Bradesco, dinheiro"
                  />
                </label>
                <label>
                  Tipo
                  <select
                    value={walletType}
                    onChange={(event) => setWalletType(event.target.value)}
                  >
                    <option value="banco">Banco</option>
                    <option value="carteira digital">Carteira digital</option>
                    <option value="dinheiro">Dinheiro em espécie</option>
                    <option value="poupança">Poupança</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>
                <label>
                  Saldo inicial (R$)
                  <input
                    required
                    inputMode="decimal"
                    value={walletBalance}
                    onChange={(event) => setWalletBalance(event.target.value)}
                    placeholder="0,00"
                  />
                </label>
                <button className="primary" disabled={saving} type="submit">
                  {saving ? "Salvando..." : "Adicionar conta"}
                </button>
              </form>
            </section>

            <section className="card">
              <h2>Registrar pagamento de dívida</h2>
              {debts.filter((debt) => remaining(debt) > 0).length === 0 ? (
                <p className="empty">
                  Não há dívidas pendentes cadastradas. Você pode adicionar dívidas na página Dívidas.
                </p>
              ) : wallets.length === 0 ? (
                <p className="empty">
                  Primeiro cadastre uma conta ou carteira com saldo disponível.
                </p>
              ) : (
                <form className="form-grid" onSubmit={registerPayment}>
                  <label>
                    Dívida
                    <select
                      required
                      value={selectedDebt}
                      onChange={(event) => setSelectedDebt(event.target.value)}
                    >
                      <option value="">Selecione uma dívida</option>
                      {debts
                        .filter((debt) => remaining(debt) > 0)
                        .map((debt) => (
                          <option key={debt.id} value={debt.id}>
                            {debt.name} — restante {money(remaining(debt))}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Pagar com
                    <select
                      required
                      value={selectedWallet}
                      onChange={(event) => setSelectedWallet(event.target.value)}
                    >
                      <option value="">Selecione uma conta</option>
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.name} — {money(numberValue(wallet.balance))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Valor pago (R$)
                    <input
                      required
                      inputMode="decimal"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      placeholder="0,00"
                    />
                  </label>
                  <label>
                    Data do pagamento
                    <input
                      required
                      type="date"
                      value={paymentDate}
                      onChange={(event) => setPaymentDate(event.target.value)}
                    />
                  </label>
                  <button className="primary" disabled={saving} type="submit">
                    {saving ? "Registrando..." : "Registrar pagamento"}
                  </button>
                </form>
              )}
              <p className="muted">
                O registro usa a função segura do banco para atualizar o saldo da conta,
                o valor pago da dívida e o histórico juntos.
              </p>
            </section>

            <section className="card">
              <h2>Minhas dívidas</h2>
              {debts.length === 0 ? (
                <p className="empty">
                  Nenhuma dívida encontrada. Cadastre uma na página Dívidas.
                </p>
              ) : (
                <div className="debt-list">
                  {debts.map((debt) => {
                    const status = debtStatus(debt);
                    const rowClass =
                      status === "Atrasado"
                        ? "overdue"
                        : status === "Vence em breve"
                          ? "soon"
                          : status === "Pago"
                            ? "paid"
                            : "";

                    const badgeClass =
                      status === "Atrasado"
                        ? "status red"
                        : status === "Pago"
                          ? "status green"
                          : "status";

                    return (
                      <article className={`debt-row ${rowClass}`} key={debt.id}>
                        <div>
                          <div className="debt-title">{debt.name}</div>
                          <div className="debt-details">
                            {debt.creditor ? `Credor: ${debt.creditor} · ` : ""}
                            Vencimento: {debt.due_date || "Não informado"}
                            {debt.category ? ` · ${debt.category}` : ""}
                          </div>
                          <div className="debt-details">
                            Original: {money(numberValue(debt.amount))} · Pago:{" "}
                            {money(numberValue(debt.paid_amount))} · Restante:{" "}
                            {money(remaining(debt))}
                          </div>
                        </div>
                        <span className={badgeClass}>{status}</span>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card">
              <h2>Histórico de pagamentos</h2>
              {payments.length === 0 ? (
                <p className="empty">Nenhum pagamento registrado ainda.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Dívida</th>
                        <th>Conta utilizada</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{payment.paid_at}</td>
                          <td>{debtNames.get(payment.debt_id) ?? "Dívida"}</td>
                          <td>{walletNames.get(payment.account_id) ?? "Conta"}</td>
                          <td>{money(numberValue(payment.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

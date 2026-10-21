"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Habit = {
  id: string;
  name: string;
  category: string;
  goal_amount: number;
  active: boolean;
};

type Entry = {
  id: string;
  habit_id: string;
  entry_date: string;
  status: "occurred" | "not_occurred" | "prefer_not_to_say";
  amount_spent: number;
  notes: string | null;
};

const suggestions = [
  { category: "apostas", name: "Apostas e jogos" },
  { category: "bebidas", name: "Bebidas alcoólicas" },
  { category: "compras", name: "Compras por impulso" },
  { category: "alimentacao", name: "Delivery e alimentação" },
  { category: "transporte", name: "Transporte" },
  { category: "assinaturas", name: "Assinaturas" },
  { category: "pessoal", name: "Compras pessoais" },
  { category: "outros", name: "Outro gasto ou hábito" },
];

const money = (value: number) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function localDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#172033",
    padding: "24px 16px 48px",
    fontFamily: "Arial, Helvetica, sans-serif",
  } as const,
  container: { maxWidth: 1120, margin: "0 auto" } as const,
  panel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 4px 18px rgba(15,23,42,.04)",
  } as const,
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontSize: 15,
    marginTop: 7,
    background: "#fff",
    color: "#172033",
  } as const,
  button: {
    border: 0,
    borderRadius: 10,
    padding: "12px 16px",
    background: "#176b50",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  } as const,
};

export default function HabitosControlePage() {
  const router = useRouter();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [habitName, setHabitName] = useState("");
  const [category, setCategory] = useState("personalizado");
  const [goal, setGoal] = useState("");

  const [selectedHabit, setSelectedHabit] = useState("");
  const [entryDate, setEntryDate] = useState(localDate());
  const [status, setStatus] = useState<Entry["status"]>("prefer_not_to_say");
  const [amount, setAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!auth.user) {
      router.replace("/login");
      return;
    }

    setUserId(auth.user.id);

    const [habitResult, entryResult] = await Promise.all([
      supabase
        .from("habit_controls")
        .select("id,name,category,goal_amount,active")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("habit_control_entries")
        .select("id,habit_id,entry_date,status,amount_spent,notes")
        .eq("user_id", auth.user.id)
        .order("entry_date", { ascending: false })
        .limit(100),
    ]);

    if (habitResult.error) throw habitResult.error;
    if (entryResult.error) throw entryResult.error;

    const loadedHabits = (habitResult.data || []) as Habit[];
    setHabits(loadedHabits);
    setEntries((entryResult.data || []) as Entry[]);

    setSelectedHabit((previous) => {
      if (loadedHabits.some((habit) => habit.id === previous && habit.active)) {
        return previous;
      }
      return loadedHabits.find((habit) => habit.active)?.id || "";
    });
  }, [router]);

  useEffect(() => {
    void refresh()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Não foi possível carregar os dados.")
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const activeHabits = habits.filter((habit) => habit.active);

  const totals = useMemo(() => {
    const today = localDate();
    const date = new Date(`${today}T12:00:00`);
    const weekday = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - weekday);
    const weekStart = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    const monthStart = `${today.slice(0, 7)}-01`;

    return {
      today: entries
        .filter((entry) => entry.entry_date === today)
        .reduce((sum, entry) => sum + Number(entry.amount_spent), 0),
      week: entries
        .filter((entry) => entry.entry_date >= weekStart && entry.entry_date <= today)
        .reduce((sum, entry) => sum + Number(entry.amount_spent), 0),
      month: entries
        .filter((entry) => entry.entry_date >= monthStart && entry.entry_date <= today)
        .reduce((sum, entry) => sum + Number(entry.amount_spent), 0),
    };
  }, [entries]);

  async function addHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!userId) {
      setError("Entre na sua conta para continuar.");
      return;
    }

    const name = habitName.trim();
    const goalAmount = goal.trim() ? Number(goal) : 0;

    if (!name || name.length > 80) {
      setError("Informe um nome de até 80 caracteres.");
      return;
    }

    if (!Number.isFinite(goalAmount) || goalAmount < 0) {
      setError("A meta deve ser um valor válido e não negativo.");
      return;
    }

    setSaving(true);
    try {
      const { data, error: insertError } = await getSupabaseBrowserClient()
        .from("habit_controls")
        .insert({
          user_id: userId,
          name,
          category,
          goal_amount: goalAmount,
          active: true,
        })
        .select("id,name,category,goal_amount,active")
        .single();

      if (insertError) throw insertError;

      setHabits((previous) => [data as Habit, ...previous]);
      setSelectedHabit(data.id);
      setHabitName("");
      setGoal("");
      setMessage("Categoria adicionada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível adicionar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const spent = Number(amount);

    if (!selectedHabit || !entryDate) {
      setError("Escolha uma categoria e uma data.");
      return;
    }

    if (!Number.isFinite(spent) || spent < 0) {
      setError("Informe um valor válido, igual ou maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const { error: saveError } = await getSupabaseBrowserClient()
        .from("habit_control_entries")
        .upsert(
          {
            user_id: userId,
            habit_id: selectedHabit,
            entry_date: entryDate,
            status,
            amount_spent: spent,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,habit_id,entry_date" }
        );

      if (saveError) throw saveError;

      setMessage("Registro diário salvo.");
      setNotes("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o registro.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleHabit(habit: Habit) {
    setError("");
    setMessage("");

    const { error: updateError } = await getSupabaseBrowserClient()
      .from("habit_controls")
      .update({ active: !habit.active })
      .eq("id", habit.id)
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setHabits((previous) =>
      previous.map((item) =>
        item.id === habit.id ? { ...item, active: !item.active } : item
      )
    );

    if (habit.active && selectedHabit === habit.id) {
      setSelectedHabit(activeHabits.find((item) => item.id !== habit.id)?.id || "");
    } else if (!habit.active) {
      setSelectedHabit(habit.id);
    }

    setMessage(
      habit.active
        ? "Categoria ocultada. O histórico foi preservado."
        : "Categoria reativada."
    );
  }

  const habitNameById = (id: string) =>
    habits.find((habit) => habit.id === id)?.name || "Categoria arquivada";

  const statusLabel = (value: Entry["status"]) => {
    if (value === "occurred") return "Aconteceu";
    if (value === "not_occurred") return "Não aconteceu";
    return "Preferi não informar";
  };

  return (
    <main className="habits-page" style={styles.page}>
      <div style={styles.container}>
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 30,
          }}
        >
          <Link
            href="/"
            style={{ color: "#176b50", fontWeight: 800, fontSize: 21, textDecoration: "none" }}
          >
            Resgata+
          </Link>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/dashboard">Painel</Link>
            <Link href="/dividas">Dívidas</Link>
            <Link href="/financeiro">Financeiro</Link>
            <Link href="/perfil">Perfil</Link>
          </div>
        </nav>

        <header style={{ marginBottom: 24 }}>
          <p style={{ color: "#176b50", fontWeight: 700, marginBottom: 8 }}>
            SEU DINHEIRO, SUAS ESCOLHAS
          </p>
          <h1 style={{ fontSize: "clamp(2rem,5vw,3rem)", margin: "0 0 12px" }}>
            Hábitos &amp; Controle
          </h1>
          <p style={{ color: "#526078", lineHeight: 1.7, maxWidth: 760 }}>
            Acompanhe os comportamentos e gastos que fazem sentido para você.
            Escolha suas categorias, registre no seu ritmo e acompanhe seu histórico
            sem julgamentos.
          </p>
        </header>

        {error && (
          <p role="alert" style={{ padding: 14, background: "#fff1f2", color: "#9f1239", borderRadius: 10 }}>
            {error}
          </p>
        )}
        {message && (
          <p role="status" style={{ padding: 14, background: "#dcfce7", color: "#166534", borderRadius: 10 }}>
            {message}
          </p>
        )}

        {loading ? (
          <section style={styles.panel}>Carregando seus dados...</section>
        ) : (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
                gap: 14,
                marginBottom: 20,
              }}
            >
              {[
                { title: "Gastos registrados hoje", value: totals.today },
                { title: "Nesta semana", value: totals.week },
                { title: "Neste mês", value: totals.month },
              ].map((item) => (
                <article key={item.title} style={styles.panel}>
                  <p style={{ color: "#64748b", marginTop: 0 }}>{item.title}</p>
                  <strong style={{ fontSize: 26 }}>{money(item.value)}</strong>
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 0 }}>
                    Apenas registros informados por você.
                  </p>
                </article>
              ))}
            </section>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))",
                gap: 20,
                alignItems: "start",
              }}
            >
              <section style={styles.panel}>
                <h2 style={{ marginTop: 0 }}>1. Escolha o que acompanhar</h2>
                <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                  Nada vem ativado por padrão. Se nenhuma sugestão fizer sentido,
                  você pode criar uma categoria própria ou simplesmente não adicionar nada.
                </p>

                <form onSubmit={addHabit}>
                  <label style={{ display: "block", marginTop: 16, fontWeight: 600 }}>
                    Nome da categoria
                    <input
                      style={styles.input}
                      value={habitName}
                      onChange={(event) => setHabitName(event.target.value)}
                      placeholder="Ex.: lanches fora de casa"
                      maxLength={80}
                      required
                    />
                  </label>

                  <label style={{ display: "block", marginTop: 16, fontWeight: 600 }}>
                    Sugestão de categoria
                    <select
                      style={styles.input}
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      <option value="personalizado">Categoria personalizada</option>
                      {suggestions.map((item) => (
                        <option key={item.category} value={item.category}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "block", marginTop: 16, fontWeight: 600 }}>
                    Meta mensal de gastos (opcional)
                    <input
                      style={styles.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={goal}
                      onChange={(event) => setGoal(event.target.value)}
                      placeholder="Deixe vazio se não quiser definir meta"
                    />
                  </label>

                  <button style={{ ...styles.button, marginTop: 18 }} disabled={saving}>
                    {saving ? "Salvando..." : "Adicionar categoria"}
                  </button>
                </form>

                <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: "24px 0" }} />

                <h3>Minhas categorias</h3>
                {habits.length === 0 && (
                  <p style={{ color: "#64748b" }}>
                    Você ainda não escolheu categorias. Adicione apenas as que deseja acompanhar.
                  </p>
                )}

                <div style={{ display: "grid", gap: 10 }}>
                  {habits.map((habit) => (
                    <div
                      key={habit.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 13,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        opacity: habit.active ? 1 : 0.65,
                      }}
                    >
                      <div>
                        <strong>{habit.name}</strong>
                        <div style={{ color: "#64748b", fontSize: 13, marginTop: 5 }}>
                          {Number(habit.goal_amount) > 0
                            ? `Meta mensal: ${money(Number(habit.goal_amount))}`
                            : "Sem meta definida"}
                          {!habit.active ? " · Oculta" : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{
                          ...styles.button,
                          background: habit.active ? "#e2e8f0" : "#176b50",
                          color: habit.active ? "#334155" : "#fff",
                          padding: "9px 11px",
                          flexShrink: 0,
                        }}
                        onClick={() => void toggleHabit(habit)}
                      >
                        {habit.active ? "Ocultar" : "Reativar"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <div style={{ display: "grid", gap: 20 }}>
                <section style={styles.panel}>
                  <h2 style={{ marginTop: 0 }}>2. Registro diário</h2>
                  {activeHabits.length === 0 ? (
                    <p style={{ color: "#64748b", lineHeight: 1.7 }}>
                      Adicione uma categoria para começar. Você não precisa acompanhar
                      hábitos que não fazem parte da sua vida.
                    </p>
                  ) : (
                    <form onSubmit={saveEntry}>
                      <label style={{ display: "block", fontWeight: 600 }}>
                        Categoria
                        <select
                          style={styles.input}
                          value={selectedHabit}
                          onChange={(event) => setSelectedHabit(event.target.value)}
                          required
                        >
                          {activeHabits.map((habit) => (
                            <option key={habit.id} value={habit.id}>
                              {habit.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: "block", marginTop: 16, fontWeight: 600 }}>
                        Data
                        <input
                          style={styles.input}
                          type="date"
                          value={entryDate}
                          onChange={(event) => setEntryDate(event.target.value)}
                          max={localDate()}
                          required
                        />
                      </label>

                      <fieldset style={{ border: 0, padding: 0, margin: "18px 0" }}>
                        <legend style={{ fontWeight: 600, marginBottom: 10 }}>
                          O que você prefere registrar?
                        </legend>
                        {([
                          ["occurred", "Aconteceu"],
                          ["not_occurred", "Não aconteceu"],
                          ["prefer_not_to_say", "Prefiro não informar"],
                        ] as const).map(([value, label]) => (
                          <label
                            key={value}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                              margin: "12px 0",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name="daily-status"
                              value={value}
                              checked={status === value}
                              onChange={() => setStatus(value)}
                            />
                            {label}
                          </label>
                        ))}
                      </fieldset>

                      <label style={{ display: "block", fontWeight: 600 }}>
                        Quanto gastou? (R$)
                        <input
                          style={styles.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          required
                        />
                      </label>

                      <label style={{ display: "block", marginTop: 16, fontWeight: 600 }}>
                        Observações (opcional)
                        <textarea
                          style={{ ...styles.input, resize: "vertical" }}
                          rows={3}
                          maxLength={1000}
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          placeholder="Anote o que considerar importante..."
                        />
                      </label>

                      <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
                        Se registrar novamente a mesma categoria e data, o registro
                        anterior será atualizado, evitando duplicidade diária.
                      </p>

                      <button style={styles.button} disabled={saving}>
                        {saving ? "Salvando..." : "Salvar registro diário"}
                      </button>
                    </form>
                  )}
                </section>

                <section style={styles.panel}>
                  <h2 style={{ marginTop: 0 }}>3. Histórico</h2>
                  <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                    Dias sem registro continuam sendo dias sem informação — não são
                    contabilizados como dias em que o comportamento não aconteceu.
                  </p>

                  {entries.length === 0 ? (
                    <p style={{ color: "#64748b" }}>Seu histórico aparecerá aqui.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {entries.map((entry) => (
                        <article
                          key={entry.id}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            padding: 14,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <strong>{habitNameById(entry.habit_id)}</strong>
                            <strong>{money(Number(entry.amount_spent))}</strong>
                          </div>
                          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
                            {new Date(`${entry.entry_date}T12:00:00`).toLocaleDateString("pt-BR")}
                            {" · "}
                            {statusLabel(entry.status)}
                          </p>
                          {entry.notes && (
                            <p style={{ marginBottom: 0, overflowWrap: "anywhere" }}>
                              {entry.notes}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                  <p style={{ color: "#64748b", fontSize: 12, marginTop: 16 }}>
                    Exibindo até os últimos 100 registros.
                  </p>
                </section>
              </div>
            </div>
          </>
        )}

        <footer style={{ color: "#64748b", fontSize: 13, lineHeight: 1.7, marginTop: 24 }}>
          Seus registros são privados e associados à sua conta. Ocultar uma categoria
          preserva o histórico. Este módulo não movimenta sua carteira, não paga dívidas
          e não envia automaticamente informações para outros módulos.
        </footer>
      </div>
    </main>
  );
}

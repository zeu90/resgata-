"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;

      if (data.session && data.user) {
        const { error: profileError } = await supabase.from("users").upsert({
          id: data.user.id,
          name,
          email,
        });
        if (profileError) throw profileError;
        router.replace("/dashboard");
        router.refresh();
      } else {
        setMessage("Confira seu e-mail para confirmar o cadastro antes de entrar.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container page" style={{ maxWidth: 520 }}>
      <Link className="brand" href="/">Resgata<span> Dívidas</span></Link>
      <section className="panel" style={{ marginTop: 28 }}>
        <h1 style={{ fontSize: "2.3rem" }}>Criar conta</h1>
        <p className="muted">Comece com 7 dias grátis.</p>
        <form className="form" onSubmit={submit}>
          <label className="field">Nome
            <input autoComplete="name" maxLength={120} required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">E-mail
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">Senha (mínimo 8 caracteres)
            <input type="password" minLength={8} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          {message && <p className="success" role="status">{message}</p>}
          <button className="btn primary" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</button>
        </form>
        <p className="muted">Já tem conta? <Link href="/login">Entrar</Link></p>
      </section>
    </main>
  );
}

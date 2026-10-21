"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container page" style={{ maxWidth: 520 }}>
      <Link className="brand" href="/">Resgata<span> Dívidas</span></Link>
      <section className="panel" style={{ marginTop: 28 }}>
        <h1 style={{ fontSize: "2.3rem" }}>Entrar</h1>
        <p className="muted">Acesse sua conta.</p>
        <form className="form" onSubmit={submit}>
          <label className="field">E-mail
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">Senha
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
        </form>
        <p className="muted">Não tem conta? <Link href="/register">Cadastre-se</Link></p>
      </section>
    </main>
  );
}

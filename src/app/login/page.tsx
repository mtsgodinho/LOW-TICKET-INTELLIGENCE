"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, ArrowRight, LockKeyhole } from "lucide-react";
export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fields = new FormData(e.currentTarget);
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fields)),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      router.push("/mineracao");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no login.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="login-brand">
        <Radar size={40} />
        <h1>
          Low Ticket
          <br />
          <span>Intelligence</span>
        </h1>
        <p>
          Encontre sinais.
          <br />
          Construa oportunidades.
        </p>
      </div>
      <form onSubmit={submit} className="panel login-form">
        <LockKeyhole className="cyan" />
        <p className="eyebrow">ACESSO EXCLUSIVO</p>
        <h2>Bem-vindo à sua operação.</h2>
        <p className="muted">Entre com sua conta administrativa.</p>
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Entrando…" : "Acessar plataforma"}
          <ArrowRight size={16} />
        </button>
        <small>
          Cadastro público desativado. Acesso restrito ao proprietário.
        </small>
      </form>
    </main>
  );
}

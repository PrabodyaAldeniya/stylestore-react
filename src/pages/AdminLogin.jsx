import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";

import { getAdminSession, loginAdmin } from "../lib/adminApi";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getAdminSession()
      .then((result) => {
        if (result.authenticated) navigate("/admin/products", { replace: true });
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [navigate]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await loginAdmin(form.username.trim(), form.password);
      navigate("/admin/products", { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Sign-in failed. Check your admin settings.");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <main className="admin-auth-page">
        <Loader2 className="spin" size={24} />
      </main>
    );
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card">
        <Link to="/" className="admin-back-link">
          <ArrowLeft size={15} /> Back to store
        </Link>
        <div className="admin-auth-icon"><LockKeyhole size={22} /></div>
        <span className="eyebrow">STYLESTORE ADMIN</span>
        <h1>Sign in to manage products</h1>
        <p className="admin-auth-copy">
          Use the admin account configured in the server environment. Product details and
          photos stay protected behind this page.
        </p>
        <form onSubmit={submit} className="admin-form">
          <label>
            Username
            <input
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
          {error && <p className="admin-form-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button" disabled={busy}>
            {busy && <Loader2 size={16} className="spin" />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="admin-auth-note">
          First time? Generate a password hash with the project command shown in
          <code> .env.example</code>, then set it on the server.
        </p>
      </section>
    </main>
  );
}

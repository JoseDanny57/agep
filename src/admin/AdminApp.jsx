import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import AdminPanel from "./AdminPanel";

const ADMIN_EMAIL = "josedanny09@gmail.com";

export default function AdminApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  function handleSession(session) {
    if (session) {
      if (session.user.email !== ADMIN_EMAIL) {
        setUnauthorized(true);
        setSession(null);
        setLoading(false);
        supabase.auth.signOut();
        return;
      }
      setUnauthorized(false);
      setSession(session);
      setLoading(false);
    } else {
      setSession(null);
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!email || !password) { setError("Completa todos los campos."); return; }
    setFormLoading(true);
    setError("");
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setError(result.error.message);
    setFormLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
          <div className="text-3xl mb-3">🚫</div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Acceso no autorizado</h2>
          <p className="text-sm text-slate-500 mb-4">
            Esta cuenta no tiene permisos de administrador.
          </p>
          <button
            onClick={() => setUnauthorized(false)}
            className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-blue-700 transition-colors"
          >
            Volver a intentar
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
              <span className="text-3xl">🛠️</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">AGEP Admin</h1>
            <p className="text-blue-200 text-sm mt-1">Panel de administración</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Iniciar sesión</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={formLoading}
                className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {formLoading ? "Cargando..." : "Ingresar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AdminPanel />;
}

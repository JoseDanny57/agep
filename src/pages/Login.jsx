import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login({ onDemoClick }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // login | register

  async function handleSubmit() {
    if (!email || !password) { setError("Completa todos los campos."); return; }
    setLoading(true);
    setError("");
    let result;
    if (mode === "login") {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ email, password });
    }
    if (result.error) setError(result.error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">📈</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AGEP</h1>
          <p className="text-blue-200 text-sm mt-1">Gestiona tu emprendimiento</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5">
            {mode === "login" ? "Bienvenido de vuelta" : "Crear cuenta"}
          </h2>
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
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading ? "Cargando..." : mode === "login" ? "Ingresar" : "Registrarme"}
            </button>
          </div>
          <div className="mt-5 text-center">
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-sm text-blue-600 font-medium hover:underline">
              {mode === "login" ? "¿Sin cuenta? Regístrate gratis" : "¿Ya tienes cuenta? Ingresa"}
            </button>
          </div>
        </div>

        {/* Botón demo */}
        <button onClick={onDemoClick}
          className="w-full mt-4 bg-white/10 border border-white/30 text-white font-medium rounded-xl py-3 text-sm hover:bg-white/20 transition-colors backdrop-blur-sm">
          👀 Ver demo sin registrarme
        </button>
      </div>
    </div>
  );
}

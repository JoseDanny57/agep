import { useState } from "react";
import { supabase } from "../lib/supabase";

const navItems = [
  { id: "dashboard",     label: "Dashboard",     icon: "📊" },
  { id: "ingresos",      label: "Ingresos",      icon: "💰" },
  { id: "gastos",        label: "Gastos",         icon: "💸" },
  { id: "pedidos",       label: "Pedidos",        icon: "📋" },
  { id: "cuentasPorCobrar", label: "Cuentas por Cobrar", icon: "💳" },
  { id: "servicios",     label: "Catálogo de Artículos", icon: "🧾" },
  { id: "inventario",    label: "Inventario",     icon: "📦" },
  { id: "capital",       label: "Capital Inicial", icon: "🏦" },
  { id: "costeo",        label: "Costeo",         icon: "🧮" },
  { id: "reportes",      label: "Reportes PDF",   icon: "📄" },
  { id: "configuracion", label: "Configuración",  icon: "⚙️" },
];

const bottomNav = ["dashboard", "ingresos", "gastos", "pedidos", "inventario"];

export default function Layout({ children, page, setPage, perfil }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color = perfil?.color_principal || "#2E75B6";

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header
        className="bg-white border-b border-slate-200 sticky top-0 z-40"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {perfil?.logo_url ? (
              <img src={perfil.logo_url} alt="Logo" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: color }}>
                {perfil?.nombre_negocio?.[0] || "A"}
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-800 text-sm leading-tight">{perfil?.nombre_negocio || "Mi Negocio"}</p>
              <p className="text-xs text-slate-400">{navItems.find(n => n.id === page)?.label}</p>
            </div>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="bg-black/40 flex-1" onClick={() => setMenuOpen(false)} />
          <div
            className="w-64 bg-white flex flex-col shadow-xl"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <div className="p-5 border-b border-slate-100" style={{ backgroundColor: color + "15" }}>
              <p className="font-bold text-slate-800">{perfil?.nombre_negocio}</p>
              <p className="text-xs text-slate-500 mt-0.5">{perfil?.nombre_propietario}</p>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map(item => (
                <button key={item.id}
                  onClick={() => { setPage(item.id); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    page === item.id ? "text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                  style={page === item.id ? { backgroundColor: color } : {}}>
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-100">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 font-medium">
                <span>🚪</span> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">
        {children}
      </main>
      <nav
        className="bg-white border-t border-slate-200 sticky bottom-0 z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-2xl mx-auto flex">
          {bottomNav.map(id => {
            const item = navItems.find(n => n.id === id);
            return (
              <button key={id}
                onClick={() => setPage(id)}
                className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                  page === id ? "text-blue-600" : "text-slate-400"
                }`}
                style={page === id ? { color } : {}}>
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import WhatsAppSupportModal from "./WhatsAppSupportModal";
import { cambiarModoOscuro } from "../utils/modoOscuro";

const navItems = [
  { id: "dashboard",     label: "Dashboard",     icon: "📊" },
  { id: "ingresos",      label: "Ingresos",      icon: "💰" },
  { id: "gastos",        label: "Gastos/Compras", icon: "💸" },
  { id: "pedidos",       label: "Pedidos",        icon: "📋" },
  { id: "cuentasPorCobrar", label: "Cuentas por Cobrar", icon: "💳" },
  { id: "servicios",     label: "Catálogo de Artículos", icon: "🧾" },
  { id: "inventario",    label: "Inventario",     icon: "📦" },
  { id: "capital",       label: "Capital Inicial", icon: "🏦" },
  { id: "costeo",        label: "Costeo",         icon: "🧮" },
  { id: "estadisticas",  label: "Estadísticas",   icon: "📈" },
  { id: "centroTributario", label: "Centro Tributario", icon: "🏛️" },
  { id: "reportes",      label: "Reportes PDF",   icon: "📄" },
  { id: "configuracion", label: "Configuración",  icon: "⚙️" },
];

const bottomNav = ["dashboard", "ingresos", "gastos", "pedidos", "inventario"];

export default function Layout({ children, page, setPage, perfil, setPerfil, userId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const color = perfil?.color_principal || "#2E75B6";
  const oscuro = !!perfil?.modo_oscuro;

  function toggleModoOscuro() {
    cambiarModoOscuro({ userId, perfil, setPerfil, nuevoValor: !oscuro });
  }

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <header
        className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40"
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
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">{perfil?.nombre_negocio || "Mi Negocio"}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{navItems.find(n => n.id === page)?.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleModoOscuro}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
              {oscuro ? "☀️" : "🌙"}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="bg-black/40 flex-1" onClick={() => setMenuOpen(false)} />
          <div
            className="w-64 h-full max-h-screen bg-white dark:bg-slate-800 flex flex-col shadow-xl overflow-hidden"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 shrink-0" style={{ backgroundColor: color + "15" }}>
              <p className="font-bold text-slate-800 dark:text-slate-100">{perfil?.nombre_negocio}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{perfil?.nombre_propietario}</p>
            </div>
            <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
              {navItems.map(item => (
                <button key={item.id}
                  onClick={() => { setPage(item.id); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    page === item.id ? "text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                  style={page === item.id ? { backgroundColor: color } : {}}>
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <a
                href="https://knbqjcuhcwtcjqjxxnxm.supabase.co/storage/v1/object/public/documentos/Manual_Usuario_AGEP_v2.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <span>📖</span>
                Manual de uso
              </a>
            </nav>
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 space-y-1 shrink-0">
              <button onClick={() => { setShowSupportModal(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium">
                <span>💬</span> Contactar soporte
              </button>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium">
                <span>🚪</span> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
      {showSupportModal && (
        <WhatsAppSupportModal onClose={() => setShowSupportModal(false)} />
      )}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">
        {children}
      </main>
      <nav
        className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-2xl mx-auto flex">
          {bottomNav.map(id => {
            const item = navItems.find(n => n.id === id);
            return (
              <button key={id}
                onClick={() => setPage(id)}
                className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                  page === id ? "text-blue-600" : "text-slate-400 dark:text-slate-500"
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

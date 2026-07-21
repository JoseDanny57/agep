import { supabase } from "../lib/supabase";
import { WHATSAPP_SUPPORT_OPTIONS, abrirWhatsAppSoporte } from "../utils/whatsapp";

const MENSAJE_RENOVACION = WHATSAPP_SUPPORT_OPTIONS.find(o => o.id === "renovacion")?.mensaje
  || "Hola, quiero renovar mi acceso a AGEP:";

export default function AccesoVencido() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AGEP</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 text-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
            Tu acceso a AGEP ha vencido
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            Tranquilo, tus datos están guardados y seguros. Contáctanos por WhatsApp para renovar tu acceso y seguir usando AGEP.
          </p>

          <button
            onClick={() => abrirWhatsAppSoporte(MENSAJE_RENOVACION)}
            className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            <span>💬</span> Renovar por WhatsApp
          </button>

          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full mt-3 text-slate-400 dark:text-slate-500 font-medium text-sm hover:text-slate-600 dark:hover:text-slate-300">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

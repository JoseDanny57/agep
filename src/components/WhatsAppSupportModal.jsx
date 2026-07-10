import { WHATSAPP_SUPPORT_OPTIONS, abrirWhatsAppSoporte } from "../utils/whatsapp";

export default function WhatsAppSupportModal({ onClose }) {
  function elegir(opcion) {
    abrirWhatsAppSoporte(opcion.mensaje);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Contactar soporte</h2>
        <p className="text-xs text-slate-400">Elegí el motivo de tu mensaje. Se abrirá WhatsApp con un mensaje prellenado.</p>

        <div className="space-y-2">
          {WHATSAPP_SUPPORT_OPTIONS.map(opcion => (
            <button key={opcion.id}
              onClick={() => elegir(opcion)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
              <span className="text-lg">{opcion.icon}</span>
              {opcion.label}
            </button>
          ))}
        </div>

        <button onClick={onClose}
          className="w-full border border-slate-200 text-slate-600 font-semibold rounded-xl py-3 text-sm hover:bg-slate-50">
          Cancelar
        </button>
      </div>
    </div>
  );
}

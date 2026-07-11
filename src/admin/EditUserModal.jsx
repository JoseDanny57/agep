import { useState } from "react";
import { supabase } from "../lib/supabase";

const ESTADOS = ["prueba", "activo", "exento", "vencido", "suspendido"];

export default function EditUserModal({ usuario, onClose, onSaved }) {
  const [estadoCuenta, setEstadoCuenta] = useState(usuario.estado_cuenta || "prueba");
  const [fechaLimite, setFechaLimite] = useState(usuario.fecha_limite_acceso || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleGuardar() {
    setSaving(true);
    setError("");
    const { error } = await supabase
      .from("perfiles")
      .update({
        estado_cuenta: estadoCuenta,
        fecha_limite_acceso: fechaLimite || null,
      })
      .eq("id", usuario.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6 space-y-4">
        <h2 className="font-bold text-slate-800 text-lg">Editar cuenta</h2>
        <p className="text-sm text-slate-500 -mt-2">
          {usuario.nombre_negocio || usuario.nombre_propietario || usuario.id}
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estado de cuenta</label>
          <select
            value={estadoCuenta}
            onChange={e => setEstadoCuenta(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ESTADOS.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha límite de acceso</label>
          <input
            type="date"
            value={fechaLimite || ""}
            onChange={e => setFechaLimite(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onClose}
            className="border border-slate-200 text-slate-600 font-semibold rounded-xl py-3 text-sm hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

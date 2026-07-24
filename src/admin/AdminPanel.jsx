import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import EditUserModal from "./EditUserModal";
import { mantenimientoActivo } from "../utils/mantenimiento";

const ESTADO_LABELS = {
  prueba: "Prueba",
  activo: "Activo",
  exento: "Exento",
  vencido: "Vencido",
  suspendido: "Suspendido",
};

const ESTADO_COLORS = {
  prueba: "bg-blue-50 text-blue-700",
  activo: "bg-green-50 text-green-700",
  exento: "bg-purple-50 text-purple-700",
  vencido: "bg-red-50 text-red-700",
  suspendido: "bg-slate-200 text-slate-700",
};

export default function AdminPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [mantenimientoHasta, setMantenimientoHasta] = useState(null);
  const [mantenimientoLoading, setMantenimientoLoading] = useState(true);
  const [mantenimientoGuardando, setMantenimientoGuardando] = useState(false);

  useEffect(() => { cargarUsuarios(); cargarMantenimiento(); }, []);

  async function cargarUsuarios() {
    setLoading(true);
    const { data } = await supabase
      .from("perfiles")
      .select("*")
      .order("nombre_negocio", { ascending: true });
    setUsuarios(data || []);
    setLoading(false);
  }

  async function eliminarUsuario(id) {
    setEliminandoId(id);
    await supabase.from("perfiles").delete().eq("id", id);
    setEliminandoId(null);
    cargarUsuarios();
  }

  async function cargarMantenimiento() {
    setMantenimientoLoading(true);
    const { data } = await supabase
      .from("configuracion_sistema")
      .select("mantenimiento_hasta")
      .eq("id", 1)
      .single();
    setMantenimientoHasta(data?.mantenimiento_hasta ?? null);
    setMantenimientoLoading(false);
  }

  async function activarMantenimiento() {
    setMantenimientoGuardando(true);
    const hasta = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("configuracion_sistema")
      .update({ mantenimiento_hasta: hasta })
      .eq("id", 1);
    if (!error) setMantenimientoHasta(hasta);
    setMantenimientoGuardando(false);
  }

  async function desactivarMantenimiento() {
    setMantenimientoGuardando(true);
    const { error } = await supabase
      .from("configuracion_sistema")
      .update({ mantenimiento_hasta: null })
      .eq("id", 1);
    if (!error) setMantenimientoHasta(null);
    setMantenimientoGuardando(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Panel de administración</h1>
            <p className="text-sm text-slate-500">Usuarios registrados en AGEP</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-slate-500 font-medium hover:text-slate-700"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-5 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Modo mantenimiento</h2>
          <p className="text-sm text-slate-500 mb-4">
            Cuando está activo, todos los usuarios (excepto el administrador) ven una pantalla de mantenimiento en lugar de la App.
          </p>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              {mantenimientoLoading ? (
                <span className="text-sm text-slate-400">Cargando estado...</span>
              ) : mantenimientoActivo(mantenimientoHasta) ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                  🛠️ Activo hasta {new Date(mantenimientoHasta).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                  ✅ Inactivo
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={activarMantenimiento}
                disabled={mantenimientoGuardando || mantenimientoLoading}
                className="bg-amber-600 text-white font-semibold rounded-xl px-4 py-2 text-sm hover:bg-amber-700 transition-colors disabled:opacity-60"
              >
                Activar mantenimiento (30 min)
              </button>
              <button
                onClick={desactivarMantenimiento}
                disabled={mantenimientoGuardando || mantenimientoLoading || !mantenimientoHasta}
                className="bg-slate-200 text-slate-700 font-semibold rounded-xl px-4 py-2 text-sm hover:bg-slate-300 transition-colors disabled:opacity-60"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Cargando usuarios...</div>
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No hay usuarios registrados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-600">Negocio</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Propietario</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Estado</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Fecha límite</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-800">{u.nombre_negocio || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{u.nombre_propietario || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_COLORS[u.estado_cuenta] || "bg-slate-100 text-slate-600"}`}>
                          {ESTADO_LABELS[u.estado_cuenta] || u.estado_cuenta || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.fecha_limite_acceso || "—"}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditando(u)}
                          className="text-blue-600 font-medium hover:underline mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            const nombre = u.nombre_negocio || u.nombre_propietario || u.id;
                            if (window.confirm(`¿Eliminar el perfil de "${nombre}"? Esta acción no se puede deshacer.`)) {
                              eliminarUsuario(u.id);
                            }
                          }}
                          disabled={eliminandoId === u.id}
                          className="text-red-600 font-medium hover:underline disabled:opacity-50"
                        >
                          {eliminandoId === u.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editando && (
        <EditUserModal
          usuario={editando}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); cargarUsuarios(); }}
        />
      )}
    </div>
  );
}

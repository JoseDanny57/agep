import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Configuracion({ perfil, setPerfil, userId }) {
  const [form, setForm] = useState({
    nombre_negocio: perfil?.nombre_negocio || "",
    nombre_propietario: perfil?.nombre_propietario || "",
    moneda: perfil?.moneda || "CRC",
    tipo_negocio: perfil?.tipo_negocio || "",
    color_principal: perfil?.color_principal || "#2E75B6",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [catNueva, setCatNueva] = useState("");
  const [showCats, setShowCats] = useState(false);

  async function cargarCategorias() {
    setLoadingCats(true);
    const { data } = await supabase.from("categorias_gastos").select("*").eq("user_id", userId).order("nombre");
    setCategorias(data || []);
    setLoadingCats(false);
  }

  function toggleCats() {
    if (!showCats) cargarCategorias();
    setShowCats(s => !s);
  }

  async function guardar() {
    setSaving(true);
    const { data, error } = await supabase.from("perfiles").update(form).eq("id", userId).select().single();
    if (!error) { setPerfil(data); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  async function agregarCategoria() {
    if (!catNueva.trim()) return;
    await supabase.from("categorias_gastos").insert({ user_id: userId, nombre: catNueva.trim() });
    setCatNueva("");
    cargarCategorias();
  }

  async function eliminarCategoria(id) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    await supabase.from("categorias_gastos").delete().eq("id", id);
    cargarCategorias();
  }

  const color = form.color_principal;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Configuración</h1>

      {/* Perfil */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Perfil del negocio</h2>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre del negocio</label>
          <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.nombre_negocio} onChange={e => setForm(f => ({ ...f, nombre_negocio: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre del propietario</label>
          <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.nombre_propietario} onChange={e => setForm(f => ({ ...f, nombre_propietario: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Moneda</label>
            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}>
              <option value="CRC">₡ Colones (CRC)</option>
              <option value="USD">$ Dólares (USD)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de negocio</label>
            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={form.tipo_negocio} onChange={e => setForm(f => ({ ...f, tipo_negocio: e.target.value }))}>
              <option value="productos">Productos</option>
              <option value="servicios">Servicios</option>
              <option value="mixto">Mixto</option>
              <option value="pedidos">Pedidos</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Color de marca</label>
          <div className="flex items-center gap-3">
            <input type="color" className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer p-1"
              value={form.color_principal} onChange={e => setForm(f => ({ ...f, color_principal: e.target.value }))} />
            <div className="flex gap-2">
              {["#2E75B6", "#16a34a", "#dc2626", "#7c3aed", "#ea580c", "#0891b2"].map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color_principal: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color_principal === c ? "border-slate-800 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>

        <button onClick={guardar} disabled={saving}
          className="w-full text-white font-semibold rounded-xl py-3 text-sm hover:opacity-90 disabled:opacity-40 transition-all"
          style={{ backgroundColor: color }}>
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar cambios"}
        </button>
      </div>

      {/* Categorías */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button onClick={toggleCats}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50">
          <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">Categorías de gastos</span>
          <span className="text-slate-400 text-lg">{showCats ? "▲" : "▼"}</span>
        </button>

        {showCats && (
          <div className="px-5 pb-5 space-y-3 border-t border-slate-50">
            <div className="flex gap-2 mt-3">
              <input className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nueva categoría..." value={catNueva}
                onChange={e => setCatNueva(e.target.value)}
                onKeyDown={e => e.key === "Enter" && agregarCategoria()} />
              <button onClick={agregarCategoria}
                className="text-white px-4 rounded-xl text-sm font-medium hover:opacity-90"
                style={{ backgroundColor: color }}>+</button>
            </div>
            {loadingCats ? (
              <p className="text-sm text-slate-400 text-center py-3">Cargando...</p>
            ) : categorias.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">Sin categorías. Agrega una.</p>
            ) : (
              <div className="space-y-1.5 mt-2">
                {categorias.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50">
                    <span className="text-sm text-slate-700">{cat.nombre}</span>
                    <button onClick={() => eliminarCategoria(cat.id)} className="text-slate-300 hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cerrar sesión */}
      <button onClick={() => supabase.auth.signOut()}
        className="w-full border border-red-200 text-red-500 font-semibold rounded-xl py-3 text-sm hover:bg-red-50 transition-colors">
        🚪 Cerrar sesión
      </button>
    </div>
  );
}

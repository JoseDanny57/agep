import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const UNIDADES = ["unidades", "metros", "kg", "litros", "gramos", "cm", "piezas"];

export default function Inventario({ perfil, userId }) {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: "", unidad: "unidades", costo_unitario: "", stock_actual: "", stock_minimo: "" });
  const [saving, setSaving] = useState(false);
  const color = perfil?.color_principal || "#2E75B6";
  const moneda = perfil?.moneda || "CRC";

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const { data } = await supabase.from("materiales").select("*").eq("user_id", userId).order("nombre");
    setMateriales(data || []);
    setLoading(false);
  }

  function abrirNuevo() {
    setEditando(null);
    setForm({ nombre: "", unidad: "unidades", costo_unitario: "", stock_actual: "", stock_minimo: "" });
    setShowForm(true);
  }

  function abrirEditar(mat) {
    setEditando(mat.id);
    setForm({ nombre: mat.nombre, unidad: mat.unidad, costo_unitario: mat.costo_unitario, stock_actual: mat.stock_actual, stock_minimo: mat.stock_minimo });
    setShowForm(true);
  }

  async function guardar() {
    if (!form.nombre || !form.unidad) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      nombre: form.nombre,
      unidad: form.unidad,
      costo_unitario: Number(form.costo_unitario) || 0,
      stock_actual: Number(form.stock_actual) || 0,
      stock_minimo: Number(form.stock_minimo) || 0,
    };

    if (editando) {
      await supabase.from("materiales").update(payload).eq("id", editando);
    } else {
      await supabase.from("materiales").insert(payload);
    }

    setShowForm(false);
    setSaving(false);
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este material?")) return;
    await supabase.from("materiales").delete().eq("id", id);
    cargar();
  }

  function fmtCosto(monto) {
    if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
    return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
  }

  const bajosStock = materiales.filter(m => Number(m.stock_actual) <= Number(m.stock_minimo));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Inventario</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{materiales.length} materiales</p>
        </div>
        <button onClick={abrirNuevo}
          className="text-white font-bold rounded-xl px-4 py-2.5 text-sm shadow-sm hover:opacity-90"
          style={{ backgroundColor: color }}>
          + Agregar
        </button>
      </div>

      {bajosStock.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300">⚠️ {bajosStock.length} material(es) con stock bajo</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">{editando ? "Editar material" : "Nuevo material"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nombre *</label>
              <input className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Globos látex" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Unidad *</label>
              <select className="w-full border border-slate-200 dark:border-slate-600 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800"
                value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Costo/unidad</label>
              <input type="number" className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0" value={form.costo_unitario}
                onChange={e => setForm(f => ({ ...f, costo_unitario: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Stock actual</label>
              <input type="number" className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0" value={form.stock_actual}
                onChange={e => setForm(f => ({ ...f, stock_actual: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Stock mínimo</label>
              <input type="number" className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0" value={form.stock_minimo}
                onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)}
              className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button onClick={guardar} disabled={saving || !form.nombre}
              className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: color }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">Cargando...</div>
      ) : materiales.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold text-slate-600 dark:text-slate-300">Sin materiales registrados</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Agrega tus materiales e insumos.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {materiales.map((mat, idx) => {
            const bajo = Number(mat.stock_actual) <= Number(mat.stock_minimo);
            return (
              <div key={mat.id}
                className={`flex items-center gap-3 px-4 py-3 ${idx < materiales.length - 1 ? "border-b border-slate-50 dark:border-slate-700" : ""}`}>
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${bajo ? "bg-amber-400" : "bg-green-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{mat.nombre}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {mat.stock_actual} {mat.unidad}
                    {bajo && <span className="ml-1 text-amber-500 dark:text-amber-400">⚠️ bajo</span>}
                    {mat.costo_unitario > 0 && <span className="ml-2">{fmtCosto(mat.costo_unitario)}/{mat.unidad.slice(0, 3)}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => abrirEditar(mat)} className="text-slate-400 dark:text-slate-500 hover:text-blue-500 text-xs px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40">✏️</button>
                  <button onClick={() => eliminar(mat.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-400 text-xs">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

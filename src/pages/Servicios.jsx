import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

export default function Servicios({ perfil, userId }) {
  const [servicios, setServicios] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [servicioAbierto, setServicioAbierto] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio_venta: "",
  });

  const [itemsMaterial, setItemsMaterial] = useState([]);

  const moneda = perfil?.moneda || "CRC";
  const color = perfil?.color_principal || "#2E75B6";

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const [{ data: s }, { data: m }] = await Promise.all([
      supabase.from("servicios")
        .select("*, servicio_materiales(*)")
        .eq("user_id", userId)
        .order("creado_en", { ascending: false }),
      supabase.from("materiales")
        .select("id, nombre, costo_unitario, unidad")
        .eq("user_id", userId)
        .order("nombre"),
    ]);
    setServicios(s || []);
    setMateriales(m || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ nombre: "", descripcion: "", precio_venta: "" });
    setItemsMaterial([]);
    setShowForm(false);
  }

  function agregarMaterial() {
    setItemsMaterial(items => [...items, { material_id: "", nombre_material: "", cantidad: "", costo_unitario: "" }]);
  }

  function actualizarMaterial(idx, campo, valor) {
    setItemsMaterial(items => items.map((item, i) => {
      if (i !== idx) return item;
      if (campo === "material_id") {
        if (valor === "__manual__") {
          return { ...item, material_id: "__manual__", nombre_material: "", costo_unitario: "" };
        }
        const mat = materiales.find(m => m.id === valor);
        return mat
          ? { ...item, material_id: mat.id, nombre_material: mat.nombre, costo_unitario: mat.costo_unitario }
          : { ...item, material_id: "", nombre_material: "", costo_unitario: "" };
      }
      return { ...item, [campo]: valor };
    }));
  }

  function quitarMaterial(idx) {
    setItemsMaterial(items => items.filter((_, i) => i !== idx));
  }

  function costoTotal(items) {
    return items.reduce((s, i) => s + (Number(i.cantidad) * Number(i.costo_unitario) || 0), 0);
  }

  async function guardar() {
    if (!form.nombre) return;
    setSaving(true);
    try {
      const { data: servicio, error } = await supabase.from("servicios").insert({
        user_id: userId,
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio_venta: Number(form.precio_venta) || null,
      }).select().single();

      if (error) throw error;

      if (itemsMaterial.length > 0) {
        const filas = itemsMaterial
          .filter(i => i.nombre_material && i.cantidad)
          .map(i => ({
            servicio_id: servicio.id,
            material_id: i.material_id || null,
            nombre_material: i.nombre_material,
            cantidad: Number(i.cantidad),
            costo_unitario: Number(i.costo_unitario) || 0,
          }));
        if (filas.length > 0) await supabase.from("servicio_materiales").insert(filas);
      }

      resetForm();
      cargar();
    } catch (err) {
      alert("Error al guardar el artículo.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este artículo del catálogo?")) return;
    await supabase.from("servicios").delete().eq("id", id);
    setServicioAbierto(null);
    cargar();
  }

  const costo = costoTotal(itemsMaterial);
  const gananciaEstimada = Number(form.precio_venta) - costo;

  if (loading) return <div className="text-center py-12 text-slate-400 dark:text-slate-500">Cargando...</div>;

  // Vista detalle de servicio
  if (servicioAbierto) {
    const s = servicioAbierto;
    const costoS = (s.servicio_materiales || []).reduce((sum, m) => sum + (Number(m.cantidad) * Number(m.costo_unitario)), 0);
    const ganancia = (s.precio_venta || 0) - costoS;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setServicioAbierto(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-xl">←</button>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex-1">{s.nombre}</h1>
          <button onClick={() => eliminar(s.id)} className="text-slate-300 hover:text-red-400 dark:text-slate-600 text-sm">🗑️</button>
        </div>

        {/* Info */}
        {s.descripcion && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{s.descripcion}</p>
          </div>
        )}

        {/* Financiero */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">RESUMEN FINANCIERO</p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Precio de venta</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{s.precio_venta ? fmt(s.precio_venta, moneda) : "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Costo de materiales</span>
            <span className="font-bold text-red-500 dark:text-red-400">{fmt(costoS, moneda)}</span>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-700 pt-2 flex justify-between text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Ganancia estimada</span>
            <span className={`font-bold text-lg ${ganancia >= 0 ? "text-green-600 dark:text-green-300" : "text-red-500 dark:text-red-400"}`}>{fmt(ganancia, moneda)}</span>
          </div>
        </div>

        {/* Materiales */}
        {(s.servicio_materiales || []).length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 pt-4 pb-2">MATERIALES</p>
            {s.servicio_materiales.map((m, idx) => (
              <div key={m.id} className={`flex items-center justify-between px-4 py-3 ${idx < s.servicio_materiales.length - 1 ? "border-b border-slate-50 dark:border-slate-700" : ""}`}>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.nombre_material}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{m.cantidad} × {fmt(m.costo_unitario, moneda)}</p>
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(m.cantidad * m.costo_unitario, moneda)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Catálogo de Artículos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{servicios.length} artículo{servicios.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="text-white font-bold rounded-xl px-4 py-2.5 text-sm shadow-sm hover:opacity-90"
          style={{ backgroundColor: color }}>
          + Nuevo
        </button>
      </div>

      {/* Formulario nuevo servicio */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Nuevo artículo</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nombre *</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
              placeholder="Ej: Arreglo de globos cumpleaños"
              value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Descripción (opcional)</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
              placeholder="Ej: Incluye 12 globos, base y cinta decorativa"
              value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Precio de venta ({moneda})</label>
            <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
              placeholder="0"
              value={form.precio_venta} onChange={e => setForm(f => ({ ...f, precio_venta: e.target.value }))} />
          </div>

          {/* Materiales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Materiales (opcional)</label>
              <button onClick={agregarMaterial} className="text-xs font-medium hover:opacity-80" style={{ color }}>+ Agregar</button>
            </div>

            {itemsMaterial.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-start">
                <div className="flex-1 space-y-2">
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                    value={item.material_id}
                    onChange={e => actualizarMaterial(idx, "material_id", e.target.value)}>
                    <option value="">Seleccionar material...</option>
                    {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    <option value="__manual__">✏️ Ingresar manualmente</option>
                  </select>
                  {item.material_id === "__manual__" && (
                    <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                      placeholder="Nombre del material"
                      value={item.nombre_material}
                      onChange={e => actualizarMaterial(idx, "nombre_material", e.target.value)} />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                      placeholder="Cantidad"
                      value={item.cantidad}
                      onChange={e => actualizarMaterial(idx, "cantidad", e.target.value)} />
                    <input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                      placeholder="Costo unit."
                      value={item.costo_unitario}
                      onChange={e => actualizarMaterial(idx, "costo_unitario", e.target.value)} />
                  </div>
                </div>
                <button onClick={() => quitarMaterial(idx)} className="text-slate-300 hover:text-red-400 dark:text-slate-600 mt-2">✕</button>
              </div>
            ))}
          </div>

          {/* Resumen financiero en tiempo real */}
          {(form.precio_venta || itemsMaterial.length > 0) && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 space-y-1">
              {costo > 0 && <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Costo materiales</span><span className="font-medium">{fmt(costo, moneda)}</span></div>}
              {form.precio_venta && <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Precio de venta</span><span className="font-medium">{fmt(Number(form.precio_venta), moneda)}</span></div>}
              {form.precio_venta && costo > 0 && (
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 dark:border-slate-700 pt-1 mt-1">
                  <span>Ganancia estimada</span>
                  <span className={gananciaEstimada >= 0 ? "text-green-600 dark:text-green-300" : "text-red-500 dark:text-red-400"}>{fmt(gananciaEstimada, moneda)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={resetForm}
              className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
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

      {/* Lista de servicios */}
      {servicios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🧾</p>
          <p className="font-semibold text-slate-600 dark:text-slate-300">Sin artículos registrados</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Creá tu primer artículo del catálogo.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {servicios.map((s, idx) => {
            const costoS = (s.servicio_materiales || []).reduce((sum, m) => sum + (Number(m.cantidad) * Number(m.costo_unitario)), 0);
            const ganancia = (s.precio_venta || 0) - costoS;
            return (
              <div key={s.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${idx < servicios.length - 1 ? "border-b border-slate-50 dark:border-slate-700" : ""}`}
                onClick={() => setServicioAbierto(s)}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{s.nombre}</p>
                  {s.descripcion && <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{s.descripcion}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {s.precio_venta && <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmt(s.precio_venta, moneda)}</p>}
                  {s.precio_venta && costoS > 0 && (
                    <p className={`text-xs font-medium ${ganancia >= 0 ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                      {ganancia >= 0 ? "+" : ""}{fmt(ganancia, moneda)}
                    </p>
                  )}
                </div>
                <span className="text-slate-300 dark:text-slate-600 text-sm">›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

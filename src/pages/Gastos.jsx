import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

export default function Gastos({ perfil, userId }) {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ descripcion: "", monto: "", categoria_id: "", fecha: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const moneda = perfil?.moneda || "CRC";
  const color = perfil?.color_principal || "#2E75B6";

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const [{ data: g }, { data: c }] = await Promise.all([
      supabase.from("gastos").select("*, categorias_gastos(nombre)").eq("user_id", userId).order("fecha", { ascending: false }),
      supabase.from("categorias_gastos").select("*").eq("user_id", userId).order("nombre"),
    ]);
    setGastos(g || []);
    setCategorias(c || []);
    setLoading(false);
  }

  async function guardar() {
    if (!form.descripcion || !form.monto) return;
    setSaving(true);
    await supabase.from("gastos").insert({
      user_id: userId,
      descripcion: form.descripcion,
      monto: Number(form.monto),
      fecha: form.fecha,
      ...(form.categoria_id ? { categoria_id: form.categoria_id } : {}),
    });
    setForm({ descripcion: "", monto: "", categoria_id: "", fecha: new Date().toISOString().split("T")[0] });
    setShowForm(false);
    setSaving(false);
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await supabase.from("gastos").delete().eq("id", id);
    cargar();
  }

  const total = gastos.reduce((s, r) => s + Number(r.monto), 0);

  const grupos = gastos.reduce((acc, g) => {
    const mes = g.fecha.slice(0, 7);
    if (!acc[mes]) acc[mes] = [];
    acc[mes].push(g);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Gastos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Total: <span className="font-semibold text-red-500">{fmt(total, moneda)}</span></p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="text-white font-bold rounded-xl px-4 py-2.5 text-sm shadow-sm hover:opacity-90"
          style={{ backgroundColor: color }}>
          + Agregar
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800">Nuevo gasto</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripción *</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Compra de globos"
              value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Monto ({moneda}) *</label>
              <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0" value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoría (opcional)</label>
            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)}
              className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={guardar} disabled={saving || !form.descripcion || !form.monto}
              className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: color }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : gastos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">💸</p>
          <p className="font-semibold text-slate-600">Sin gastos registrados</p>
          <p className="text-sm text-slate-400 mt-1">Registra tus egresos del mes.</p>
        </div>
      ) : (
        Object.entries(grupos).map(([mes, items]) => {
          const totalMes = items.reduce((s, i) => s + Number(i.monto), 0);
          const [anio, mesNum] = mes.split("-");
          const labelMes = new Date(Number(anio), Number(mesNum) - 1, 1).toLocaleDateString("es-CR", { month: "long", year: "numeric" });
          return (
            <div key={mes}>
              <div className="flex justify-between items-center mb-2 px-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider capitalize">{labelMes}</p>
                <p className="text-xs font-bold text-red-500">{fmt(totalMes, moneda)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {items.map((item, idx) => (
                  <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx < items.length - 1 ? "border-b border-slate-50" : ""}`}>
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-sm flex-shrink-0">💸</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{item.descripcion}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(item.fecha + "T12:00:00").toLocaleDateString("es-CR")}
                        {item.categorias_gastos && <span className="ml-2 bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[10px]">{item.categorias_gastos.nombre}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-red-500 text-sm whitespace-nowrap">{fmt(item.monto, moneda)}</p>
                      <button onClick={() => eliminar(item.id)} className="text-slate-300 hover:text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

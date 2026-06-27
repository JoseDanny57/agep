import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

export default function Ingresos({ perfil, userId }) {
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ descripcion: "", monto: "", fecha: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const moneda = perfil?.moneda || "CRC";
  const color = perfil?.color_principal || "#2E75B6";

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const { data } = await supabase.from("ingresos").select("*").eq("user_id", userId).order("fecha", { ascending: false });
    setIngresos(data || []);
    setLoading(false);
  }

  async function guardar() {
    if (!form.descripcion || !form.monto) return;
    setSaving(true);
    await supabase.from("ingresos").insert({ user_id: userId, ...form, monto: Number(form.monto) });
    setForm({ descripcion: "", monto: "", fecha: new Date().toISOString().split("T")[0] });
    setShowForm(false);
    setSaving(false);
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este ingreso?")) return;
    await supabase.from("ingresos").delete().eq("id", id);
    cargar();
  }

  const total = ingresos.reduce((s, r) => s + Number(r.monto), 0);

  // Group by month
  const grupos = ingresos.reduce((acc, i) => {
    const mes = i.fecha.slice(0, 7);
    if (!acc[mes]) acc[mes] = [];
    acc[mes].push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Ingresos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Total: <span className="font-semibold text-green-600">{fmt(total, moneda)}</span></p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="text-white font-bold rounded-xl px-4 py-2.5 text-sm shadow-sm hover:opacity-90"
          style={{ backgroundColor: color }}>
          + Agregar
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800">Nuevo ingreso</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripción *</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Venta de arreglo floral"
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

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : ingresos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">💰</p>
          <p className="font-semibold text-slate-600">Sin ingresos registrados</p>
          <p className="text-sm text-slate-400 mt-1">Agrega tu primera venta o ingreso.</p>
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
                <p className="text-xs font-bold text-green-600">{fmt(totalMes, moneda)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {items.map((item, idx) => (
                  <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx < items.length - 1 ? "border-b border-slate-50" : ""}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: color + "20", color }}>💰</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{item.descripcion}</p>
                      <p className="text-xs text-slate-400">{new Date(item.fecha + "T12:00:00").toLocaleDateString("es-CR")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-green-600 text-sm whitespace-nowrap">{fmt(item.monto, moneda)}</p>
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

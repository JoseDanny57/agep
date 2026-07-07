import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

const TIPOS = {
  caja:        { label: "Caja",          emoji: "💵", color: "border-green-500 text-green-600 bg-green-50",   bg: "#f0fdf4" },
  inversion:   { label: "Inversión",     emoji: "📈", color: "border-blue-500 text-blue-600 bg-blue-50",      bg: "#eff6ff" },
  activo_fijo: { label: "Activos Fijos", emoji: "🏢", color: "border-purple-500 text-purple-600 bg-purple-50", bg: "#f5f3ff" },
};

export default function CapitalInicial({ perfil, userId }) {
  const [rubros, setRubros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tipo: "caja", descripcion: "", monto: "", fecha: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const moneda = perfil?.moneda || "CRC";
  const color = perfil?.color_principal || "#2E75B6";

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const { data } = await supabase.from("saldos_iniciales").select("*").eq("user_id", userId).order("fecha", { ascending: false });
    setRubros(data || []);
    setLoading(false);
  }

  function abrirNuevo() {
    setEditando(null);
    setForm({ tipo: "caja", descripcion: "", monto: "", fecha: new Date().toISOString().split("T")[0] });
    setShowForm(true);
  }

  function abrirEditar(item) {
    setEditando(item.id);
    setForm({ tipo: item.tipo, descripcion: item.descripcion || "", monto: item.monto, fecha: item.fecha });
    setShowForm(true);
  }

  async function guardar() {
    if (!form.descripcion || !form.monto) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      tipo: form.tipo,
      descripcion: form.descripcion,
      monto: Number(form.monto),
      fecha: form.fecha,
    };

    if (editando) {
      await supabase.from("saldos_iniciales").update(payload).eq("id", editando);
    } else {
      await supabase.from("saldos_iniciales").insert(payload);
    }

    setShowForm(false);
    setSaving(false);
    cargar();
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este rubro?")) return;
    await supabase.from("saldos_iniciales").delete().eq("id", id);
    cargar();
  }

  const total = rubros.reduce((s, r) => s + Number(r.monto), 0);

  const grupos = Object.keys(TIPOS).map(tipo => ({
    tipo,
    items: rubros.filter(r => r.tipo === tipo),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Capital Inicial</h1>
          <p className="text-sm text-slate-500 mt-0.5">Total: <span className="font-semibold" style={{ color }}>{fmt(total, moneda)}</span></p>
        </div>
        <button onClick={abrirNuevo}
          className="text-white font-bold rounded-xl px-4 py-2.5 text-sm shadow-sm hover:opacity-90"
          style={{ backgroundColor: color }}>
          + Agregar rubro
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800">{editando ? "Editar rubro" : "Nuevo rubro"}</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TIPOS).map(([key, cfg]) => (
                <button key={key}
                  onClick={() => setForm(f => ({ ...f, tipo: key }))}
                  className={`py-2.5 rounded-xl text-xs font-medium border-2 transition-all ${form.tipo === key ? cfg.color : "border-slate-200 text-slate-500"}`}>
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripción *</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                form.tipo === "inversion"   ? "Ej: Aporte de socio" :
                form.tipo === "activo_fijo" ? "Ej: Máquina de coser" :
                "Ej: Efectivo en caja al iniciar"
              }
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

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : rubros.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🏦</p>
          <p className="font-semibold text-slate-600">Aún no registraste tu capital inicial</p>
          <p className="text-sm text-slate-400 mt-1">Agrega el primer rubro: caja, inversión o activos fijos con los que arrancó tu negocio.</p>
        </div>
      ) : (
        <>
          {grupos.map(({ tipo, items }) => {
            const cfg = TIPOS[tipo];
            const subtotal = items.reduce((s, i) => s + Number(i.monto), 0);
            return (
              <div key={tipo}>
                <div className="flex justify-between items-center mb-2 px-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{cfg.emoji} {cfg.label}</p>
                  <p className="text-xs font-bold text-slate-600">{fmt(subtotal, moneda)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {items.map((item, idx) => (
                    <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx < items.length - 1 ? "border-b border-slate-50" : ""}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: cfg.bg }}>
                        {cfg.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{item.descripcion}</p>
                        <p className="text-xs text-slate-400">{new Date(item.fecha + "T12:00:00").toLocaleDateString("es-CR")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 text-sm whitespace-nowrap">{fmt(item.monto, moneda)}</p>
                        <button onClick={() => abrirEditar(item)} className="text-slate-400 hover:text-blue-500 text-xs px-2 py-1 rounded-lg hover:bg-blue-50">✏️</button>
                        <button onClick={() => eliminar(item.id)} className="text-slate-300 hover:text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex justify-between items-center">
            <span className="font-semibold text-slate-700 text-sm">Total general</span>
            <span className="font-bold text-lg" style={{ color }}>{fmt(total, moneda)}</span>
          </div>
        </>
      )}
    </div>
  );
}

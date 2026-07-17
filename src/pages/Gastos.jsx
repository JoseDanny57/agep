import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

const TIPOS_VALIDOS_FACTURA = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
const MAX_SIZE_FACTURA = 5 * 1024 * 1024; // 5 MB

export default function Gastos({ perfil, userId }) {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    descripcion: "",
    monto: "",
    categoria_id: "",
    fecha: new Date().toISOString().split("T")[0],
    tipo: "operativo",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingFactura, setUploadingFactura] = useState(false);
  const [facturaUrl, setFacturaUrl] = useState(null);
  const [facturaPreview, setFacturaPreview] = useState(null);
  const [facturaError, setFacturaError] = useState(null);
  const [viendoFactura, setViendoFactura] = useState(null);
  const fileInputRef = useRef(null);
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

  async function subirFactura(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!TIPOS_VALIDOS_FACTURA.includes(file.type)) {
      setFacturaError("Formato no válido. Solo se aceptan JPG, PNG, GIF o PDF.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_FACTURA) {
      setFacturaError("El archivo supera el tamaño máximo de 5 MB.");
      e.target.value = "";
      return;
    }

    setFacturaError(null);
    setUploadingFactura(true);
    try {
      const extension = file.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("facturas")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("facturas").getPublicUrl(filePath);
      setFacturaUrl(urlData.publicUrl);
      setFacturaPreview(URL.createObjectURL(file));
    } catch (err) {
      alert("Error al subir la factura.");
      console.error(err);
    } finally {
      setUploadingFactura(false);
    }
  }

  function resetForm() {
    setForm({ descripcion: "", monto: "", categoria_id: "", fecha: new Date().toISOString().split("T")[0], tipo: "operativo" });
    setFacturaUrl(null);
    setFacturaPreview(null);
    setFacturaError(null);
    setShowForm(false);
  }

  async function guardar() {
    if (!form.descripcion || !form.monto) return;
    setSaving(true);
    await supabase.from("gastos").insert({
      user_id: userId,
      descripcion: form.descripcion,
      monto: Number(form.monto),
      fecha: form.fecha,
      tipo: form.tipo,
      ...(form.categoria_id ? { categoria_id: form.categoria_id } : {}),
      ...(facturaUrl ? { factura_url: facturaUrl } : {}),
    });
    resetForm();
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

  const tipoConfig = {
    operativo: { emoji: "💼", label: "Gasto operativo",      color: "border-blue-500 text-blue-600 bg-blue-50",     bg: "#fef2f2" },
    material:  { emoji: "📦", label: "Compra de material",   color: "border-amber-500 text-amber-600 bg-amber-50",  bg: "#fef3c7" },
    activo:    { emoji: "🔧", label: "Compra de activo",     color: "border-purple-500 text-purple-600 bg-purple-50", bg: "#f5f3ff" },
    retiro:    { emoji: "💵", label: "Retiro del propietario", color: "border-green-500 text-green-600 bg-green-50", bg: "#f0fdf4" },
  };

  return (
    <div className="space-y-4">

      {/* Modal ver factura */}
      {viendoFactura && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setViendoFactura(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViendoFactura(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-bold">✕</button>
            <img src={viendoFactura} alt="Factura" className="w-full rounded-2xl shadow-xl object-contain max-h-[80vh]" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Gastos/Compras</h1>
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

          {/* Tipo de egreso */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Tipo de egreso</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(tipoConfig).map(([key, cfg]) => (
                <button key={key}
                  onClick={() => setForm(f => ({ ...f, tipo: key }))}
                  className={`py-2.5 rounded-xl text-xs font-medium border-2 transition-all ${form.tipo === key ? cfg.color : "border-slate-200 text-slate-500"}`}>
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
            {form.tipo === "activo" && (
              <p className="text-[10px] text-purple-400 mt-1.5">Equipos, herramientas o mobiliario — no resta a la utilidad del mes.</p>
            )}
            {form.tipo === "material" && (
              <p className="text-[10px] text-amber-400 mt-1.5">Materias primas e insumos — no resta a la utilidad del mes.</p>
            )}
            {form.tipo === "retiro" && (
              <p className="text-[10px] text-green-500 mt-1.5">Salario o retiro del dueño — sí resta a la utilidad del mes.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripción *</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                form.tipo === "material" ? "Ej: Tela para vestidos" :
                form.tipo === "activo"   ? "Ej: Selladora industrial" :
                form.tipo === "retiro"   ? "Ej: Salario semana 1" :
                "Ej: Pago de electricidad"
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

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoría (opcional)</label>
            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Foto de factura */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Foto de factura (opcional)</label>
            <p className="text-[10px] text-slate-400 mb-2">JPG, PNG, GIF o PDF · Máx. 5 MB</p>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.pdf" className="hidden" onChange={subirFactura} />
            {facturaError && (
              <p className="text-xs text-red-500 mb-2">⚠️ {facturaError}</p>
            )}
            {facturaPreview ? (
              <div className="relative">
                <img src={facturaPreview} alt="Factura" className="w-full h-24 object-contain rounded-xl border border-slate-200 bg-slate-50 cursor-pointer"
                  onClick={() => setViendoFactura(facturaPreview)} />
                <p className="text-[10px] text-slate-400 text-center mt-1">Tocá la imagen para verla completa</p>
                <button onClick={() => { setFacturaUrl(null); setFacturaPreview(null); setFacturaError(null); }}
                  className="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-400 shadow text-xs">✕</button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFactura}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-500 disabled:opacity-40 transition-all">
                {uploadingFactura ? "Subiendo..." : "📷 Adjuntar foto de factura"}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={resetForm}
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
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: tipoConfig[item.tipo]?.bg || "#fef2f2" }}>
                      {tipoConfig[item.tipo]?.emoji || "💸"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{item.descripcion}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 flex-wrap">
                        {new Date(item.fecha + "T12:00:00").toLocaleDateString("es-CR")}
                        {item.tipo === "material" && <span className="bg-amber-100 text-amber-600 rounded-full px-2 py-0.5 text-[10px]">Material</span>}
                        {item.tipo === "activo"   && <span className="bg-purple-100 text-purple-600 rounded-full px-2 py-0.5 text-[10px]">Activo</span>}
                        {item.tipo === "retiro"   && <span className="bg-green-100 text-green-600 rounded-full px-2 py-0.5 text-[10px]">Retiro</span>}
                        {item.categorias_gastos && <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[10px]">{item.categorias_gastos.nombre}</span>}
                        {item.factura_url && (
                          <button onClick={() => setViendoFactura(item.factura_url)}
                            className="text-blue-400 hover:text-blue-600 text-[10px]">📄 Ver factura</button>
                        )}
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

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { compressImageIfNeeded } from "../lib/imageCompress";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

function esFacturaPdf(url) {
  return /\.pdf(\?|$)/i.test(url || "");
}

const TIPOS_VALIDOS_FACTURA = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
const MAX_SIZE_FACTURA = 5 * 1024 * 1024; // 5 MB

const NUEVA_CATEGORIA = "__nueva__";
const NUEVO_MATERIAL = "__nuevo_material__";
const UNIDADES = ["unidades", "metros", "kg", "litros", "gramos", "cm", "piezas"];
const GASTOS_DRAFT_KEY = "agep_gastos_borrador";

export default function Gastos({ perfil, userId }) {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    descripcion: "",
    monto: "",
    categoria_id: "",
    fecha: new Date().toISOString().split("T")[0],
    tipo: "operativo",
    proveedor: "",
    numero_comprobante: "",
    tarifa_iva: "13",
    observaciones: "",
    material_id: "",
    cantidad: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingFactura, setUploadingFactura] = useState(false);
  const [facturaUrl, setFacturaUrl] = useState(null);
  const [facturaPreview, setFacturaPreview] = useState(null);
  const [facturaNombre, setFacturaNombre] = useState(null);
  const [facturaEsPdf, setFacturaEsPdf] = useState(false);
  const [facturaError, setFacturaError] = useState(null);
  const [viendoFactura, setViendoFactura] = useState(null);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [showCompraModal, setShowCompraModal] = useState(false);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [nuevoMaterial, setNuevoMaterial] = useState({ nombre: "", unidad: "unidades", costo_unitario: "", stock_minimo: "" });
  const [guardandoMaterial, setGuardandoMaterial] = useState(false);
  const [avisoBorrador, setAvisoBorrador] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const fileInputRef = useRef(null);
  const moneda = perfil?.moneda || "CRC";
  const color = perfil?.color_principal || "#2E75B6";

  useEffect(() => {
    cargar();
    try {
      const raw = sessionStorage.getItem(GASTOS_DRAFT_KEY);
      if (raw) {
        const borrador = JSON.parse(raw);
        setForm(f => ({ ...f, ...borrador }));
        setShowForm(true);
        setAvisoBorrador(true);
      }
    } catch {
      sessionStorage.removeItem(GASTOS_DRAFT_KEY);
    }
  }, []);

  function guardarBorrador() {
    try {
      sessionStorage.setItem(GASTOS_DRAFT_KEY, JSON.stringify(form));
    } catch {
      // sessionStorage no disponible (modo privado, cuota llena, etc.) — se ignora, no es crítico.
    }
  }

  async function cargar() {
    const [{ data: g }, { data: c }, { data: m }] = await Promise.all([
      supabase.from("gastos").select("*, categorias_gastos(nombre)").eq("user_id", userId).order("fecha", { ascending: false }),
      supabase.from("categorias_gastos").select("*").eq("user_id", userId).order("nombre"),
      supabase.from("materiales").select("*").eq("user_id", userId).order("nombre"),
    ]);
    setGastos(g || []);
    setCategorias(c || []);
    setMateriales(m || []);
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

    setFacturaError(null);
    setUploadingFactura(true);
    try {
      let archivo = file;
      if (archivo.size > MAX_SIZE_FACTURA) {
        archivo = await compressImageIfNeeded(archivo, { maxSizeBytes: MAX_SIZE_FACTURA, maxWidth: 1600 });
      }
      if (archivo.size > MAX_SIZE_FACTURA) {
        setFacturaError("El archivo supera el tamaño máximo de 5 MB.");
        e.target.value = "";
        return;
      }

      const extension = archivo.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("facturas")
        .upload(filePath, archivo, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("facturas").getPublicUrl(filePath);
      const esPdf = archivo.type === "application/pdf";
      setFacturaUrl(urlData.publicUrl);
      setFacturaPreview(esPdf ? null : URL.createObjectURL(archivo));
      setFacturaNombre(archivo.name);
      setFacturaEsPdf(esPdf);
    } catch (err) {
      alert("Error al subir la factura.");
      console.error(err);
    } finally {
      setUploadingFactura(false);
    }
  }

  function resetForm() {
    setForm({
      descripcion: "",
      monto: "",
      categoria_id: "",
      fecha: new Date().toISOString().split("T")[0],
      tipo: "operativo",
      proveedor: "",
      numero_comprobante: "",
      tarifa_iva: "13",
      observaciones: "",
      material_id: "",
      cantidad: "",
    });
    setFacturaUrl(null);
    setFacturaPreview(null);
    setFacturaNombre(null);
    setFacturaEsPdf(false);
    setFacturaError(null);
    setShowForm(false);
    setAvisoBorrador(false);
    sessionStorage.removeItem(GASTOS_DRAFT_KEY);
  }

  function quitarFactura() {
    setFacturaUrl(null);
    setFacturaPreview(null);
    setFacturaNombre(null);
    setFacturaEsPdf(false);
    setFacturaError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function seleccionarTipo(key) {
    setForm(f => ({ ...f, tipo: key, ...(key !== "material" ? { material_id: "", cantidad: "" } : {}) }));
    if (key === "material") setShowCompraModal(true);
  }

  const esCompra = form.tipo === "material" || form.tipo === "activo";
  const esMaterial = form.tipo === "material";
  const faltanDatosCompra = esCompra && (!form.proveedor.trim() || !form.numero_comprobante.trim());
  const faltanDatosMaterial = esMaterial && (!form.material_id || Number(form.cantidad) <= 0);

  async function guardar() {
    if (!form.descripcion || !form.monto || !form.categoria_id || faltanDatosCompra || faltanDatosMaterial) return;
    setSaving(true);
    const camposCompra = esCompra
      ? {
        proveedor: form.proveedor || null,
        numero_comprobante: form.numero_comprobante || null,
        tarifa_iva: form.tipo === "material" ? Number(form.tarifa_iva || 13) : null,
        observaciones: form.observaciones || null,
      }
      : {};
    const camposMaterial = esMaterial
      ? { material_id: form.material_id, cantidad: Number(form.cantidad) }
      : {};
    const { error } = await supabase.from("gastos").insert({
      user_id: userId,
      descripcion: form.descripcion,
      monto: Number(form.monto),
      fecha: form.fecha,
      tipo: form.tipo,
      categoria_id: form.categoria_id,
      ...camposCompra,
      ...camposMaterial,
      ...(facturaUrl ? { factura_url: facturaUrl } : {}),
    });
    if (!error && esMaterial) {
      const { data: mat } = await supabase.from("materiales").select("stock_actual").eq("id", form.material_id).single();
      if (mat) {
        await supabase.from("materiales")
          .update({ stock_actual: Number(mat.stock_actual) + Number(form.cantidad) })
          .eq("id", form.material_id);
      }
    }
    resetForm();
    setSaving(false);
    cargar();
  }

  function handleCategoriaChange(e) {
    const val = e.target.value;
    if (val === NUEVA_CATEGORIA) {
      setShowCategoriaModal(true);
      return;
    }
    setForm(f => ({ ...f, categoria_id: val }));
  }

  function cancelarNuevaCategoria() {
    setNuevaCategoriaNombre("");
    setShowCategoriaModal(false);
  }

  async function crearCategoria() {
    if (!nuevaCategoriaNombre.trim()) return;
    setGuardandoCategoria(true);
    const { data, error } = await supabase.from("categorias_gastos")
      .insert({ user_id: userId, nombre: nuevaCategoriaNombre.trim() })
      .select().single();
    setGuardandoCategoria(false);
    if (error || !data) {
      alert("Error al crear la categoría.");
      return;
    }
    setCategorias(cs => [...cs, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setForm(f => ({ ...f, categoria_id: data.id }));
    setNuevaCategoriaNombre("");
    setShowCategoriaModal(false);
  }

  function handleMaterialChange(e) {
    const val = e.target.value;
    if (val === NUEVO_MATERIAL) {
      setNuevoMaterial(m => ({ ...m, nombre: form.descripcion.trim() }));
      setShowMaterialModal(true);
      return;
    }
    setForm(f => ({ ...f, material_id: val }));
  }

  function cancelarNuevoMaterial() {
    setNuevoMaterial({ nombre: "", unidad: "unidades", costo_unitario: "", stock_minimo: "" });
    setShowMaterialModal(false);
  }

  async function crearMaterial() {
    if (!nuevoMaterial.nombre.trim() || !nuevoMaterial.unidad || !nuevoMaterial.costo_unitario) return;
    setGuardandoMaterial(true);
    const { data, error } = await supabase.from("materiales")
      .insert({
        user_id: userId,
        nombre: nuevoMaterial.nombre.trim(),
        unidad: nuevoMaterial.unidad,
        costo_unitario: Number(nuevoMaterial.costo_unitario),
        stock_minimo: Number(nuevoMaterial.stock_minimo) || 0,
        stock_actual: 0,
      })
      .select().single();
    setGuardandoMaterial(false);
    if (error || !data) {
      alert("Error al crear el material.");
      return;
    }
    setMateriales(ms => [...ms, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setForm(f => ({ ...f, material_id: data.id }));
    setNuevoMaterial({ nombre: "", unidad: "unidades", costo_unitario: "", stock_minimo: "" });
    setShowMaterialModal(false);
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este gasto?")) return;
    const gasto = gastos.find(g => g.id === id);
    await supabase.from("gastos").delete().eq("id", id);
    if (gasto?.tipo === "material" && gasto.material_id) {
      const { data: mat } = await supabase.from("materiales").select("stock_actual").eq("id", gasto.material_id).single();
      if (mat) {
        const nuevoStock = Math.max(Number(mat.stock_actual) - Number(gasto.cantidad || 0), 0);
        await supabase.from("materiales").update({ stock_actual: nuevoStock }).eq("id", gasto.material_id);
      }
    }
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
    operativo: { emoji: "💼", label: "Gasto operativo",      color: "border-blue-500 text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/40",     bg: "#fef2f2" },
    material:  { emoji: "📦", label: "Compra de material",   color: "border-amber-500 text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",  bg: "#fef3c7" },
    activo:    { emoji: "🔧", label: "Compra de activo",     color: "border-purple-500 text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-950/40", bg: "#f5f3ff" },
    retiro:    { emoji: "💵", label: "Retiro del propietario", color: "border-green-500 text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-950/40", bg: "#f0fdf4" },
  };

  return (
    <div className="space-y-4">

      {/* Modal nueva categoría */}
      {showCategoriaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={cancelarNuevaCategoria}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Nueva categoría</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nombre</label>
              <input autoFocus className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                placeholder="Ej: Insumos"
                value={nuevaCategoriaNombre}
                onChange={e => setNuevaCategoriaNombre(e.target.value)}
                onKeyDown={e => e.key === "Enter" && crearCategoria()} />
            </div>
            <div className="flex gap-3">
              <button onClick={cancelarNuevaCategoria}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                Cancelar
              </button>
              <button onClick={crearCategoria} disabled={guardandoCategoria || !nuevaCategoriaNombre.trim()}
                className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: color }}>
                {guardandoCategoria ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo material */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={cancelarNuevoMaterial}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Nuevo material</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Nombre *</label>
              <input autoFocus className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                placeholder="Ej: Tela algodón"
                value={nuevoMaterial.nombre}
                onChange={e => setNuevoMaterial(m => ({ ...m, nombre: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Unidad *</label>
                <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                  value={nuevoMaterial.unidad} onChange={e => setNuevoMaterial(m => ({ ...m, unidad: e.target.value }))}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Costo/unidad *</label>
                <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                  placeholder="0"
                  value={nuevoMaterial.costo_unitario}
                  onChange={e => setNuevoMaterial(m => ({ ...m, costo_unitario: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Stock mínimo (opcional)</label>
              <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                placeholder="0"
                value={nuevoMaterial.stock_minimo}
                onChange={e => setNuevoMaterial(m => ({ ...m, stock_minimo: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button onClick={cancelarNuevoMaterial}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                Cancelar
              </button>
              <button onClick={crearMaterial} disabled={guardandoMaterial || !nuevoMaterial.nombre.trim() || !nuevoMaterial.unidad || !nuevoMaterial.costo_unitario}
                className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: color }}>
                {guardandoMaterial ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal explicativo: Compra de material */}
      {showCompraModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCompraModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">¿Qué cuenta como Compra?</h3>
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <p>Para el Régimen Simplificado, registrá aquí:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Mercadería para la venta</li>
                <li>Materias primas</li>
                <li>Materiales, insumos o suministros usados para fabricar o prestar el servicio</li>
                <li>Servicios contratados para la actividad del negocio (impresión, transporte, publicidad)</li>
              </ul>
              <p>Recordá incluir el IVA pagado en la compra.</p>
            </div>
            <button onClick={() => setShowCompraModal(false)}
              className="w-full text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90"
              style={{ backgroundColor: color }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal ver factura */}
      {viendoFactura && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setViendoFactura(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViendoFactura(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-bold">✕</button>
            <img src={viendoFactura} alt="Factura" className="w-full rounded-2xl shadow-xl object-contain max-h-[80vh]" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gastos/Compras</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Total: <span className="font-semibold text-red-500 dark:text-red-400">{fmt(total, moneda)}</span></p>
        </div>
        <button onClick={() => { setShowForm(true); setAvisoBorrador(false); }}
          className="text-white font-bold rounded-xl px-4 py-2.5 text-sm shadow-sm hover:opacity-90"
          style={{ backgroundColor: color }}>
          + Agregar
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Nuevo gasto</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">* Campo obligatorio</p>
          </div>

          {avisoBorrador && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
              <span className="text-sm">💾</span>
              <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">Tu dispositivo cerró la app momentáneamente al usar la cámara. Recuperamos lo que estabas escribiendo — solo falta que tomes la foto de nuevo.</p>
              <button onClick={() => setAvisoBorrador(false)} className="text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300 text-xs">✕</button>
            </div>
          )}

          {/* Tipo de egreso */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Tipo de egreso</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(tipoConfig).map(([key, cfg]) => (
                <button key={key}
                  onClick={() => seleccionarTipo(key)}
                  className={`py-2.5 rounded-xl text-xs font-medium border-2 transition-all ${form.tipo === key ? cfg.color : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"}`}>
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
            {form.tipo === "activo" && (
              <p className="text-[10px] text-purple-400 dark:text-purple-300 mt-1.5">Equipos, herramientas o mobiliario — no resta a la utilidad del mes.</p>
            )}
            {form.tipo === "material" && (
              <p className="text-[10px] text-amber-400 dark:text-amber-300 mt-1.5">Materias primas e insumos — no resta a la utilidad del mes.</p>
            )}
            {form.tipo === "retiro" && (
              <p className="text-[10px] text-green-500 dark:text-green-400 mt-1.5">Salario o retiro del dueño — sí resta a la utilidad del mes.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Descripción *</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
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
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Monto ({moneda}) *</label>
              <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                placeholder="0" value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">El monto debe incluir el IVA</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Fecha</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Categoría *</label>
            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              value={form.categoria_id} onChange={handleCategoriaChange}>
              <option value="">Seleccioná una categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              <option value={NUEVA_CATEGORIA}>+ Crear nueva categoría</option>
            </select>
          </div>

          {(form.tipo === "material" || form.tipo === "activo") && (
            <div className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
              {form.tipo === "material" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Material *</label>
                    <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                      value={form.material_id} onChange={handleMaterialChange}>
                      <option value="">Seleccioná un material</option>
                      {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      <option value={NUEVO_MATERIAL}>+ Crear nuevo material</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Cantidad comprada *</label>
                    <input type="number" min="0" step="any" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                      placeholder="0"
                      value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Proveedor *</label>
                  <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                    placeholder="Ej: Textiles ABC"
                    value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">N.° de comprobante *</label>
                  <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                    placeholder="Ej: F-00123"
                    value={form.numero_comprobante} onChange={e => setForm(f => ({ ...f, numero_comprobante: e.target.value }))} />
                </div>
              </div>

              {form.tipo === "material" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Tarifa de IVA (%)</label>
                  <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                    value={form.tarifa_iva} onChange={e => setForm(f => ({ ...f, tarifa_iva: e.target.value }))}>
                    <option value="0">0% (Exento)</option>
                    <option value="1">1%</option>
                    <option value="2">2%</option>
                    <option value="13">13%</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Observaciones (opcional)</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                  placeholder="Notas adicionales"
                  value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Foto de factura */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Foto de factura (opcional)</label>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">JPG, PNG, GIF o PDF · Máx. 5 MB</p>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.pdf" className="hidden" onChange={subirFactura} />
            {facturaError && (
              <p className="text-xs text-red-500 dark:text-red-400 mb-2">⚠️ {facturaError}</p>
            )}
            {facturaUrl && facturaEsPdf ? (
              <div className="relative">
                <a href={facturaUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-700">
                  <span className="text-2xl">📄</span>
                  <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{facturaNombre}</span>
                </a>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1">Tocá para abrir el PDF</p>
                <button onClick={quitarFactura}
                  className="absolute top-2 right-2 bg-white dark:bg-slate-800 rounded-full w-6 h-6 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-400 shadow text-xs">✕</button>
              </div>
            ) : facturaPreview ? (
              <div className="relative">
                <img src={facturaPreview} alt="Factura" className="w-full h-24 object-contain rounded-xl border border-slate-200 bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-900"
                  onClick={() => setViendoFactura(facturaPreview)} />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1">Tocá la imagen para verla completa</p>
                <button onClick={quitarFactura}
                  className="absolute top-2 right-2 bg-white dark:bg-slate-800 rounded-full w-6 h-6 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-400 shadow text-xs">✕</button>
              </div>
            ) : (
              <button onClick={() => { guardarBorrador(); fileInputRef.current?.click(); }} disabled={uploadingFactura}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-500 disabled:opacity-40 transition-all dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-500 dark:hover:text-slate-300">
                {uploadingFactura ? "Subiendo..." : "📷 Adjuntar foto de factura"}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={resetForm}
              className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button onClick={guardar} disabled={saving || !form.descripcion || !form.monto || !form.categoria_id || faltanDatosCompra || faltanDatosMaterial}
              className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: color }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">Cargando...</div>
      ) : gastos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">💸</p>
          <p className="font-semibold text-slate-600 dark:text-slate-300">Sin gastos registrados</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Registra tus egresos del mes.</p>
        </div>
      ) : (
        Object.entries(grupos).map(([mes, items]) => {
          const totalMes = items.reduce((s, i) => s + Number(i.monto), 0);
          const [anio, mesNum] = mes.split("-");
          const labelMes = new Date(Number(anio), Number(mesNum) - 1, 1).toLocaleDateString("es-CR", { month: "long", year: "numeric" });
          return (
            <div key={mes}>
              <div className="flex justify-between items-center mb-2 px-1">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider capitalize">{labelMes}</p>
                <p className="text-xs font-bold text-red-500 dark:text-red-400">{fmt(totalMes, moneda)}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                {items.map((item, idx) => (
                  <div key={item.id} onClick={() => setDetalle(item)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${idx < items.length - 1 ? "border-b border-slate-50 dark:border-slate-700" : ""}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: tipoConfig[item.tipo]?.bg || "#fef2f2" }}>
                      {tipoConfig[item.tipo]?.emoji || "💸"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{item.descripcion}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 flex-wrap">
                        {new Date(item.fecha + "T12:00:00").toLocaleDateString("es-CR")}
                        {item.tipo === "material" && <span className="bg-amber-100 text-amber-600 rounded-full px-2 py-0.5 text-[10px] dark:bg-amber-900/40 dark:text-amber-400">Material</span>}
                        {item.tipo === "activo"   && <span className="bg-purple-100 text-purple-600 rounded-full px-2 py-0.5 text-[10px] dark:bg-purple-900/40 dark:text-purple-300">Activo</span>}
                        {item.tipo === "retiro"   && <span className="bg-green-100 text-green-600 rounded-full px-2 py-0.5 text-[10px] dark:bg-green-900/40 dark:text-green-300">Retiro</span>}
                        {item.categorias_gastos && <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[10px] dark:bg-slate-700 dark:text-slate-400">{item.categorias_gastos.nombre}</span>}
                        {item.factura_url && (
                          <button onClick={e => { e.stopPropagation(); setViendoFactura(item.factura_url); }}
                            className="text-blue-400 hover:text-blue-600 text-[10px] dark:hover:text-blue-300">📄 Ver factura</button>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-red-500 dark:text-red-400 text-sm whitespace-nowrap">{fmt(item.monto, moneda)}</p>
                      <button onClick={e => { e.stopPropagation(); eliminar(item.id); }} className="text-slate-300 hover:text-red-400 text-xs dark:text-slate-600">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Modal detalle de gasto (solo lectura) */}
      {detalle && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetalle(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Detalle del gasto</h3>
              <button onClick={() => setDetalle(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Descripción</p>
                <p className="text-slate-800 dark:text-slate-100">{detalle.descripcion}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fecha</p>
                  <p className="text-slate-800 dark:text-slate-100">{new Date(detalle.fecha + "T12:00:00").toLocaleDateString("es-CR")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monto</p>
                  <p className="font-bold text-red-500 dark:text-red-400">{fmt(detalle.monto, moneda)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tipo</p>
                  <p className="text-slate-800 dark:text-slate-100">{tipoConfig[detalle.tipo]?.label || detalle.tipo}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Categoría</p>
                  <p className="text-slate-800 dark:text-slate-100">{detalle.categorias_gastos?.nombre || "—"}</p>
                </div>
              </div>

              {detalle.tipo === "material" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Material</p>
                    <p className="text-slate-800 dark:text-slate-100">{materiales.find(m => m.id === detalle.material_id)?.nombre || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cantidad comprada</p>
                    <p className="text-slate-800 dark:text-slate-100">{detalle.cantidad ?? "—"}</p>
                  </div>
                </div>
              )}

              {(detalle.proveedor || detalle.numero_comprobante) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Proveedor</p>
                    <p className="text-slate-800 dark:text-slate-100">{detalle.proveedor || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">N.° de comprobante</p>
                    <p className="text-slate-800 dark:text-slate-100">{detalle.numero_comprobante || "—"}</p>
                  </div>
                </div>
              )}

              {detalle.tarifa_iva != null && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tarifa de IVA</p>
                  <p className="text-slate-800 dark:text-slate-100">{detalle.tarifa_iva}%</p>
                </div>
              )}

              {detalle.observaciones && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Observaciones</p>
                  <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{detalle.observaciones}</p>
                </div>
              )}

              {detalle.factura_url && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Foto de factura</p>
                  {esFacturaPdf(detalle.factura_url) ? (
                    <a href={detalle.factura_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-700">
                      <span className="text-2xl">📄</span>
                      <span className="text-sm text-slate-600 dark:text-slate-300 truncate">Ver factura (PDF)</span>
                    </a>
                  ) : (
                    <img src={detalle.factura_url} alt="Factura" className="w-full h-32 object-contain rounded-xl border border-slate-200 bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-900"
                      onClick={() => setViendoFactura(detalle.factura_url)} />
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setDetalle(null)}
              className="w-full border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

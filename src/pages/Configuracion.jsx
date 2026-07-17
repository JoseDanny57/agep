import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import ColorPickerModal from "../components/ColorPickerModal";
import WhatsAppSupportModal from "../components/WhatsAppSupportModal";

const TIPOS_VALIDOS_LOGO = ["image/jpeg", "image/png", "image/gif"];
const MAX_SIZE_LOGO = 2 * 1024 * 1024; // 2 MB

export default function Configuracion({ perfil, setPerfil, userId }) {
  const [form, setForm] = useState({
    nombre_negocio: perfil?.nombre_negocio || "",
    nombre_propietario: perfil?.nombre_propietario || "",
    moneda: perfil?.moneda || "CRC",
    tipo_negocio: perfil?.tipo_negocio || "",
    color_principal: perfil?.color_principal || "#2E75B6",
    valor_hora: perfil?.valor_hora || 1583,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [catNueva, setCatNueva] = useState("");
  const [showCats, setShowCats] = useState(false);
  const [logoUrl, setLogoUrl] = useState(perfil?.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState(null);
  const [borrandoDatos, setBorrandoDatos] = useState(false);
  const [confirmBorrar, setConfirmBorrar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const fileInputRef = useRef(null);

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

  async function borrarTodosLosDatos() {
    setBorrandoDatos(true);
    try {
      // pedido_materiales / servicio_materiales no tienen user_id propio (solo pedido_id / servicio_id),
      // así que hay que borrarlas primero usando los IDs del usuario, antes que sus tablas padre.
      const [{ data: pedidosData }, { data: serviciosData }] = await Promise.all([
        supabase.from("pedidos").select("id").eq("user_id", userId),
        supabase.from("servicios").select("id").eq("user_id", userId),
      ]);
      const pedidoIds = (pedidosData || []).map(p => p.id);
      const servicioIds = (serviciosData || []).map(s => s.id);

      await Promise.all([
        pedidoIds.length > 0 ? supabase.from("pedido_materiales").delete().in("pedido_id", pedidoIds) : null,
        servicioIds.length > 0 ? supabase.from("servicio_materiales").delete().in("servicio_id", servicioIds) : null,
      ]);

      await Promise.all([
        supabase.from("pedidos").delete().eq("user_id", userId),
        supabase.from("servicios").delete().eq("user_id", userId),
        supabase.from("ingresos").delete().eq("user_id", userId),
        supabase.from("gastos").delete().eq("user_id", userId),
        supabase.from("materiales").delete().eq("user_id", userId),
        supabase.from("categorias_gastos").delete().eq("user_id", userId),
        supabase.from("saldos_iniciales").delete().eq("user_id", userId),
      ]);
      setConfirmBorrar(false);
      setCategorias([]);
      alert("✓ Todos los datos han sido eliminados. Tu perfil y configuración se mantienen.");
    } catch (err) {
      alert("Error al borrar los datos. Intentá de nuevo.");
      console.error(err);
    } finally {
      setBorrandoDatos(false);
    }
  }

  async function subirLogo(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!TIPOS_VALIDOS_LOGO.includes(file.type)) {
      setLogoError("Formato no válido. Solo se aceptan JPG, PNG o GIF.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_LOGO) {
      setLogoError("El archivo supera el tamaño máximo de 2 MB.");
      e.target.value = "";
      return;
    }

    setLogoError(null);
    setUploadingLogo(true);
    try {
      const extension = file.name.split(".").pop();
      const filePath = `${userId}/logo.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + "?t=" + Date.now();

      const { data, error: updateError } = await supabase
        .from("perfiles")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", userId)
        .select()
        .single();

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      setPerfil(data);
    } catch (err) {
      alert("Error al subir el logo. Intentá de nuevo.");
      console.error(err);
    } finally {
      setUploadingLogo(false);
    }
  }

  const color = form.color_principal;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Configuración</h1>

      {/* Perfil */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Perfil del negocio</h2>

        {/* Logo */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Logo del negocio</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-3xl">🏪</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif" className="hidden" onChange={subirLogo} />
              <button
                onClick={() => { setLogoError(null); fileInputRef.current?.click(); }}
                disabled={uploadingLogo}
                className="w-full border border-slate-200 text-slate-600 font-medium rounded-xl py-2.5 text-sm hover:bg-slate-50 disabled:opacity-40 transition-all">
                {uploadingLogo ? "Subiendo..." : logoUrl ? "📷 Cambiar logo" : "📷 Subir logo"}
              </button>
              <p className="text-xs text-slate-400">JPG, PNG o GIF · Máx. 2 MB</p>
              {logoError && <p className="text-xs text-red-500">⚠️ {logoError}</p>}
            </div>
          </div>
        </div>

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

        {/* Valor hora mano de obra */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor por hora de trabajo ({form.moneda})</label>
          <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.valor_hora}
            onChange={e => setForm(f => ({ ...f, valor_hora: e.target.value }))} />
          <p className="text-xs text-slate-400 mt-1">Usado en el Asistente de Costeo · Salario mínimo CR 2025: ₡1,583/hora</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Color de marca</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowColorPicker(true)}
              className="w-12 h-10 rounded-xl border border-slate-200"
              style={{ backgroundColor: form.color_principal }}
              aria-label="Elegir color personalizado" />
            <div className="flex gap-2 flex-wrap">
              {["#2E75B6", "#16a34a", "#dc2626", "#7c3aed", "#ea580c", "#0891b2"].map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color_principal: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color_principal === c ? "border-slate-800 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button
              onClick={() => setShowColorPicker(true)}
              className="text-xs font-medium text-slate-500 underline">
              Personalizado
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 font-mono">{form.color_principal}</p>
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
          <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">Categorías de Gastos/Compras</span>
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

      {/* Ayuda y soporte */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-1">Ayuda y soporte</h2>
        <p className="text-xs text-slate-400 mb-4">¿Tenés una consulta, comentario o sugerencia? Escribinos por WhatsApp.</p>
        <button onClick={() => setShowSupportModal(true)}
          className="w-full border border-slate-200 text-slate-600 font-semibold rounded-xl py-3 text-sm hover:bg-slate-50 transition-colors">
          💬 Contactar soporte
        </button>
      </div>

      {/* Borrar datos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-1">Zona de peligro</h2>
        <p className="text-xs text-slate-400 mb-4">Elimina todos tus registros para arrancar en limpio. Tu perfil y configuración se mantienen.</p>

        {!confirmBorrar ? (
          <button onClick={() => setConfirmBorrar(true)}
            className="w-full border border-red-200 text-red-500 font-semibold rounded-xl py-3 text-sm hover:bg-red-50 transition-colors">
            🗑️ Borrar todos mis datos
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-600 font-medium text-center">¿Estás seguro? Esta acción no se puede deshacer.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmBorrar(false)}
                className="border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={borrarTodosLosDatos} disabled={borrandoDatos}
                className="bg-red-500 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-red-600 disabled:opacity-40">
                {borrandoDatos ? "Borrando..." : "Sí, borrar todo"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cerrar sesión */}
      <button onClick={() => supabase.auth.signOut()}
        className="w-full border border-red-200 text-red-500 font-semibold rounded-xl py-3 text-sm hover:bg-red-50 transition-colors">
        🚪 Cerrar sesión
      </button>

      {showColorPicker && (
        <ColorPickerModal
          initialColor={form.color_principal}
          onClose={() => setShowColorPicker(false)}
          onSelect={(hex) => {
            setForm(f => ({ ...f, color_principal: hex }));
            setShowColorPicker(false);
          }}
        />
      )}

      {showSupportModal && (
        <WhatsAppSupportModal onClose={() => setShowSupportModal(false)} />
      )}
    </div>
  );
}

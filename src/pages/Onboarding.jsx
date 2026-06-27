import { useState } from "react";
import { supabase } from "../lib/supabase";

const CATEGORIAS_SUGERIDAS = {
  productos: ["Materias primas", "Empaque", "Transporte", "Publicidad", "Servicios básicos", "Otros"],
  servicios: ["Herramientas", "Publicidad", "Transporte", "Capacitación", "Servicios básicos", "Otros"],
  mixto: ["Materias primas", "Empaque", "Herramientas", "Publicidad", "Transporte", "Otros"],
  pedidos: ["Materiales", "Empaque", "Transporte", "Publicidad", "Servicios básicos", "Otros"],
};

export default function Onboarding({ userId, onComplete }) {
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    nombre_negocio: "",
    nombre_propietario: "",
    moneda: "CRC",
    tipo_negocio: "",
    maneja_inventario: null,
    categorias: [],
    categoria_nueva: "",
  });

  function set(key, val) { setData(d => ({ ...d, [key]: val })); }

  function toggleCategoria(cat) {
    const arr = data.categorias.includes(cat)
      ? data.categorias.filter(c => c !== cat)
      : [...data.categorias, cat];
    set("categorias", arr);
  }

  function agregarCategoria() {
    if (!data.categoria_nueva.trim()) return;
    if (!data.categorias.includes(data.categoria_nueva.trim())) {
      set("categorias", [...data.categorias, data.categoria_nueva.trim()]);
    }
    set("categoria_nueva", "");
  }

  async function finalizar() {
    setLoading(true);
    // Guardar perfil
    const { data: perfil, error } = await supabase.from("perfiles").insert({
      id: userId,
      nombre_negocio: data.nombre_negocio,
      nombre_propietario: data.nombre_propietario,
      moneda: data.moneda,
      tipo_negocio: data.tipo_negocio,
      color_principal: "#2E75B6",
    }).select().single();

    if (error) { alert("Error guardando perfil: " + error.message); setLoading(false); return; }

    // Guardar categorías
    if (data.categorias.length > 0) {
      await supabase.from("categorias_gastos").insert(
        data.categorias.map(nombre => ({ user_id: userId, nombre }))
      );
    }

    onComplete(perfil);
  }

  const sugeridas = CATEGORIAS_SUGERIDAS[data.tipo_negocio] || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-4xl">📈</span>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">Configuremos tu negocio</h1>
          <p className="text-slate-500 text-sm mt-1">Paso {paso} de 5</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {[1,2,3,4,5].map(n => (
            <div key={n} className={`flex-1 h-1.5 rounded-full transition-colors ${n <= paso ? "bg-blue-600" : "bg-slate-200"}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">

          {/* Paso 1: Info básica */}
          {paso === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800 text-lg">¿Cómo se llama tu negocio?</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre del negocio *</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Detalles con Amor" value={data.nombre_negocio}
                  onChange={e => set("nombre_negocio", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tu nombre *</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: María González" value={data.nombre_propietario}
                  onChange={e => set("nombre_propietario", e.target.value)} />
              </div>
            </div>
          )}

          {/* Paso 2: Moneda */}
          {paso === 2 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800 text-lg">¿Con qué moneda trabajas?</h2>
              <div className="grid grid-cols-2 gap-3">
                {[{ id: "CRC", label: "₡ Colones", sub: "Costa Rica" }, { id: "USD", label: "$ Dólares", sub: "Internacional" }].map(m => (
                  <button key={m.id} onClick={() => set("moneda", m.id)}
                    className={`border-2 rounded-xl p-4 text-left transition-all ${data.moneda === m.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className="font-bold text-slate-800">{m.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{m.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paso 3: Tipo de negocio */}
          {paso === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800 text-lg">¿Qué tipo de negocio es?</h2>
              <div className="space-y-2">
                {[
                  { id: "productos", label: "Vendo productos físicos", icon: "🛍️" },
                  { id: "servicios", label: "Ofrezco servicios", icon: "🤝" },
                  { id: "mixto", label: "Productos y servicios", icon: "⚡" },
                  { id: "pedidos", label: "Trabajo por pedidos/encargos", icon: "📋" },
                ].map(t => (
                  <button key={t.id} onClick={() => set("tipo_negocio", t.id)}
                    className={`w-full flex items-center gap-3 border-2 rounded-xl px-4 py-3 text-left transition-all ${data.tipo_negocio === t.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <span className="text-xl">{t.icon}</span>
                    <span className="font-medium text-slate-700 text-sm">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paso 4: Categorías */}
          {paso === 4 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800 text-lg">Categorías de gastos</h2>
              <p className="text-sm text-slate-500">Selecciona las que apliquen. Puedes editarlas después.</p>
              <div className="flex flex-wrap gap-2">
                {sugeridas.map(cat => (
                  <button key={cat} onClick={() => toggleCategoria(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      data.categorias.includes(cat)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                    }`}>{cat}</button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Agregar categoría..." value={data.categoria_nueva}
                  onChange={e => set("categoria_nueva", e.target.value)}
                  onKeyDown={e => e.key === "Enter" && agregarCategoria()} />
                <button onClick={agregarCategoria}
                  className="bg-blue-600 text-white px-4 rounded-xl text-sm font-medium hover:bg-blue-700">+</button>
              </div>
            </div>
          )}

          {/* Paso 5: Inventario */}
          {paso === 5 && (
            <div className="space-y-4">
              <h2 className="font-bold text-slate-800 text-lg">¿Manejás inventario de materiales?</h2>
              <p className="text-sm text-slate-500">Por ejemplo, materias primas para elaborar tus productos.</p>
              <div className="space-y-3">
                {[
                  { val: true, label: "Sí, manejo materiales e insumos", icon: "📦" },
                  { val: false, label: "No, no necesito inventario", icon: "🚫" },
                ].map(opt => (
                  <button key={String(opt.val)} onClick={() => set("maneja_inventario", opt.val)}
                    className={`w-full flex items-center gap-3 border-2 rounded-xl px-4 py-3 text-left transition-all ${data.maneja_inventario === opt.val ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-medium text-slate-700 text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {paso > 1 && (
              <button onClick={() => setPaso(p => p - 1)}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-3 text-sm hover:bg-slate-50">
                Atrás
              </button>
            )}
            {paso < 5 ? (
              <button
                onClick={() => setPaso(p => p + 1)}
                disabled={
                  (paso === 1 && (!data.nombre_negocio || !data.nombre_propietario)) ||
                  (paso === 3 && !data.tipo_negocio)
                }
                className="flex-1 bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-blue-700 disabled:opacity-40">
                Siguiente
              </button>
            ) : (
              <button onClick={finalizar} disabled={loading || data.maneja_inventario === null}
                className="flex-1 bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-blue-700 disabled:opacity-40">
                {loading ? "Guardando..." : "¡Empezar! 🚀"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

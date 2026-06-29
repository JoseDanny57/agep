import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

const MARGENES = [20, 30, 40, 50];

export default function Costeo({ perfil, userId }) {
  const [materiales, setMateriales] = useState([]);
  const [items, setItems] = useState([]);
  const [horas, setHoras] = useState("");
  const [valorHora, setValorHora] = useState("");
  const [margen, setMargen] = useState(30);
  const [margenCustom, setMargenCustom] = useState("");
  const [nombreProducto, setNombreProducto] = useState("");
  const moneda = perfil?.moneda || "CRC";
  const color = perfil?.color_principal || "#2E75B6";

  useEffect(() => { cargarMateriales(); }, []);

  async function cargarMateriales() {
    const { data } = await supabase.from("materiales")
      .select("id, nombre, costo_unitario, unidad")
      .eq("user_id", userId)
      .order("nombre");
    setMateriales(data || []);
  }

  function agregarMaterial() {
    setItems(prev => [...prev, { material_id: "", nombre_material: "", cantidad: "", costo_unitario: "" }]);
  }

  function actualizarItem(idx, campo, valor) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (campo === "material_id") {
        const mat = materiales.find(m => m.id === valor);
        return mat
          ? { ...item, material_id: mat.id, nombre_material: mat.nombre, costo_unitario: mat.costo_unitario }
          : { ...item, material_id: "", nombre_material: "", costo_unitario: "" };
      }
      return { ...item, [campo]: valor };
    }));
  }

  function quitarItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function resetear() {
    setItems([]);
    setHoras("");
    setValorHora("");
    setMargen(30);
    setMargenCustom("");
    setNombreProducto("");
  }

  const costoMateriales = items.reduce((s, i) => s + (Number(i.cantidad) * Number(i.costo_unitario) || 0), 0);
  const costoManoObra = (Number(horas) || 0) * (Number(valorHora) || 0);
  const costoTotal = costoMateriales + costoManoObra;
  const margenActivo = margenCustom !== "" ? Number(margenCustom) : margen;
  const precioMinimo = costoTotal;
  const precioSugerido = costoTotal > 0 ? costoTotal * (1 + margenActivo / 100) : 0;
  const ganancia = precioSugerido - costoTotal;

  const hayResultados = costoTotal > 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Asistente de Costeo</h1>
        <p className="text-sm text-slate-500 mt-0.5">Calculá el precio justo para tu producto o servicio</p>
      </div>

      {/* Nombre del producto */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">¿Qué estás costeando?</label>
        <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ej: Arreglo de globos para cumpleaños"
          value={nombreProducto}
          onChange={e => setNombreProducto(e.target.value)} />
      </div>

      {/* Paso 1 — Materiales */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-800 text-sm">Paso 1 · Materiales</p>
            <p className="text-xs text-slate-400 mt-0.5">¿Qué insumos necesitás?</p>
          </div>
          <button onClick={agregarMaterial} className="text-xs font-medium px-3 py-1.5 rounded-lg text-white hover:opacity-90" style={{ backgroundColor: color }}>
            + Agregar
          </button>
        </div>

        {items.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-3">Sin materiales — tocá Agregar para empezar</p>
        )}

        {items.map((item, idx) => (
          <div key={idx} className="space-y-2 border border-slate-100 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <select className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={item.material_id}
                onChange={e => actualizarItem(idx, "material_id", e.target.value)}>
                <option value="">Seleccionar material...</option>
                {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                <option value="__manual__">✏️ Ingresar manualmente</option>
              </select>
              <button onClick={() => quitarItem(idx)} className="text-slate-300 hover:text-red-400 text-sm flex-shrink-0">✕</button>
            </div>
            {item.material_id === "__manual__" && (
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del material"
                value={item.nombre_material}
                onChange={e => actualizarItem(idx, "nombre_material", e.target.value)} />
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Cantidad</label>
                <input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  value={item.cantidad}
                  onChange={e => actualizarItem(idx, "cantidad", e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Costo unitario ({moneda})</label>
                <input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  value={item.costo_unitario}
                  onChange={e => actualizarItem(idx, "costo_unitario", e.target.value)} />
              </div>
            </div>
            {item.cantidad && item.costo_unitario && (
              <p className="text-xs text-slate-500 text-right">
                Subtotal: <span className="font-semibold">{fmt(Number(item.cantidad) * Number(item.costo_unitario), moneda)}</span>
              </p>
            )}
          </div>
        ))}

        {costoMateriales > 0 && (
          <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
            <span className="text-slate-500">Total materiales</span>
            <span className="font-bold text-slate-800">{fmt(costoMateriales, moneda)}</span>
          </div>
        )}
      </div>

      {/* Paso 2 — Mano de obra */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div>
          <p className="font-bold text-slate-800 text-sm">Paso 2 · Tu tiempo</p>
          <p className="text-xs text-slate-400 mt-0.5">¿Cuánto vale tu trabajo?</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Horas de trabajo</label>
            <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              value={horas}
              onChange={e => setHoras(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Valor por hora ({moneda})</label>
            <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
              value={valorHora}
              onChange={e => setValorHora(e.target.value)} />
          </div>
        </div>
        {costoManoObra > 0 && (
          <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
            <span className="text-slate-500">Total mano de obra</span>
            <span className="font-bold text-slate-800">{fmt(costoManoObra, moneda)}</span>
          </div>
        )}
      </div>

      {/* Paso 3 — Margen */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div>
          <p className="font-bold text-slate-800 text-sm">Paso 3 · Margen de ganancia</p>
          <p className="text-xs text-slate-400 mt-0.5">AGEP recomienda 30% para emprendimientos pequeños</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {MARGENES.map(m => (
            <button key={m}
              onClick={() => { setMargen(m); setMargenCustom(""); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                margenCustom === "" && margen === m ? "border-current text-white" : "border-slate-200 text-slate-500"
              }`}
              style={margenCustom === "" && margen === m ? { backgroundColor: color, borderColor: color } : {}}>
              {m}%
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input type="number" className="w-16 border border-slate-200 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="otro"
              value={margenCustom}
              onChange={e => setMargenCustom(e.target.value)} />
            <span className="text-sm text-slate-400">%</span>
          </div>
        </div>
      </div>

      {/* Resultado */}
      {hayResultados && (
        <div className="rounded-2xl p-6 text-white shadow-md space-y-4" style={{ backgroundColor: color }}>
          <p className="font-bold text-lg opacity-90">
            {nombreProducto || "Tu producto"}
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-sm opacity-80">
              <span>Costo de materiales</span>
              <span>{fmt(costoMateriales, moneda)}</span>
            </div>
            {costoManoObra > 0 && (
              <div className="flex justify-between text-sm opacity-80">
                <span>Mano de obra</span>
                <span>{fmt(costoManoObra, moneda)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-white/30 pt-2">
              <span>Costo total</span>
              <span>{fmt(costoTotal, moneda)}</span>
            </div>
          </div>

          <div className="bg-white/15 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="opacity-80">Precio mínimo (sin ganancia)</span>
              <span className="font-semibold">{fmt(precioMinimo, moneda)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-lg">Precio sugerido ({margenActivo}%)</span>
              <span className="font-bold text-2xl">{fmt(precioSugerido, moneda)}</span>
            </div>
            <div className="flex justify-between text-sm opacity-80">
              <span>Tu ganancia estimada</span>
              <span className="font-semibold text-green-300">{fmt(ganancia, moneda)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Botón resetear */}
      {(items.length > 0 || horas || valorHora) && (
        <button onClick={resetear}
          className="w-full border border-slate-200 text-slate-500 font-medium rounded-xl py-3 text-sm hover:bg-slate-50">
          🔄 Calcular otro producto
        </button>
      )}
    </div>
  );
}


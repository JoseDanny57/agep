import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

function getMes() {
  const now = new Date();
  return { inicio: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
           fin: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0],
           label: now.toLocaleDateString("es-CR", { month: "long", year: "numeric" }) };
}

// Aclara un color HEX mezclándolo con blanco según `percent` (0 = sin cambio, 1 = blanco puro)
function aclararHex(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * percent);
  const g = Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * percent);
  const b = Math.round((num & 0xff) + (255 - (num & 0xff)) * percent);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function Dashboard({ perfil, userId, setPage }) {
  const [datos, setDatos] = useState({ ingresos: 0, gastosOp: 0, gastosMat: 0, gastosAct: 0, retiro: 0, stockBajo: [], capitalInicial: 0 });
  const [loading, setLoading] = useState(true);
  const mes = getMes();

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const [{ data: ing }, { data: gasOp }, { data: gasMat }, { data: gasAct }, { data: gasRet }, { data: mat }, { data: capital }] = await Promise.all([
      supabase.from("ingresos").select("monto").eq("user_id", userId).gte("fecha", mes.inicio).lte("fecha", mes.fin),
      supabase.from("gastos").select("monto").eq("user_id", userId).eq("tipo", "operativo").gte("fecha", mes.inicio).lte("fecha", mes.fin),
      supabase.from("gastos").select("monto").eq("user_id", userId).eq("tipo", "material").gte("fecha", mes.inicio).lte("fecha", mes.fin),
      supabase.from("gastos").select("monto").eq("user_id", userId).eq("tipo", "activo").gte("fecha", mes.inicio).lte("fecha", mes.fin),
      supabase.from("gastos").select("monto").eq("user_id", userId).eq("tipo", "retiro").gte("fecha", mes.inicio).lte("fecha", mes.fin),
      supabase.from("materiales").select("nombre, stock_actual, stock_minimo").eq("user_id", userId),
      supabase.from("saldos_iniciales").select("monto").eq("user_id", userId),
    ]);

    const totalIng    = (ing    || []).reduce((s, r) => s + Number(r.monto), 0);
    const totalGasOp  = (gasOp  || []).reduce((s, r) => s + Number(r.monto), 0);
    const totalGasMat = (gasMat || []).reduce((s, r) => s + Number(r.monto), 0);
    const totalGasAct = (gasAct || []).reduce((s, r) => s + Number(r.monto), 0);
    const totalRetiro = (gasRet || []).reduce((s, r) => s + Number(r.monto), 0);
    const stockBajo   = (mat    || []).filter(m => Number(m.stock_actual) <= Number(m.stock_minimo));
    const totalCapital = (capital || []).reduce((s, r) => s + Number(r.monto), 0);

    setDatos({ ingresos: totalIng, gastosOp: totalGasOp, gastosMat: totalGasMat, gastosAct: totalGasAct, retiro: totalRetiro, stockBajo, capitalInicial: totalCapital });
    setLoading(false);
  }

  const utilidad = datos.ingresos - datos.gastosOp - datos.retiro;
  const margen = datos.ingresos > 0 ? ((utilidad / datos.ingresos) * 100).toFixed(1) : 0;
  const color = perfil?.color_principal || "#2E75B6";
  const moneda = perfil?.moneda || "CRC";
  const fondoDegradado = `linear-gradient(to bottom, ${aclararHex(color, 0.25)}, ${aclararHex(color, 0.97)})`;

  if (loading) return <div className="text-center py-12 text-slate-400">Calculando...</div>;

  return (
    <div className="-mx-4 -mt-5 px-4 pt-5 pb-6 space-y-4" style={{ backgroundImage: fondoDegradado, minHeight: "100vh" }}>
      {/* Mes */}
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider capitalize">{mes.label}</p>

      {/* Rentabilidad principal */}
      <div className="rounded-2xl p-6 text-white shadow-md" style={{ backgroundColor: color }}>
        <p className="text-sm font-medium opacity-80 mb-1">¿Es rentable tu negocio hoy?</p>
        <div className="flex items-end gap-2">
          <p className="text-4xl font-bold tracking-tight">{fmt(utilidad, moneda)}</p>
          {utilidad >= 0
            ? <span className="text-green-300 font-bold mb-1">✓ SÍ</span>
            : <span className="text-red-300 font-bold mb-1">✗ NO</span>}
        </div>
        <p className="text-sm opacity-70 mt-1">Utilidad neta del mes · Margen: {margen}%</p>
      </div>

      {/* Cards ingresos / gastos operativos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500 text-lg">💰</span>
            <p className="text-xs font-semibold text-slate-500">INGRESOS</p>
          </div>
          <p className="text-xl font-bold text-slate-800">{fmt(datos.ingresos, moneda)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-400 text-lg">💸</span>
            <p className="text-xs font-semibold text-slate-500">GASTOS OPERATIVOS</p>
          </div>
          <p className="text-xl font-bold text-slate-800">{fmt(datos.gastosOp, moneda)}</p>
        </div>
      </div>

      {/* Card capital inicial — informativa, no afecta la utilidad neta del mes */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🏦</span>
            <p className="text-xs font-semibold text-slate-500">CAPITAL INICIAL</p>
          </div>
          <p className="text-lg font-bold text-slate-800 truncate">{fmt(datos.capitalInicial, moneda)}</p>
        </div>
        <button onClick={() => setPage?.("capital")}
          className="text-xs font-semibold rounded-lg px-3 py-2 hover:opacity-90 flex-shrink-0"
          style={{ color, backgroundColor: color + "15" }}>
          Ver más →
        </button>
      </div>

      {/* Card retiro — solo si hay retiro ese mes */}
      {datos.retiro > 0 && (
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-500 text-lg">💵</span>
            <p className="text-xs font-semibold text-green-700">RETIRO DEL PROPIETARIO</p>
          </div>
          <p className="text-xl font-bold text-green-700">{fmt(datos.retiro, moneda)}</p>
          <p className="text-[10px] text-green-400 mt-1">Salario del dueño · Resta a la utilidad del mes</p>
        </div>
      )}

      {/* Card materiales — solo si hay compras ese mes */}
      {datos.gastosMat > 0 && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-lg">📦</span>
            <p className="text-xs font-semibold text-blue-600">INVERSIÓN EN MATERIALES</p>
          </div>
          <p className="text-xl font-bold text-blue-700">{fmt(datos.gastosMat, moneda)}</p>
          <p className="text-[10px] text-blue-400 mt-1">No resta a la utilidad · Es inversión en inventario</p>
        </div>
      )}

      {/* Card activos — solo si hay compras ese mes */}
      {datos.gastosAct > 0 && (
        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-400 text-lg">🔧</span>
            <p className="text-xs font-semibold text-purple-600">COMPRA DE ACTIVOS</p>
          </div>
          <p className="text-xl font-bold text-purple-700">{fmt(datos.gastosAct, moneda)}</p>
          <p className="text-[10px] text-purple-400 mt-1">No resta a la utilidad · Es inversión en equipos</p>
        </div>
      )}

      {/* Margen visual */}
      {datos.ingresos > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold">Margen de ganancia</span>
            <span className="font-bold" style={{ color }}>{margen}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(0, Math.min(100, margen))}%`, backgroundColor: utilidad >= 0 ? color : "#ef4444" }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>
      )}

      {/* Sin registros */}
      {datos.ingresos === 0 && datos.gastosOp === 0 && datos.gastosMat === 0 && datos.gastosAct === 0 && datos.retiro === 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-2xl mb-2">🎯</p>
          <p className="font-semibold text-slate-700 text-sm">¡Empieza a registrar!</p>
          <p className="text-xs text-slate-500 mt-1">Agrega tus primeros ingresos y gastos del mes para ver tu rentabilidad.</p>
        </div>
      )}

      {/* Alertas stock bajo */}
      {datos.stockBajo.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-500">⚠️</span>
            <p className="text-sm font-semibold text-amber-800">Stock bajo</p>
          </div>
          <div className="space-y-1.5">
            {datos.stockBajo.map(m => (
              <div key={m.nombre} className="flex justify-between text-xs">
                <span className="text-amber-700 font-medium">{m.nombre}</span>
                <span className="text-amber-600">{m.stock_actual} / mín {m.stock_minimo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

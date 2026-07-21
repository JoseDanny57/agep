import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "../lib/supabase";
import { calcularSaldoPendiente } from "../utils/saldoPedido";
import { ultimosNMeses, cargarDatosMensuales } from "../utils/estadisticas";
import { totalComprasAnio, estadoLimiteRegimen } from "../utils/limiteRegimenSimplificado";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

function fmtSaldo(saldo, moneda) {
  return saldo < 0 ? `(${fmt(Math.abs(saldo), moneda)})` : fmt(saldo, moneda);
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
  const [datos, setDatos] = useState({ ingresos: 0, gastosOp: 0, gastosMat: 0, gastosAct: 0, retiro: 0, stockBajo: [], capitalInicial: 0, cuentasPorCobrar: 0, saldoFavorTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [limiteRegimen, setLimiteRegimen] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const mes = getMes();

  useEffect(() => { cargar(); cargarHistorico(); }, []);

  useEffect(() => {
    (async () => {
      const totalAnual = await totalComprasAnio(userId);
      setLimiteRegimen({ total: totalAnual, ...estadoLimiteRegimen(totalAnual, perfil?.salario_base_vigente) });
    })();
  }, [userId, perfil?.salario_base_vigente]);

  async function cargarHistorico() {
    const data = await cargarDatosMensuales(userId, ultimosNMeses(6));
    setHistorico(data);
    setLoadingHistorico(false);
  }

  async function cargar() {
    const [{ data: ing }, { data: gasOp }, { data: gasMat }, { data: gasAct }, { data: gasRet }, { data: mat }, { data: capital }, { data: pedidos }] = await Promise.all([
      supabase.from("ingresos").select("monto").eq("user_id", userId).gte("fecha", mes.inicio).lte("fecha", mes.fin),
      supabase.from("gastos").select("monto").eq("user_id", userId).eq("tipo", "operativo").gte("fecha", mes.inicio).lte("fecha", mes.fin),
      supabase.from("gastos").select("monto").eq("user_id", userId).eq("tipo", "material").gte("fecha", mes.inicio).lte("fecha", mes.fin),
      supabase.from("gastos").select("monto").eq("user_id", userId).eq("tipo", "activo").gte("fecha", mes.inicio).lte("fecha", mes.fin),
      supabase.from("gastos").select("monto").eq("user_id", userId).eq("tipo", "retiro").gte("fecha", mes.inicio).lte("fecha", mes.fin),
      supabase.from("materiales").select("nombre, stock_actual, stock_minimo").eq("user_id", userId),
      supabase.from("saldos_iniciales").select("monto").eq("user_id", userId),
      supabase.from("pedidos").select("precio_venta, estado, pedido_pagos(monto)").eq("user_id", userId).neq("estado", "cobrado"),
    ]);

    const totalIng    = (ing    || []).reduce((s, r) => s + Number(r.monto), 0);
    const totalGasOp  = (gasOp  || []).reduce((s, r) => s + Number(r.monto), 0);
    const totalGasMat = (gasMat || []).reduce((s, r) => s + Number(r.monto), 0);
    const totalGasAct = (gasAct || []).reduce((s, r) => s + Number(r.monto), 0);
    const totalRetiro = (gasRet || []).reduce((s, r) => s + Number(r.monto), 0);
    const stockBajo   = (mat    || []).filter(m => Number(m.stock_actual) <= Number(m.stock_minimo));
    const totalCapital = (capital || []).reduce((s, r) => s + Number(r.monto), 0);
    const saldosPedidos = (pedidos || []).map(p => calcularSaldoPendiente(p));
    const totalCuentasPorCobrar = saldosPedidos.reduce((s, saldo) => s + saldo, 0);
    const totalSaldoFavor = saldosPedidos.reduce((s, saldo) => s + (saldo < 0 ? -saldo : 0), 0);

    setDatos({ ingresos: totalIng, gastosOp: totalGasOp, gastosMat: totalGasMat, gastosAct: totalGasAct, retiro: totalRetiro, stockBajo, capitalInicial: totalCapital, cuentasPorCobrar: totalCuentasPorCobrar, saldoFavorTotal: totalSaldoFavor });
    setLoading(false);
  }

  const utilidad = datos.ingresos - datos.gastosOp - datos.retiro;
  const margen = datos.ingresos > 0 ? ((utilidad / datos.ingresos) * 100).toFixed(1) : 0;
  const color = perfil?.color_principal || "#2E75B6";
  const moneda = perfil?.moneda || "CRC";
  const fondoDegradado = `linear-gradient(to bottom, ${aclararHex(color, 0.25)}, ${aclararHex(color, 0.97)})`;

  if (loading) return <div className="text-center py-12 text-slate-400 dark:text-slate-500">Calculando...</div>;

  return (
    <div className="-mx-4 -mt-5 px-4 pt-5 pb-6 space-y-4" style={{ backgroundImage: fondoDegradado, minHeight: "100vh" }}>
      {/* Mes */}
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider capitalize">{mes.label}</p>

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
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500 text-lg">💰</span>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">INGRESOS</p>
          </div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{fmt(datos.ingresos, moneda)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-400 text-lg">💸</span>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">GASTOS OPERATIVOS</p>
          </div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{fmt(datos.gastosOp, moneda)}</p>
        </div>
      </div>

      {/* Card capital inicial — informativa, no afecta la utilidad neta del mes */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🏦</span>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">CAPITAL INICIAL</p>
          </div>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{fmt(datos.capitalInicial, moneda)}</p>
        </div>
        <button onClick={() => setPage?.("capital")}
          className="text-xs font-semibold rounded-lg px-3 py-2 hover:opacity-90 flex-shrink-0"
          style={{ color, backgroundColor: color + "15" }}>
          Ver más →
        </button>
      </div>

      {/* Card cuentas por cobrar — saldo pendiente de pedidos activos */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🧾</span>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">CUENTAS POR COBRAR</p>
          </div>
          {datos.cuentasPorCobrar !== 0 || datos.saldoFavorTotal > 0 ? (
            <>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{fmtSaldo(datos.cuentasPorCobrar, moneda)}</p>
              {datos.saldoFavorTotal > 0 && (
                <p className="text-xs font-semibold text-amber-600 truncate">Saldo a favor: {fmt(datos.saldoFavorTotal, moneda)}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">Sin saldos pendientes</p>
          )}
        </div>
        <button onClick={() => setPage?.("cuentasPorCobrar")}
          className="text-xs font-semibold rounded-lg px-3 py-2 hover:opacity-90 flex-shrink-0"
          style={{ color, backgroundColor: color + "15" }}>
          Ver más →
        </button>
      </div>

      {/* Card estadísticas — mini gráfica de utilidad de los últimos 6 meses */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📈</span>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">UTILIDAD · ÚLTIMOS 6 MESES</p>
        </div>
        {loadingHistorico ? (
          <div className="h-16 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">Cargando...</div>
        ) : (
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historico} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <Line type="monotone" dataKey="utilidad" stroke={color} strokeWidth={2} dot={{ r: 2.5, fill: color, strokeWidth: 0 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <button onClick={() => setPage?.("estadisticas")}
          className="w-full mt-3 text-xs font-semibold rounded-lg px-3 py-2 hover:opacity-90"
          style={{ color, backgroundColor: color + "15" }}>
          Ver estadísticas completas →
        </button>
      </div>

      {/* Card retiro — solo si hay retiro ese mes */}
      {datos.retiro > 0 && (
        <div className="bg-green-50 dark:bg-green-950/40 rounded-2xl p-4 border border-green-100 dark:border-green-800 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-500 text-lg">💵</span>
            <p className="text-xs font-semibold text-green-700 dark:text-green-300">RETIRO DEL PROPIETARIO</p>
          </div>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">{fmt(datos.retiro, moneda)}</p>
          <p className="text-[10px] text-green-400 dark:text-green-500 mt-1">Salario del dueño · Resta a la utilidad del mes</p>
        </div>
      )}

      {/* Card materiales — solo si hay compras ese mes */}
      {datos.gastosMat > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-4 border border-blue-100 dark:border-blue-800 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-400 text-lg">📦</span>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-300">INVERSIÓN EN MATERIALES</p>
          </div>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{fmt(datos.gastosMat, moneda)}</p>
          <p className="text-[10px] text-blue-400 dark:text-blue-500 mt-1">No resta a la utilidad · Es inversión en inventario</p>
        </div>
      )}

      {/* Card activos — solo si hay compras ese mes */}
      {datos.gastosAct > 0 && (
        <div className="bg-purple-50 dark:bg-purple-950/40 rounded-2xl p-4 border border-purple-100 dark:border-purple-800 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-400 text-lg">🔧</span>
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-300">COMPRA DE ACTIVOS</p>
          </div>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{fmt(datos.gastosAct, moneda)}</p>
          <p className="text-[10px] text-purple-400 dark:text-purple-500 mt-1">No resta a la utilidad · Es inversión en equipos</p>
        </div>
      )}

      {/* Sin registros */}
      {datos.ingresos === 0 && datos.gastosOp === 0 && datos.gastosMat === 0 && datos.gastosAct === 0 && datos.retiro === 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 text-center">
          <p className="text-2xl mb-2">🎯</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">¡Empieza a registrar!</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Agrega tus primeros ingresos y gastos del mes para ver tu rentabilidad.</p>
        </div>
      )}

      {/* Alerta límite anual Régimen Simplificado — visible si supera 80% */}
      {limiteRegimen && limiteRegimen.porcentaje > 80 && (
        <button onClick={() => setPage?.("reportes")}
          className={`w-full text-left rounded-2xl p-4 border shadow-sm ${
            limiteRegimen.nivel === "rojo"
              ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
              : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
          }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{limiteRegimen.nivel === "rojo" ? "🚨" : "⚠️"}</span>
            <p className={`text-sm font-semibold ${
              limiteRegimen.nivel === "rojo" ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"
            }`}>Límite anual del Régimen Simplificado</p>
          </div>
          <p className={`text-xs ${limiteRegimen.nivel === "rojo" ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
            Llevás {limiteRegimen.porcentaje.toFixed(1)}% de las compras anuales permitidas (186 salarios base). Ver detalle en Reportes →
          </p>
        </button>
      )}

      {/* Alertas stock bajo */}
      {datos.stockBajo.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-500">⚠️</span>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Stock bajo</p>
          </div>
          <div className="space-y-1.5">
            {datos.stockBajo.map(m => (
              <div key={m.nombre} className="flex justify-between text-xs">
                <span className="text-amber-700 dark:text-amber-300 font-medium">{m.nombre}</span>
                <span className="text-amber-600 dark:text-amber-400">{m.stock_actual} / mín {m.stock_minimo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

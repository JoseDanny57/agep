import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { generarRangoMeses, cargarDatosMensuales } from "../utils/estadisticas";

const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

function fmtCompacto(valor) {
  return new Intl.NumberFormat("es-CR", { notation: "compact", maximumFractionDigits: 1 }).format(valor);
}

function TooltipPersonalizado({ active, payload, label, moneda }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 capitalize mb-0.5">{label}</p>
      <p className="text-slate-600">{fmt(payload[0].value, moneda)}</p>
    </div>
  );
}

function GraficaMensual({ titulo, icono, data, dataKey, color, moneda, permitirNegativos }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icono}</span>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{titulo}</p>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtCompacto} width={48} />
            {permitirNegativos && <ReferenceLine y={0} stroke="#e2e8f0" />}
            <Tooltip content={<TooltipPersonalizado moneda={moneda} />} cursor={{ stroke: "#e2e8f0" }} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Estadisticas({ perfil, userId }) {
  const [modo, setModo] = useState("fiscal");
  const anioActual = new Date().getFullYear();
  const [customMes, setCustomMes] = useState(new Date().getMonth() + 1);
  const [customAnio, setCustomAnio] = useState(anioActual);
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const color = perfil?.color_principal || "#2E75B6";
  const moneda = perfil?.moneda || "CRC";

  useEffect(() => { cargar(); }, [modo, customMes, customAnio]);

  async function cargar() {
    setLoading(true);
    const meses = modo === "fiscal"
      ? generarRangoMeses(anioActual, 1, 12)
      : generarRangoMeses(Number(customAnio), Number(customMes), 12);
    const data = await cargarDatosMensuales(userId, meses);
    setDatos(data);
    setLoading(false);
  }

  const sinDatos = !loading && datos.every(m => m.ingresos === 0 && m.gastos === 0);
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - i);
  const mesesPreview = generarRangoMeses(Number(customAnio), Number(customMes), 12);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Estadísticas</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ingresos, gastos y utilidad mes a mes</p>
      </div>

      {/* Selector de período */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setModo("fiscal")}
            className={`text-sm font-semibold rounded-xl py-2.5 transition-colors ${modo === "fiscal" ? "text-white" : "bg-slate-100 text-slate-500"}`}
            style={modo === "fiscal" ? { backgroundColor: color } : {}}>
            Año fiscal {anioActual}
          </button>
          <button onClick={() => setModo("custom")}
            className={`text-sm font-semibold rounded-xl py-2.5 transition-colors ${modo === "custom" ? "text-white" : "bg-slate-100 text-slate-500"}`}
            style={modo === "custom" ? { backgroundColor: color } : {}}>
            Personalizado
          </button>
        </div>
        {modo === "custom" && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mes de inicio</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customMes} onChange={e => setCustomMes(e.target.value)}>
                {NOMBRES_MES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Año de inicio</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customAnio} onChange={e => setCustomAnio(e.target.value)}>
                {anios.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        )}
        {modo === "custom" && (
          <p className="text-xs text-slate-400">
            Mostrando {NOMBRES_MES[mesesPreview[0].mes - 1]} {mesesPreview[0].anio} a {NOMBRES_MES[mesesPreview[11].mes - 1]} {mesesPreview[11].anio}
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : sinDatos ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold text-slate-600">Aún no hay datos para este período</p>
          <p className="text-sm text-slate-400 mt-1">Registra ingresos y gastos para ver tus estadísticas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <GraficaMensual titulo="Ingresos" icono="💰" data={datos} dataKey="ingresos" color="#16a34a" moneda={moneda} />
          <GraficaMensual titulo="Gastos" icono="💸" data={datos} dataKey="gastos" color="#ef4444" moneda={moneda} />
          <GraficaMensual titulo="Utilidad" icono="📈" data={datos} dataKey="utilidad" color={color} moneda={moneda} permitirNegativos />
        </div>
      )}
    </div>
  );
}

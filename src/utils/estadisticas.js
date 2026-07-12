import { supabase } from "../lib/supabase";

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Genera `cantidad` meses consecutivos empezando en anioInicio/mesInicio (mes 1-12)
export function generarRangoMeses(anioInicio, mesInicio, cantidad = 12) {
  const meses = [];
  for (let i = 0; i < cantidad; i++) {
    const d = new Date(anioInicio, mesInicio - 1 + i, 1);
    meses.push({
      anio: d.getFullYear(),
      mes: d.getMonth() + 1,
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MESES_CORTOS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
    });
  }
  return meses;
}

// Últimos `n` meses terminando en el mes actual
export function ultimosNMeses(n) {
  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  return generarRangoMeses(inicio.getFullYear(), inicio.getMonth() + 1, n);
}

// Trae ingresos y gastos del usuario dentro del rango de meses y los agrupa por mes
export async function cargarDatosMensuales(userId, meses) {
  const primero = meses[0];
  const ultimo = meses[meses.length - 1];
  const inicio = `${primero.anio}-${String(primero.mes).padStart(2, "0")}-01`;
  const fin = new Date(ultimo.anio, ultimo.mes, 0).toISOString().split("T")[0];

  const [{ data: ing }, { data: gas }] = await Promise.all([
    supabase.from("ingresos").select("monto, fecha").eq("user_id", userId).gte("fecha", inicio).lte("fecha", fin),
    supabase.from("gastos").select("monto, fecha").eq("user_id", userId).gte("fecha", inicio).lte("fecha", fin),
  ]);

  const sumarPorMes = (rows) => (rows || []).reduce((acc, r) => {
    const key = r.fecha.slice(0, 7);
    acc[key] = (acc[key] || 0) + Number(r.monto);
    return acc;
  }, {});

  const ingPorMes = sumarPorMes(ing);
  const gasPorMes = sumarPorMes(gas);

  return meses.map(m => {
    const ingresos = ingPorMes[m.key] || 0;
    const gastos = gasPorMes[m.key] || 0;
    return { ...m, ingresos, gastos, utilidad: ingresos - gastos };
  });
}

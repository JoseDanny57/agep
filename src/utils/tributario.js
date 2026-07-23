// src/utils/tributario.js
// AGEP — Centro Tributario: trimestres, fecha límite por defecto y periodos_tributarios

import { supabase } from '../lib/supabase';

export const ROMANOS_TRIMESTRE = ['I', 'II', 'III', 'IV'];

// Dado un Date (o string 'YYYY-MM-DD'), devuelve el trimestre calendario al que pertenece
export function trimestreDeFecha(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha + 'T12:00:00');
  return { anio: d.getFullYear(), trimestre: Math.floor(d.getMonth() / 3) + 1 };
}

// Rango de fechas (inicio/fin, 'YYYY-MM-DD') que cubre un trimestre calendario
export function rangoTrimestre(anio, trimestre) {
  const mesInicio = (trimestre - 1) * 3;
  const inicio = `${anio}-${String(mesInicio + 1).padStart(2, '0')}-01`;
  const fin = new Date(anio, mesInicio + 3, 0).toISOString().split('T')[0];
  return { inicio, fin };
}

// Fecha límite por defecto: día 15 del mes siguiente al cierre del trimestre
export function fechaLimiteDefecto(anio, trimestre) {
  let mes = trimestre * 3 + 1; // mes (1-indexado) siguiente al último mes del trimestre
  let anioLimite = anio;
  if (mes > 12) {
    mes -= 12;
    anioLimite += 1;
  }
  return `${anioLimite}-${String(mes).padStart(2, '0')}-15`;
}

export function etiquetaTrimestre({ anio, trimestre }) {
  return `${ROMANOS_TRIMESTRE[trimestre - 1]} Trimestre ${anio}`;
}

// Formatea una fecha 'YYYY-MM-DD' como DD/MM/AA
function formatearFechaCorta(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio.slice(-2)}`;
}

// Etiqueta del trimestre junto con su rango de fechas, ej: "III Trimestre 2026 (01/07/26 al 30/09/26)"
export function etiquetaTrimestreConRango({ anio, trimestre }) {
  const { inicio, fin } = rangoTrimestre(anio, trimestre);
  return `${etiquetaTrimestre({ anio, trimestre })} (${formatearFechaCorta(inicio)} al ${formatearFechaCorta(fin)})`;
}

// Días restantes hasta la fecha límite (negativo si ya venció)
export function diasRestantes(fechaLimite) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(fechaLimite + 'T00:00:00');
  return Math.round((limite - hoy) / (1000 * 60 * 60 * 24));
}

export function nivelPlazo(dias) {
  if (dias < 7) return 'rojo';
  if (dias <= 15) return 'amarillo';
  return 'verde';
}

// Busca el periodo tributario del usuario para ese anio/trimestre; si no existe, lo crea
// con la fecha límite por defecto.
export async function getOrCreatePeriodo(userId, anio, trimestre) {
  const { data: existente, error: errBusqueda } = await supabase
    .from('periodos_tributarios')
    .select('*')
    .eq('user_id', userId)
    .eq('anio', anio)
    .eq('trimestre', trimestre)
    .maybeSingle();

  if (errBusqueda) throw errBusqueda;
  if (existente) return existente;

  const { data: nuevo, error: errInsert } = await supabase
    .from('periodos_tributarios')
    .insert({
      user_id: userId,
      anio,
      trimestre,
      fecha_limite: fechaLimiteDefecto(anio, trimestre),
      declarado: false,
    })
    .select()
    .single();

  if (errInsert) throw errInsert;
  return nuevo;
}

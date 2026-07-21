// src/utils/limiteRegimenSimplificado.js
// AGEP — Límite anual de compras del Régimen de Tributación Simplificada (Costa Rica)
// El Régimen Simplificado no permite superar 186 salarios base en compras anuales (IVA incluido).

import { supabase } from '../lib/supabase';

export const SALARIOS_BASE_LIMITE_ANUAL = 186;

export function limiteAnualCompras(salarioBaseVigente) {
  return Number(salarioBaseVigente || 0) * SALARIOS_BASE_LIMITE_ANUAL;
}

export async function totalComprasAnio(userId, anio = new Date().getFullYear()) {
  const { data } = await supabase
    .from('gastos')
    .select('monto')
    .eq('user_id', userId)
    .eq('tipo', 'material')
    .gte('fecha', `${anio}-01-01`)
    .lte('fecha', `${anio}-12-31`);
  return (data || []).reduce((acc, g) => acc + Number(g.monto || 0), 0);
}

export function estadoLimiteRegimen(totalCompras, salarioBaseVigente) {
  const limite = limiteAnualCompras(salarioBaseVigente);
  const porcentaje = limite > 0 ? (totalCompras / limite) * 100 : 0;
  const nivel = porcentaje > 90 ? 'rojo' : porcentaje >= 70 ? 'amarillo' : 'verde';
  return { limite, porcentaje, nivel };
}

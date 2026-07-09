// Saldo pendiente = precio_venta - SUM(pedido_pagos.monto)
// Negativo significa saldo a favor del cliente.
export function calcularSaldoPendiente(pedido) {
  const totalPagos = (pedido.pedido_pagos || []).reduce((s, pg) => s + Number(pg.monto), 0);
  return Number(pedido.precio_venta || 0) - totalPagos;
}

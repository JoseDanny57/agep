-- Pedidos: columna estado_anterior para poder revertir el estado del pedido
-- al anular un pago que había dejado el saldo en cero (lo cual disparó el
-- auto-cambio a "cobrado").
-- Ejecutar en el SQL Editor de Supabase antes de probar el Preview.

alter table pedidos
  add column if not exists estado_anterior text;

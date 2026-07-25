-- Pedidos: columna servicio_id para vincular un pedido con el artículo del
-- catálogo (servicios) del que se originó, si corresponde. Sin esta columna
-- no hay forma de saber si un artículo tiene pedidos asociados antes de
-- borrarlo.
-- Ejecutar en el SQL Editor de Supabase antes de probar el Preview.

alter table pedidos
  add column if not exists servicio_id uuid references servicios(id) on delete set null;

create index if not exists pedidos_servicio_id_idx on pedidos(servicio_id);

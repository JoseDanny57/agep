import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { calcularSaldoPendiente } from "../utils/saldoPedido";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

function fmtSaldo(saldo, moneda) {
  return saldo < 0 ? `(${fmt(Math.abs(saldo), moneda)})` : fmt(saldo, moneda);
}

export default function CuentasPorCobrar({ perfil, userId, onSeleccionarPedido }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const moneda = perfil?.moneda || "CRC";
  const color = perfil?.color_principal || "#2E75B6";

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const { data } = await supabase.from("pedidos")
      .select("id, cliente, descripcion, fecha_entrega, precio_venta, estado, pedido_pagos(monto)")
      .eq("user_id", userId)
      .neq("estado", "cobrado");
    setPedidos(data || []);
    setLoading(false);
  }

  const filas = pedidos
    .map(p => ({ ...p, saldo: calcularSaldoPendiente(p) }))
    .filter(p => p.saldo !== 0)
    .sort((a, b) => b.saldo - a.saldo);

  const totalPendiente = filas.reduce((s, p) => s + Math.max(p.saldo, 0), 0);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Cuentas por Cobrar</h1>
        <p className="text-sm text-slate-500 mt-0.5">Total pendiente: <span className="font-semibold" style={{ color }}>{fmt(totalPendiente, moneda)}</span></p>
      </div>

      {filas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🧾</p>
          <p className="font-semibold text-slate-600">Sin saldos pendientes</p>
          <p className="text-sm text-slate-400 mt-1">Los pedidos activos están al día con sus pagos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filas.map((p, idx) => (
            <div key={p.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 ${idx < filas.length - 1 ? "border-b border-slate-50" : ""}`}
              onClick={() => onSeleccionarPedido?.(p.id)}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm truncate">{p.cliente}</p>
                {p.descripcion && <p className="text-xs text-slate-400 truncate">{p.descripcion}</p>}
                {p.fecha_entrega && <p className="text-xs text-slate-400">📅 {new Date(p.fecha_entrega + "T12:00:00").toLocaleDateString("es-CR")}</p>}
              </div>
              <p className={`text-sm font-bold flex-shrink-0 ${p.saldo < 0 ? "text-amber-600" : "text-red-500"}`}>
                {fmtSaldo(p.saldo, moneda)}
              </p>
              <span className="text-slate-300 text-sm">›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { calcularSaldoPendiente } from "../utils/saldoPedido";

function fmt(monto, moneda) {
  if (moneda === "USD") return `$${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

function fmtSaldoFavor(montoAbsoluto, moneda) {
  return `(${fmt(montoAbsoluto, moneda)})`;
}

const ESTADOS = {
  pendiente:   { label: "Pendiente",   color: "bg-amber-100 text-amber-700",   emoji: "🕐" },
  en_proceso:  { label: "En proceso",  color: "bg-blue-100 text-blue-700",     emoji: "⚙️" },
  entregado:   { label: "Entregado",   color: "bg-purple-100 text-purple-700", emoji: "📦" },
  cobrado:     { label: "Cobrado",     color: "bg-green-100 text-green-700",   emoji: "✅" },
};

const METODOS_PAGO = {
  efectivo:      "Efectivo",
  sinpe:         "SINPE",
  transferencia: "Transferencia",
};

function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

export default function Pedidos({ perfil, userId, pedidoInicialId, limpiarPedidoInicial }) {
  const [pedidos, setPedidos] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [pedidoAbierto, setPedidoAbierto] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    cliente: "",
    servicio_id: "",
    descripcion: "",
    fecha_entrega: "",
    precio_venta: "",
  });

  const [itemsMaterial, setItemsMaterial] = useState([]);

  const [showPagoForm, setShowPagoForm] = useState(false);
  const [pagoEditId, setPagoEditId] = useState(null);
  const [pagoForm, setPagoForm] = useState({ monto: "", metodo_pago: "efectivo", fecha: hoyISO(), nota: "" });
  const [savingPago, setSavingPago] = useState(false);

  const [showTraslado, setShowTraslado] = useState(false);
  const [trasladoMonto, setTrasladoMonto] = useState("");
  const [savingTraslado, setSavingTraslado] = useState(false);

  const moneda = perfil?.moneda || "CRC";
  const color = perfil?.color_principal || "#2E75B6";

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (!pedidoInicialId || pedidos.length === 0) return;
    const p = pedidos.find(x => x.id === pedidoInicialId);
    if (p) setPedidoAbierto(p);
    limpiarPedidoInicial?.();
  }, [pedidoInicialId, pedidos]);

  async function cargar() {
    const [{ data: p }, { data: m }, { data: s }] = await Promise.all([
      supabase.from("pedidos")
        .select("*, pedido_materiales(*), pedido_pagos(*)")
        .eq("user_id", userId)
        .order("creado_en", { ascending: false }),
      supabase.from("materiales")
        .select("id, nombre, costo_unitario, unidad")
        .eq("user_id", userId)
        .order("nombre"),
      supabase.from("servicios")
        .select("*, servicio_materiales(*)")
        .eq("user_id", userId)
        .order("nombre"),
    ]);
    setPedidos(p || []);
    setMateriales(m || []);
    setServicios(s || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ cliente: "", servicio_id: "", descripcion: "", fecha_entrega: "", precio_venta: "" });
    setItemsMaterial([]);
    setShowForm(false);
  }

  function elegirServicio(servicioId) {
    const s = servicios.find(sv => sv.id === servicioId);
    if (!s) {
      setForm(f => ({ ...f, servicio_id: "" }));
      return;
    }
    setForm(f => ({
      ...f,
      servicio_id: s.id,
      descripcion: s.descripcion || s.nombre,
      precio_venta: s.precio_venta != null ? String(s.precio_venta) : f.precio_venta,
    }));
    setItemsMaterial((s.servicio_materiales || []).map(m => ({
      material_id: m.material_id || "",
      nombre_material: m.nombre_material,
      cantidad: String(m.cantidad),
      costo_unitario: String(m.costo_unitario),
    })));
  }

  function agregarMaterial() {
    setItemsMaterial(items => [...items, { material_id: "", nombre_material: "", cantidad: "", costo_unitario: "" }]);
  }

  function agregarMaterialesDesdeCatalogo(servicioId) {
    const s = servicios.find(sv => sv.id === servicioId);
    if (!s) return;
    const nuevos = (s.servicio_materiales || []).map(m => ({
      material_id: m.material_id || "",
      nombre_material: m.nombre_material,
      cantidad: String(m.cantidad),
      costo_unitario: String(m.costo_unitario),
    }));
    setItemsMaterial(items => [...items, ...nuevos]);
    setForm(f => ({ ...f, precio_venta: String((Number(f.precio_venta) || 0) + (Number(s.precio_venta) || 0)) }));
  }

  function actualizarMaterial(idx, campo, valor) {
    setItemsMaterial(items => items.map((item, i) => {
      if (i !== idx) return item;
      if (campo === "material_id") {
        if (valor === "__manual__") {
          return { ...item, material_id: "__manual__", nombre_material: "", costo_unitario: "" };
        }
        const mat = materiales.find(m => m.id === valor);
        return mat
          ? { ...item, material_id: mat.id, nombre_material: mat.nombre, costo_unitario: mat.costo_unitario }
          : { ...item, material_id: "", nombre_material: "", costo_unitario: "" };
      }
      return { ...item, [campo]: valor };
    }));
  }

  function quitarMaterial(idx) {
    setItemsMaterial(items => items.filter((_, i) => i !== idx));
  }

  function costoTotal(items) {
    return items.reduce((s, i) => s + (Number(i.cantidad) * Number(i.costo_unitario) || 0), 0);
  }

  async function guardar() {
    if (!form.cliente) return;
    setSaving(true);
    try {
      const { data: pedido, error } = await supabase.from("pedidos").insert({
        user_id: userId,
        cliente: form.cliente,
        descripcion: form.descripcion,
        fecha_entrega: form.fecha_entrega || null,
        precio_venta: Number(form.precio_venta) || null,
        estado: "pendiente",
      }).select().single();

      if (error) throw error;

      if (itemsMaterial.length > 0) {
        const filas = itemsMaterial
          .filter(i => i.nombre_material && i.cantidad)
          .map(i => ({
            pedido_id: pedido.id,
            material_id: i.material_id || null,
            nombre_material: i.nombre_material,
            cantidad: Number(i.cantidad),
            costo_unitario: Number(i.costo_unitario) || 0,
          }));
        if (filas.length > 0) await supabase.from("pedido_materiales").insert(filas);
      }

      resetForm();
      cargar();
    } catch (err) {
      alert("Error al guardar el pedido.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function cambiarEstado(id, estado) {
    await supabase.from("pedidos").update({ estado }).eq("id", id);
    cargar();
    if (pedidoAbierto?.id === id) setPedidoAbierto(p => ({ ...p, estado }));
  }

  async function eliminar(id) {
    const { data: pagos, error: errPagos } = await supabase
      .from("pedido_pagos")
      .select("id")
      .eq("pedido_id", id)
      .limit(1);
    if (errPagos) {
      alert("Error al verificar los pagos del pedido.");
      console.error(errPagos);
      return;
    }
    if (pagos && pagos.length > 0) {
      alert("No se puede eliminar este pedido porque tiene pagos registrados. Para eliminarlo, primero debes anular los pagos asociados.");
      return;
    }
    if (!confirm("¿Eliminar este pedido?")) return;
    await supabase.from("pedidos").delete().eq("id", id);
    setPedidoAbierto(null);
    cargar();
  }

  async function refrescarPedido(id) {
    const { data } = await supabase.from("pedidos")
      .select("*, pedido_materiales(*), pedido_pagos(*)")
      .eq("id", id)
      .single();
    if (data) {
      setPedidoAbierto(data);
      setPedidos(list => list.map(p => p.id === id ? data : p));
    }
  }

  async function verificarAutoCobrado(id) {
    const { data } = await supabase.from("pedidos")
      .select("precio_venta, estado, pedido_pagos(monto)")
      .eq("id", id)
      .single();
    if (!data || data.estado === "cobrado") return;
    const saldo = Math.round(calcularSaldoPendiente(data) * 100) / 100;
    if (saldo === 0) {
      await supabase.from("pedidos").update({ estado: "cobrado", estado_anterior: data.estado }).eq("id", id);
    }
  }

  function abrirNuevoPago() {
    setPagoEditId(null);
    setPagoForm({ monto: "", metodo_pago: "efectivo", fecha: hoyISO(), nota: "" });
    setShowPagoForm(true);
  }

  function abrirEditarPago(pago) {
    setPagoEditId(pago.id);
    setPagoForm({ monto: String(pago.monto), metodo_pago: pago.metodo_pago, fecha: pago.fecha, nota: pago.nota || "" });
    setShowPagoForm(true);
  }

  function cerrarPagoForm() {
    setShowPagoForm(false);
    setPagoEditId(null);
  }

  async function guardarPago() {
    if (!pagoForm.monto || Number(pagoForm.monto) <= 0) return;
    setSavingPago(true);
    try {
      const descripcionIngreso = `Pago pedido — ${pedidoAbierto.cliente} (${pagoForm.metodo_pago})`;

      if (pagoEditId) {
        const { error } = await supabase.from("pedido_pagos").update({
          monto: Number(pagoForm.monto),
          metodo_pago: pagoForm.metodo_pago,
          fecha: pagoForm.fecha,
          nota: pagoForm.nota || null,
        }).eq("id", pagoEditId);
        if (error) throw error;

        const { error: errIngreso } = await supabase.from("ingresos").update({
          monto: Number(pagoForm.monto),
          descripcion: descripcionIngreso,
          fecha: pagoForm.fecha,
        }).eq("pedido_pago_id", pagoEditId);
        if (errIngreso) throw errIngreso;
      } else {
        const { data: nuevoPago, error } = await supabase.from("pedido_pagos").insert({
          pedido_id: pedidoAbierto.id,
          monto: Number(pagoForm.monto),
          metodo_pago: pagoForm.metodo_pago,
          fecha: pagoForm.fecha,
          nota: pagoForm.nota || null,
        }).select().single();
        if (error) throw error;

        const { error: errIngreso } = await supabase.from("ingresos").insert({
          user_id: userId,
          monto: Number(pagoForm.monto),
          descripcion: descripcionIngreso,
          fecha: pagoForm.fecha,
          pedido_pago_id: nuevoPago.id,
          origen: "pedido",
        });
        if (errIngreso) throw errIngreso;
      }
      cerrarPagoForm();
      await verificarAutoCobrado(pedidoAbierto.id);
      await refrescarPedido(pedidoAbierto.id);
    } catch (err) {
      alert("Error al guardar el pago.");
      console.error(err);
    } finally {
      setSavingPago(false);
    }
  }

  async function eliminarPago(id) {
    if (!confirm("¿Eliminar este pago?")) return;
    const estabaCobrado = pedidoAbierto.estado === "cobrado";
    await supabase.from("pedido_pagos").delete().eq("id", id);
    if (estabaCobrado) {
      const { data } = await supabase.from("pedidos")
        .select("precio_venta, estado, estado_anterior, pedido_pagos(monto)")
        .eq("id", pedidoAbierto.id)
        .single();
      if (data) {
        const saldo = Math.round(calcularSaldoPendiente(data) * 100) / 100;
        if (saldo !== 0) {
          const estadoRevertido = data.estado_anterior || "entregado";
          await supabase.from("pedidos").update({ estado: estadoRevertido, estado_anterior: null }).eq("id", pedidoAbierto.id);
        }
      }
    }
    await refrescarPedido(pedidoAbierto.id);
  }

  function abrirTraslado(saldoFavor) {
    setTrasladoMonto(saldoFavor.toFixed(2));
    setShowTraslado(true);
  }

  async function confirmarTraslado(saldoFavorDisponible) {
    const monto = Number(trasladoMonto);
    if (!monto || monto <= 0 || monto > saldoFavorDisponible + 0.0001) {
      alert("El monto debe ser mayor a 0 y no exceder el saldo a favor disponible.");
      return;
    }
    setSavingTraslado(true);
    try {
      const hoy = hoyISO();
      const hoyFmt = new Date(hoy + "T12:00:00").toLocaleDateString("es-CR");

      // El monto ya se contabilizó en Ingresos cuando se registró el pago
      // original que generó el sobrepago — acá solo se cierra el saldo del
      // pedido, sin volver a tocar Ingresos.
      const { error: errPago } = await supabase.from("pedido_pagos").insert({
        pedido_id: pedidoAbierto.id,
        monto: -monto,
        metodo_pago: "ajuste_ingreso",
        fecha: hoy,
        nota: `Saldo a favor cerrado el ${hoyFmt}`,
      });
      if (errPago) throw errPago;

      setShowTraslado(false);
      await verificarAutoCobrado(pedidoAbierto.id);
      await refrescarPedido(pedidoAbierto.id);
    } catch (err) {
      alert("Error al cerrar el saldo a favor.");
      console.error(err);
    } finally {
      setSavingTraslado(false);
    }
  }

  const costo = costoTotal(itemsMaterial);
  const gananciaEstimada = Number(form.precio_venta) - costo;

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando...</div>;

  // Vista detalle de pedido
  if (pedidoAbierto) {
    const p = pedidoAbierto;
    const costoP = (p.pedido_materiales || []).reduce((s, m) => s + (Number(m.cantidad) * Number(m.costo_unitario)), 0);
    const ganancia = (p.precio_venta || 0) - costoP;
    const est = ESTADOS[p.estado] || ESTADOS.pendiente;

    const pagos = [...(p.pedido_pagos || [])].sort((a, b) =>
      new Date(b.fecha) - new Date(a.fecha) || new Date(b.creado_en) - new Date(a.creado_en));
    const totalPagadoCliente = pagos.filter(pg => pg.metodo_pago !== "ajuste_ingreso").reduce((s, pg) => s + Number(pg.monto), 0);
    const saldoPendiente = calcularSaldoPendiente(p);
    const saldoFavor = saldoPendiente < 0 ? Math.abs(saldoPendiente) : 0;

    return (
      <div className="space-y-4">
        {/* Modal registrar/editar pago */}
        {showPagoForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={cerrarPagoForm} />
            <div className="relative bg-white dark:bg-slate-800 w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{pagoEditId ? "Editar pago" : "Registrar pago"}</h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Monto ({moneda}) *</label>
                <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                  placeholder="0" value={pagoForm.monto}
                  onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Método de pago</label>
                <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500 bg-white"
                  value={pagoForm.metodo_pago}
                  onChange={e => setPagoForm(f => ({ ...f, metodo_pago: e.target.value }))}>
                  {Object.entries(METODOS_PAGO).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                  value={pagoForm.fecha} onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nota (opcional)</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                  placeholder="Ej: Abono inicial"
                  value={pagoForm.nota} onChange={e => setPagoForm(f => ({ ...f, nota: e.target.value }))} />
              </div>

              <div className="flex gap-3">
                <button onClick={cerrarPagoForm}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={guardarPago} disabled={savingPago || !pagoForm.monto || Number(pagoForm.monto) <= 0}
                  className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: color }}>
                  {savingPago ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal trasladar saldo a Ingresos */}
        {showTraslado && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowTraslado(false)} />
            <div className="relative bg-white dark:bg-slate-800 w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Cerrar saldo a favor</h3>
              <p className="text-sm text-slate-500">
                Saldo a favor disponible: <span className="font-bold text-amber-600">{fmtSaldoFavor(saldoFavor, moneda)}</span>
              </p>
              <p className="text-xs text-slate-400">
                Este dinero ya se registró en Ingresos cuando se recibió el pago. Esta acción solo cierra el saldo dentro de este pedido.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Monto a trasladar ({moneda})</label>
                <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                  value={trasladoMonto} max={saldoFavor} min={0}
                  onChange={e => setTrasladoMonto(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowTraslado(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={() => confirmarTraslado(saldoFavor)}
                  disabled={savingTraslado || !trasladoMonto || Number(trasladoMonto) <= 0 || Number(trasladoMonto) > saldoFavor + 0.0001}
                  className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: color }}>
                  {savingTraslado ? "Cerrando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={() => setPedidoAbierto(null)} className="text-slate-400 hover:text-slate-600 text-xl">←</button>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex-1">{p.cliente}</h1>
          <button onClick={() => eliminar(p.id)} className="text-slate-300 hover:text-red-400 text-sm">🗑️</button>
        </div>

        {/* Estado */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3">ESTADO DEL PEDIDO</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ESTADOS).map(([key, cfg]) => (
              <button key={key} onClick={() => cambiarEstado(p.id, key)}
                className={`py-2 rounded-xl text-xs font-medium border-2 transition-all ${p.estado === key ? "border-current " + cfg.color : "border-slate-200 text-slate-400"}`}>
                {cfg.emoji} {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 space-y-2">
          {p.descripcion && <p className="text-sm text-slate-600">{p.descripcion}</p>}
          {p.fecha_entrega && (
            <p className="text-xs text-slate-400">📅 Entrega: {new Date(p.fecha_entrega + "T12:00:00").toLocaleDateString("es-CR")}</p>
          )}
        </div>

        {/* Financiero */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500">RESUMEN FINANCIERO</p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Precio de venta</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{p.precio_venta ? fmt(p.precio_venta, moneda) : "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Costo de materiales</span>
            <span className="font-bold text-red-500">{fmt(costoP, moneda)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between text-sm">
            <span className="font-semibold text-slate-700">Ganancia estimada</span>
            <span className={`font-bold text-lg ${ganancia >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(ganancia, moneda)}</span>
          </div>
        </div>

        {/* Cuentas por cobrar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500">CUENTAS POR COBRAR</p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total pagado por el cliente</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{fmt(totalPagadoCliente, moneda)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between text-sm items-center">
            {saldoPendiente > 0 && (
              <>
                <span className="font-semibold text-slate-700">Saldo pendiente</span>
                <span className="font-bold text-lg text-red-500">{fmt(saldoPendiente, moneda)}</span>
              </>
            )}
            {saldoPendiente < 0 && (
              <>
                <span className="font-semibold text-slate-700">Saldo a favor del cliente</span>
                <span className="font-bold text-lg text-amber-600">{fmtSaldoFavor(saldoFavor, moneda)}</span>
              </>
            )}
            {saldoPendiente === 0 && (
              <>
                <span className="font-semibold text-slate-700">Estado de pago</span>
                <span className="font-bold text-lg text-green-600">Pagado completo</span>
              </>
            )}
          </div>
          {saldoPendiente < 0 && (
            <button onClick={() => abrirTraslado(saldoFavor)}
              className="w-full border-2 border-amber-500 text-amber-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-amber-50">
              Cerrar saldo a favor del pedido
            </button>
          )}
        </div>

        {/* Pagos */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-slate-500">PAGOS</p>
            <button onClick={abrirNuevoPago} className="text-xs font-medium hover:opacity-80" style={{ color }}>+ Registrar pago</button>
          </div>
          {pagos.length === 0 ? (
            <p className="text-sm text-slate-400 px-4 pb-4">Sin pagos registrados.</p>
          ) : (
            pagos.map((pg, idx) => {
              const esAjuste = pg.metodo_pago === "ajuste_ingreso";
              return (
                <div key={pg.id} className={`flex items-center justify-between px-4 py-3 ${idx < pagos.length - 1 ? "border-b border-slate-50" : ""}`}>
                  <div className={esAjuste ? "italic text-slate-400" : ""}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{new Date(pg.fecha + "T12:00:00").toLocaleDateString("es-CR")}</p>
                      {esAjuste ? (
                        <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[10px] not-italic">Ajuste de saldo a favor</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[10px]">{METODOS_PAGO[pg.metodo_pago] || pg.metodo_pago}</span>
                      )}
                    </div>
                    {pg.nota && <p className="text-xs text-slate-400 mt-0.5">{pg.nota}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className={`text-sm font-bold whitespace-nowrap ${esAjuste ? "italic text-slate-400" : Number(pg.monto) < 0 ? "text-red-500" : "text-green-600"}`}>
                      {fmt(pg.monto, moneda)}
                    </p>
                    {!esAjuste && (
                      <>
                        <button onClick={() => abrirEditarPago(pg)} className="text-slate-300 hover:text-blue-400 text-xs">✏️</button>
                        <button onClick={() => eliminarPago(pg.id)} className="text-slate-300 hover:text-red-400 text-xs">✕</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Materiales */}
        {(p.pedido_materiales || []).length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 px-4 pt-4 pb-2">MATERIALES</p>
            {p.pedido_materiales.map((m, idx) => (
              <div key={m.id} className={`flex items-center justify-between px-4 py-3 ${idx < p.pedido_materiales.length - 1 ? "border-b border-slate-50" : ""}`}>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.nombre_material}</p>
                  <p className="text-xs text-slate-400">{m.cantidad} × {fmt(m.costo_unitario, moneda)}</p>
                </div>
                <p className="text-sm font-bold text-slate-700">{fmt(m.cantidad * m.costo_unitario, moneda)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pedidos</h1>
          <p className="text-sm text-slate-500 mt-0.5">{pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="text-white font-bold rounded-xl px-4 py-2.5 text-sm shadow-sm hover:opacity-90"
          style={{ backgroundColor: color }}>
          + Nuevo
        </button>
      </div>

      {/* Formulario nuevo pedido */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Nuevo pedido</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cliente *</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
              placeholder="Nombre del cliente"
              value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} />
          </div>

          {servicios.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Artículo del catálogo (opcional)</label>
              <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500 bg-white"
                value={form.servicio_id}
                onChange={e => elegirServicio(e.target.value)}>
                <option value="">Seleccionar artículo...</option>
                {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Autocompleta descripción, precio y materiales</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripción (opcional)</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
              placeholder="Ej: Arreglo de globos azul y blanco"
              value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Precio de venta ({moneda})</label>
              <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                placeholder="0"
                value={form.precio_venta} onChange={e => setForm(f => ({ ...f, precio_venta: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha de entrega</label>
              <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                value={form.fecha_entrega} onChange={e => setForm(f => ({ ...f, fecha_entrega: e.target.value }))} />
            </div>
          </div>

          {/* Materiales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Materiales (opcional)</label>
              <div className="flex items-center gap-3">
                {servicios.length > 0 && (
                  <select className="text-xs font-medium bg-transparent border-none focus:outline-none cursor-pointer hover:opacity-80"
                    style={{ color }}
                    value=""
                    onChange={e => agregarMaterialesDesdeCatalogo(e.target.value)}>
                    <option value="">+ Agregar desde catálogo</option>
                    {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                )}
                <button onClick={agregarMaterial} className="text-xs font-medium hover:opacity-80" style={{ color }}>+ Agregar</button>
              </div>
            </div>

            {itemsMaterial.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-start">
                <div className="flex-1 space-y-2">
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500 bg-white"
                    value={item.material_id}
                    onChange={e => actualizarMaterial(idx, "material_id", e.target.value)}>
                    <option value="">Seleccionar material...</option>
                    {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    <option value="__manual__">✏️ Ingresar manualmente</option>
                  </select>
                  {item.material_id === "__manual__" && (
                    <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                      placeholder="Nombre del material"
                      value={item.nombre_material}
                      onChange={e => actualizarMaterial(idx, "nombre_material", e.target.value)} />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                      placeholder="Cantidad"
                      value={item.cantidad}
                      onChange={e => actualizarMaterial(idx, "cantidad", e.target.value)} />
                    <input type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                      placeholder="Costo unit."
                      value={item.costo_unitario}
                      onChange={e => actualizarMaterial(idx, "costo_unitario", e.target.value)} />
                  </div>
                </div>
                <button onClick={() => quitarMaterial(idx)} className="text-slate-300 hover:text-red-400 mt-2">✕</button>
              </div>
            ))}
          </div>

          {/* Resumen financiero en tiempo real */}
          {(form.precio_venta || itemsMaterial.length > 0) && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-1">
              {costo > 0 && <div className="flex justify-between text-xs text-slate-500"><span>Costo materiales</span><span className="font-medium">{fmt(costo, moneda)}</span></div>}
              {form.precio_venta && <div className="flex justify-between text-xs text-slate-500"><span>Precio de venta</span><span className="font-medium">{fmt(Number(form.precio_venta), moneda)}</span></div>}
              {form.precio_venta && costo > 0 && (
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1 mt-1">
                  <span>Ganancia estimada</span>
                  <span className={gananciaEstimada >= 0 ? "text-green-600" : "text-red-500"}>{fmt(gananciaEstimada, moneda)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={resetForm}
              className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={guardar} disabled={saving || !form.cliente}
              className="flex-1 text-white font-semibold rounded-xl py-2.5 text-sm hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: color }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de pedidos */}
      {pedidos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-slate-600">Sin pedidos registrados</p>
          <p className="text-sm text-slate-400 mt-1">Creá tu primer pedido.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {pedidos.map((p, idx) => {
            const costoP = (p.pedido_materiales || []).reduce((s, m) => s + (Number(m.cantidad) * Number(m.costo_unitario)), 0);
            const ganancia = (p.precio_venta || 0) - costoP;
            const est = ESTADOS[p.estado] || ESTADOS.pendiente;
            return (
              <div key={p.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 ${idx < pedidos.length - 1 ? "border-b border-slate-50" : ""}`}
                onClick={() => setPedidoAbierto(p)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">{p.cliente}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${est.color}`}>{est.emoji} {est.label}</span>
                  </div>
                  {p.descripcion && <p className="text-xs text-slate-400 truncate">{p.descripcion}</p>}
                  {p.fecha_entrega && <p className="text-xs text-slate-400">📅 {new Date(p.fecha_entrega + "T12:00:00").toLocaleDateString("es-CR")}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {p.precio_venta && <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmt(p.precio_venta, moneda)}</p>}
                  {p.precio_venta && costoP > 0 && (
                    <p className={`text-xs font-medium ${ganancia >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {ganancia >= 0 ? "+" : ""}{fmt(ganancia, moneda)}
                    </p>
                  )}
                </div>
                <span className="text-slate-300 text-sm">›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


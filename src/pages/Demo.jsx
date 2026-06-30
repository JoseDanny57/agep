import { useState } from "react";

const color = "#7c3aed";

function fmt(monto) {
  return `₡${Number(monto).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

const hoy = new Date();
const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

const INGRESOS = [
  { id: 1, descripcion: "Decoración cumpleaños - Sofía", monto: 45000, fecha: `${mes}-03` },
  { id: 2, descripcion: "Arreglo de globos - Boda Pérez", monto: 80000, fecha: `${mes}-08` },
  { id: 3, descripcion: "Centro de mesa x10 - Evento corporativo", monto: 60000, fecha: `${mes}-15` },
  { id: 4, descripcion: "Decoración baby shower", monto: 35000, fecha: `${mes}-20` },
];

const GASTOS = [
  { id: 1, descripcion: "Pago de electricidad", monto: 18000, tipo: "operativo", fecha: `${mes}-05` },
  { id: 2, descripcion: "Internet del local", monto: 15000, tipo: "operativo", fecha: `${mes}-05` },
  { id: 3, descripcion: "Globos de látex surtidos", monto: 12000, tipo: "material", fecha: `${mes}-02` },
  { id: 4, descripcion: "Cintas y listones", monto: 6000, tipo: "material", fecha: `${mes}-10` },
  { id: 5, descripcion: "Compresor de aire para globos", monto: 45000, tipo: "activo", fecha: `${mes}-01` },
  { id: 6, descripcion: "Retiro semanal", monto: 80000, tipo: "retiro", fecha: `${mes}-15` },
];

const MATERIALES = [
  { id: 1, nombre: "Globos de látex", unidad: "unidades", costo_unitario: 25, stock_actual: 180, stock_minimo: 100 },
  { id: 2, nombre: "Cinta satinada", unidad: "metros", costo_unitario: 150, stock_actual: 8, stock_minimo: 20 },
  { id: 3, nombre: "Helio (tanque)", unidad: "unidades", costo_unitario: 18000, stock_actual: 1, stock_minimo: 1 },
  { id: 4, nombre: "Flores artificiales", unidad: "unidades", costo_unitario: 800, stock_actual: 45, stock_minimo: 15 },
];

const PEDIDOS = [
  { id: 1, cliente: "Sofía Jiménez", descripcion: "Decoración cumpleaños temática unicornio", fecha_entrega: `${mes}-28`, precio_venta: 65000, estado: "en_proceso", materiales: [{ nombre: "Globos de látex", cantidad: 50, costo: 25 }, { nombre: "Cinta satinada", cantidad: 10, costo: 150 }] },
  { id: 2, cliente: "Carlos Pérez", descripcion: "Arreglo floral para boda", fecha_entrega: `${mes}-30`, precio_venta: 120000, estado: "pendiente", materiales: [{ nombre: "Flores artificiales", cantidad: 30, costo: 800 }] },
  { id: 3, cliente: "Ana Vargas", descripcion: "Centro de mesa evento corporativo", fecha_entrega: `${mes}-12`, precio_venta: 60000, estado: "cobrado", materiales: [{ nombre: "Flores artificiales", cantidad: 15, costo: 800 }] },
];

const ESTADOS = {
  pendiente:  { label: "Pendiente",  color: "bg-amber-100 text-amber-700",   emoji: "🕐" },
  en_proceso: { label: "En proceso", color: "bg-blue-100 text-blue-700",     emoji: "⚙️" },
  entregado:  { label: "Entregado",  color: "bg-purple-100 text-purple-700", emoji: "📦" },
  cobrado:    { label: "Cobrado",    color: "bg-green-100 text-green-700",   emoji: "✅" },
};

const TIPO_CFG = {
  operativo: { emoji: "💼", label: "Operativo", bg: "#fef2f2" },
  material:  { emoji: "📦", label: "Material",  bg: "#fef3c7" },
  activo:    { emoji: "🔧", label: "Activo",    bg: "#f5f3ff" },
  retiro:    { emoji: "💵", label: "Retiro",    bg: "#f0fdf4" },
};

const navItems = [
  { id: "dashboard",  label: "Dashboard",  icon: "📊" },
  { id: "ingresos",   label: "Ingresos",   icon: "💰" },
  { id: "gastos",     label: "Gastos",     icon: "💸" },
  { id: "pedidos",    label: "Pedidos",    icon: "📋" },
  { id: "inventario", label: "Inventario", icon: "📦" },
];

const BANNER = (onExit) => (
  <div className="bg-amber-400 text-amber-900 text-xs font-semibold py-2 px-4 flex items-center justify-between">
    <span>👀 Modo demo — datos ficticios de "Fiestas Mágicas CR"</span>
    <button onClick={onExit} className="bg-amber-900 text-amber-100 rounded-lg px-3 py-1 text-xs font-bold hover:bg-amber-800">Crear cuenta</button>
  </div>
);

function DashboardDemo() {
  const totalIng = INGRESOS.reduce((s, r) => s + r.monto, 0);
  const totalOp  = GASTOS.filter(g => g.tipo === "operativo").reduce((s, r) => s + r.monto, 0);
  const totalMat = GASTOS.filter(g => g.tipo === "material").reduce((s, r) => s + r.monto, 0);
  const totalAct = GASTOS.filter(g => g.tipo === "activo").reduce((s, r) => s + r.monto, 0);
  const totalRet = GASTOS.filter(g => g.tipo === "retiro").reduce((s, r) => s + r.monto, 0);
  const utilidad = totalIng - totalOp - totalRet;
  const margen = ((utilidad / totalIng) * 100).toFixed(1);
  const stockBajo = MATERIALES.filter(m => m.stock_actual <= m.stock_minimo);
  const label = hoy.toLocaleDateString("es-CR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider capitalize">{label}</p>
      <div className="rounded-2xl p-6 text-white shadow-md" style={{ backgroundColor: color }}>
        <p className="text-sm font-medium opacity-80 mb-1">¿Es rentable tu negocio hoy?</p>
        <div className="flex items-end gap-2">
          <p className="text-4xl font-bold tracking-tight">{fmt(utilidad)}</p>
          <span className="text-green-300 font-bold mb-1">✓ SÍ</span>
        </div>
        <p className="text-sm opacity-70 mt-1">Utilidad neta del mes · Margen: {margen}%</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><span className="text-green-500 text-lg">💰</span><p className="text-xs font-semibold text-slate-500">INGRESOS</p></div>
          <p className="text-xl font-bold text-slate-800">{fmt(totalIng)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><span className="text-red-400 text-lg">💸</span><p className="text-xs font-semibold text-slate-500">GASTOS OPERATIVOS</p></div>
          <p className="text-xl font-bold text-slate-800">{fmt(totalOp)}</p>
        </div>
      </div>
      <div className="bg-green-50 rounded-2xl p-4 border border-green-100 shadow-sm">
        <div className="flex items-center gap-2 mb-1"><span className="text-green-500 text-lg">💵</span><p className="text-xs font-semibold text-green-700">RETIRO DEL PROPIETARIO</p></div>
        <p className="text-xl font-bold text-green-700">{fmt(totalRet)}</p>
        <p className="text-[10px] text-green-400 mt-1">Salario del dueño · Resta a la utilidad del mes</p>
      </div>
      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
        <div className="flex items-center gap-2 mb-1"><span className="text-blue-400 text-lg">📦</span><p className="text-xs font-semibold text-blue-600">INVERSIÓN EN MATERIALES</p></div>
        <p className="text-xl font-bold text-blue-700">{fmt(totalMat)}</p>
        <p className="text-[10px] text-blue-400 mt-1">No resta a la utilidad · Es inversión en inventario</p>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold">Margen de ganancia</span>
          <span className="font-bold" style={{ color }}>{margen}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, margen)}%`, backgroundColor: color }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>0%</span><span>50%</span><span>100%</span></div>
      </div>
      {stockBajo.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><span className="text-amber-500">⚠️</span><p className="text-sm font-semibold text-amber-800">Stock bajo</p></div>
          {stockBajo.map(m => (
            <div key={m.id} className="flex justify-between text-xs">
              <span className="text-amber-700 font-medium">{m.nombre}</span>
              <span className="text-amber-600">{m.stock_actual} / mín {m.stock_minimo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IngresosDemo({ onExit }) {
  const total = INGRESOS.reduce((s, r) => s + r.monto, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-slate-800">Ingresos</h1><p className="text-sm text-slate-500">Total: <span className="font-semibold text-green-600">{fmt(total)}</span></p></div>
        <button disabled className="text-white font-bold rounded-xl px-4 py-2.5 text-sm opacity-40 cursor-not-allowed" style={{ backgroundColor: color }}>+ Agregar</button>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center text-xs text-amber-700 font-medium">
        👀 Modo demo · <button onClick={onExit} className="underline font-bold">Registrate</button> para agregar tus propios ingresos
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {INGRESOS.map((item, idx) => (
          <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx < INGRESOS.length - 1 ? "border-b border-slate-50" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">💰</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 text-sm truncate">{item.descripcion}</p>
              <p className="text-xs text-slate-400">{new Date(item.fecha + "T12:00:00").toLocaleDateString("es-CR")}</p>
            </div>
            <p className="font-bold text-green-600 text-sm">{fmt(item.monto)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GastosDemo({ onExit }) {
  const total = GASTOS.reduce((s, r) => s + r.monto, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-slate-800">Gastos</h1><p className="text-sm text-slate-500">Total: <span className="font-semibold text-red-500">{fmt(total)}</span></p></div>
        <button disabled className="text-white font-bold rounded-xl px-4 py-2.5 text-sm opacity-40 cursor-not-allowed" style={{ backgroundColor: color }}>+ Agregar</button>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center text-xs text-amber-700 font-medium">
        👀 Modo demo · <button onClick={onExit} className="underline font-bold">Registrate</button> para registrar tus gastos
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {GASTOS.map((item, idx) => {
          const cfg = TIPO_CFG[item.tipo];
          return (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${idx < GASTOS.length - 1 ? "border-b border-slate-50" : ""}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: cfg.bg }}>{cfg.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm truncate">{item.descripcion}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  {new Date(item.fecha + "T12:00:00").toLocaleDateString("es-CR")}
                  <span className="bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[10px]">{cfg.label}</span>
                </p>
              </div>
              <p className="font-bold text-red-500 text-sm">{fmt(item.monto)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InventarioDemo({ onExit }) {
  const stockBajo = MATERIALES.filter(m => m.stock_actual <= m.stock_minimo);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-slate-800">Inventario</h1><p className="text-sm text-slate-500">{MATERIALES.length} materiales</p></div>
        <button disabled className="text-white font-bold rounded-xl px-4 py-2.5 text-sm opacity-40 cursor-not-allowed" style={{ backgroundColor: color }}>+ Agregar</button>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center text-xs text-amber-700 font-medium">
        👀 Modo demo · <button onClick={onExit} className="underline font-bold">Registrate</button> para gestionar tu inventario
      </div>
      {stockBajo.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2">
          <span className="text-amber-500">⚠️</span><p className="text-sm text-amber-800 font-semibold">{stockBajo.length} material(es) con stock bajo</p>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {MATERIALES.map((m, idx) => {
          const bajo = m.stock_actual <= m.stock_minimo;
          return (
            <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${idx < MATERIALES.length - 1 ? "border-b border-slate-50" : ""}`}>
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${bajo ? "bg-amber-400" : "bg-green-400"}`} />
              <div className="flex-1">
                <p className="font-medium text-slate-800 text-sm">{m.nombre}</p>
                <p className="text-xs text-slate-400">{m.stock_actual} {m.unidad} · {fmt(m.costo_unitario)}/uni{bajo ? " ⚠️" : ""}</p>
              </div>
              <p className="text-xs text-slate-400">mín {m.stock_minimo}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PedidosDemo({ onExit }) {
  const [abierto, setAbierto] = useState(null);

  if (abierto) {
    const p = abierto;
    const costo = p.materiales.reduce((s, m) => s + m.cantidad * m.costo, 0);
    const ganancia = p.precio_venta - costo;
    const est = ESTADOS[p.estado];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setAbierto(null)} className="text-slate-400 text-xl">←</button>
          <h1 className="text-xl font-bold text-slate-800 flex-1">{p.cliente}</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center text-xs text-amber-700 font-medium">
          👀 Modo demo · <button onClick={onExit} className="underline font-bold">Registrate</button> para gestionar tus pedidos
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3">ESTADO DEL PEDIDO</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ESTADOS).map(([key, cfg]) => (
              <div key={key} className={`py-2 rounded-xl text-xs font-medium text-center ${p.estado === key ? cfg.color + " border-2 border-current" : "border-2 border-slate-100 text-slate-300"}`}>
                {cfg.emoji} {cfg.label}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
          <p className="text-sm text-slate-600">{p.descripcion}</p>
          <p className="text-xs text-slate-400">📅 Entrega: {new Date(p.fecha_entrega + "T12:00:00").toLocaleDateString("es-CR")}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500">RESUMEN FINANCIERO</p>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Precio de venta</span><span className="font-bold text-slate-800">{fmt(p.precio_venta)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">Costo de materiales</span><span className="font-bold text-red-500">{fmt(costo)}</span></div>
          <div className="border-t border-slate-100 pt-2 flex justify-between">
            <span className="font-semibold text-slate-700 text-sm">Ganancia estimada</span>
            <span className="font-bold text-lg text-green-600">{fmt(ganancia)}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 px-4 pt-4 pb-2">MATERIALES</p>
          {p.materiales.map((m, idx) => (
            <div key={idx} className={`flex items-center justify-between px-4 py-3 ${idx < p.materiales.length - 1 ? "border-b border-slate-50" : ""}`}>
              <div><p className="text-sm font-medium text-slate-800">{m.nombre}</p><p className="text-xs text-slate-400">{m.cantidad} × {fmt(m.costo)}</p></div>
              <p className="text-sm font-bold text-slate-700">{fmt(m.cantidad * m.costo)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-slate-800">Pedidos</h1><p className="text-sm text-slate-500">{PEDIDOS.length} pedidos</p></div>
        <button disabled className="text-white font-bold rounded-xl px-4 py-2.5 text-sm opacity-40 cursor-not-allowed" style={{ backgroundColor: color }}>+ Nuevo</button>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center text-xs text-amber-700 font-medium">
        👀 Modo demo · Tocá un pedido para ver el detalle
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {PEDIDOS.map((p, idx) => {
          const costo = p.materiales.reduce((s, m) => s + m.cantidad * m.costo, 0);
          const ganancia = p.precio_venta - costo;
          const est = ESTADOS[p.estado];
          return (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 ${idx < PEDIDOS.length - 1 ? "border-b border-slate-50" : ""}`} onClick={() => setAbierto(p)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-slate-800 text-sm">{p.cliente}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${est.color}`}>{est.emoji} {est.label}</span>
                </div>
                <p className="text-xs text-slate-400 truncate">{p.descripcion}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-slate-800">{fmt(p.precio_venta)}</p>
                <p className="text-xs font-medium text-green-500">+{fmt(ganancia)}</p>
              </div>
              <span className="text-slate-300">›</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Demo({ onExitDemo }) {
  const [page, setPage] = useState("dashboard");

  const pages = { dashboard: DashboardDemo, ingresos: IngresosDemo, gastos: GastosDemo, inventario: InventarioDemo, pedidos: PedidosDemo };
  const Page = pages[page] || DashboardDemo;

  const navItems = [
    { id: "dashboard",  label: "Dashboard",  icon: "📊" },
    { id: "ingresos",   label: "Ingresos",   icon: "💰" },
    { id: "gastos",     label: "Gastos",     icon: "💸" },
    { id: "pedidos",    label: "Pedidos",    icon: "📋" },
    { id: "inventario", label: "Inventario", icon: "📦" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Banner */}
      <div className="bg-amber-400 text-amber-900 text-xs font-semibold py-2 px-4 flex items-center justify-between sticky top-0 z-50">
        <span>👀 Modo demo — datos de "Fiestas Mágicas CR"</span>
        <button onClick={onExitDemo} className="bg-amber-900 text-amber-100 rounded-lg px-3 py-1 text-xs font-bold hover:bg-amber-800">Crear cuenta</button>
      </div>

      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-8 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>F</div>
            <div>
              <p className="font-semibold text-slate-800 text-sm leading-tight">Fiestas Mágicas CR</p>
              <p className="text-xs text-slate-400">{navItems.find(n => n.id === page)?.label}</p>
            </div>
          </div>
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">DEMO</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">
        <Page onExit={onExitDemo} />
      </main>

      {/* CTA fijo */}
      <div className="bg-white border-t border-slate-100 p-4 sticky bottom-16 z-30">
        <button onClick={onExitDemo}
          className="w-full text-white font-semibold rounded-xl py-3 text-sm hover:opacity-90"
          style={{ backgroundColor: color }}>
          🚀 Crear mi cuenta gratis y empezar
        </button>
      </div>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-slate-200 sticky bottom-0 z-40">
        <div className="max-w-2xl mx-auto flex">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${page === item.id ? "text-blue-600" : "text-slate-400"}`}
              style={page === item.id ? { color } : {}}>
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}


// src/pages/Reportes.jsx
// AGEP v4 — Pantalla de Reportes PDF con vista previa

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  generarEstadoResultados,
  generarReportePedidos,
  generarReporteInventario,
  generarReporteTributario,
} from '../utils/pdfReports';
import { generarReporteTributarioExcel } from '../utils/xlsxReports';
import ReportePreview from '../components/ReportePreview';
import { totalComprasAnio, estadoLimiteRegimen } from '../utils/limiteRegimenSimplificado';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const ROMANOS_TRIMESTRE = ['I', 'II', 'III', 'IV'];

const trimestreDeFecha = (fecha) => {
  const d = new Date(fecha + 'T12:00:00');
  return { anio: d.getFullYear(), trimestre: Math.floor(d.getMonth() / 3) + 1 };
};

const rangoTrimestre = (anio, trimestre) => {
  const mesInicio = (trimestre - 1) * 3;
  const inicio = `${anio}-${String(mesInicio + 1).padStart(2, '0')}-01`;
  const fin = new Date(anio, mesInicio + 3, 0).toISOString().split('T')[0];
  return { inicio, fin };
};

const etiquetaTrimestre = (t) => `${ROMANOS_TRIMESTRE[t.trimestre - 1]} Trimestre ${t.anio}`;

export default function Reportes() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [filtroPedidos, setFiltroPedidos] = useState('todos');
  const [cargando, setCargando] = useState(null); // 'resultados' | 'pedidos' | 'inventario' | 'tributario'
  const [error, setError] = useState(null);

  // Vista previa activa
  const [vista, setVista] = useState(null); // 'resultados' | 'pedidos' | 'inventario' | 'tributario' | null
  const [datosPreview, setDatosPreview] = useState(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);

  // Anios disponibles: año actual y 2 anteriores
  const aniosDisponibles = [hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2];

  // Trimestre tributario: por defecto el vigente, más los que tengan compras registradas
  const trimestreActual = trimestreDeFecha(hoy.toISOString().split('T')[0]);
  const [trimestresDisponibles, setTrimestresDisponibles] = useState([trimestreActual]);
  const [trimestreSel, setTrimestreSel] = useState(trimestreActual);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('gastos')
        .select('fecha')
        .eq('user_id', user.id)
        .eq('tipo', 'material');

      const mapa = new Map();
      (data || []).forEach((g) => {
        const t = trimestreDeFecha(g.fecha);
        mapa.set(`${t.anio}-${t.trimestre}`, t);
      });
      mapa.set(`${trimestreActual.anio}-${trimestreActual.trimestre}`, trimestreActual);

      const lista = Array.from(mapa.values()).sort(
        (a, b) => b.anio - a.anio || b.trimestre - a.trimestre
      );
      setTrimestresDisponibles(lista);
    })();
  }, []);

  const obtenerPerfil = async (userId) => {
    const { data } = await supabase
      .from('perfiles')
      .select('nombre_negocio, nombre_propietario, actividad_economica, moneda, color_principal, logo_url, salario_base_vigente')
      .eq('id', userId)
      .single();
    return data;
  };

  // ── Estado de Resultados: preparar vista previa ────────────────────
  const handleEstadoResultados = async () => {
    setCargando('resultados');
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const perfil = await obtenerPerfil(user.id);

      const fechaMes = new Date(anio, mes, 1);
      const inicioMes = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
      const finMes = new Date(anio, mes + 1, 0).toISOString().split('T')[0];

      const [{ data: ingresosData }, { data: gastosData }] = await Promise.all([
        supabase
          .from('ingresos')
          .select('descripcion, monto, fecha')
          .eq('user_id', user.id)
          .gte('fecha', inicioMes)
          .lte('fecha', finMes)
          .order('fecha', { ascending: true }),
        supabase
          .from('gastos')
          .select('descripcion, monto, tipo, fecha')
          .eq('user_id', user.id)
          .gte('fecha', inicioMes)
          .lte('fecha', finMes)
          .order('fecha', { ascending: true }),
      ]);

      const sumar = (arr) => arr?.reduce((acc, r) => acc + Number(r.monto || 0), 0) || 0;

      const ingresos = sumar(ingresosData);
      const gastosPorTipo = (tipo) =>
        gastosData?.filter((g) => g.tipo === tipo).reduce((acc, g) => acc + Number(g.monto || 0), 0) || 0;

      setDatosPreview({
        perfil,
        fechaMes,
        subtitulo: `${MESES[mes]} ${anio}`,
        ingresos,
        gastosOperativos: gastosPorTipo('operativo'),
        gastosMaterial: gastosPorTipo('material'),
        gastosActivo: gastosPorTipo('activo'),
        gastosRetiro: gastosPorTipo('retiro'),
        detalleIngresos: ingresosData || [],
        detalleGastos: gastosData || [],
      });
      setVista('resultados');
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el Estado de Resultados. Intentá de nuevo.');
    } finally {
      setCargando(null);
    }
  };

  // ── Reporte de Pedidos: preparar vista previa ───────────────────────
  const handleReportePedidos = async () => {
    setCargando('pedidos');
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const perfil = await obtenerPerfil(user.id);

      const { data: pedidosData } = await supabase
        .from('pedidos')
        .select(`
          cliente, descripcion, fecha_entrega, precio_venta, estado,
          pedido_materiales (cantidad, costo_unitario)
        `)
        .eq('user_id', user.id)
        .order('fecha_entrega', { ascending: false });

      const pedidos = (pedidosData || []).map((p) => ({
        ...p,
        costoMateriales: (p.pedido_materiales || []).reduce(
          (acc, m) => acc + Number(m.cantidad || 0) * Number(m.costo_unitario || 0),
          0
        ),
      }));

      setDatosPreview({ perfil, pedidos, filtroEstado: filtroPedidos });
      setVista('pedidos');
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el Reporte de Pedidos. Intentá de nuevo.');
    } finally {
      setCargando(null);
    }
  };

  // ── Reporte de Inventario: preparar vista previa ────────────────────
  const handleReporteInventario = async () => {
    setCargando('inventario');
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const perfil = await obtenerPerfil(user.id);

      const { data: materiales } = await supabase
        .from('materiales')
        .select('nombre, unidad, costo_unitario, stock_actual, stock_minimo')
        .eq('user_id', user.id)
        .order('nombre', { ascending: true });

      setDatosPreview({ perfil, materiales: materiales || [] });
      setVista('inventario');
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el Reporte de Inventario. Intentá de nuevo.');
    } finally {
      setCargando(null);
    }
  };

  // ── Reporte Tributario Trimestral: preparar vista previa ────────────
  const handleReporteTributario = async () => {
    setCargando('tributario');
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const perfil = await obtenerPerfil(user.id);

      const { inicio, fin } = rangoTrimestre(trimestreSel.anio, trimestreSel.trimestre);

      const { data: comprasData } = await supabase
        .from('gastos')
        .select('fecha, monto, proveedor, numero_comprobante, tarifa_iva, factura_url, categorias_gastos(nombre)')
        .eq('user_id', user.id)
        .eq('tipo', 'material')
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .order('fecha', { ascending: true });

      const compras = comprasData || [];
      const totalCompras = compras.reduce((acc, c) => acc + Number(c.monto || 0), 0);
      const cantidadCompras = compras.length;
      const proveedoresDistintos = new Set(
        compras.map((c) => (c.proveedor || '').trim() || 'Sin proveedor')
      ).size;
      const compraPromedio = cantidadCompras > 0 ? totalCompras / cantidadCompras : 0;

      const porCategoria = new Map();
      compras.forEach((c) => {
        const nombre = c.categorias_gastos?.nombre || 'Sin categoría';
        porCategoria.set(nombre, (porCategoria.get(nombre) || 0) + Number(c.monto || 0));
      });

      const porTarifa = new Map();
      compras.forEach((c) => {
        const tarifa = c.tarifa_iva != null ? Number(c.tarifa_iva) : 0;
        porTarifa.set(tarifa, (porTarifa.get(tarifa) || 0) + Number(c.monto || 0));
      });

      const porProveedor = new Map();
      compras.forEach((c) => {
        const proveedor = (c.proveedor || '').trim() || 'Sin proveedor';
        porProveedor.set(proveedor, (porProveedor.get(proveedor) || 0) + Number(c.monto || 0));
      });

      const conFoto = compras.filter((c) => c.factura_url).length;

      // Límite anual del Régimen Simplificado: 186 salarios base en compras del año calendario en curso
      const anioActual = hoy.getFullYear();
      const totalComprasAnual = await totalComprasAnio(user.id, anioActual);
      const limiteRegimen = {
        anio: anioActual,
        total: totalComprasAnual,
        ...estadoLimiteRegimen(totalComprasAnual, perfil?.salario_base_vigente),
      };

      setDatosPreview({
        perfil,
        trimestreLabel: etiquetaTrimestre(trimestreSel),
        fechaEmision: new Date().toLocaleDateString('es-CR'),
        totalCompras,
        cantidadCompras,
        proveedoresDistintos,
        compraPromedio,
        totalesPorCategoria: Array.from(porCategoria.entries()).map(([nombre, monto]) => ({ nombre, monto })),
        totalesPorTarifa: Array.from(porTarifa.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([tarifa, monto]) => ({ tarifa, monto })),
        totalesPorProveedor: Array.from(porProveedor.entries()).map(([proveedor, monto]) => ({ proveedor, monto })),
        conFoto,
        sinFoto: cantidadCompras - conFoto,
        limiteRegimen,
        detalle: compras.map((c) => ({
          fecha: c.fecha,
          proveedor: c.proveedor,
          numero_comprobante: c.numero_comprobante,
          categoria: c.categorias_gastos?.nombre || 'Sin categoría',
          tarifa_iva: c.tarifa_iva,
          monto: c.monto,
        })),
      });
      setVista('tributario');
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el Reporte Tributario Trimestral. Intentá de nuevo.');
    } finally {
      setCargando(null);
    }
  };

  // ── Descargar PDF desde la vista previa ─────────────────────────────
  const handleDescargarPdf = async () => {
    setDescargandoPdf(true);
    try {
      if (vista === 'resultados') {
        await generarEstadoResultados(datosPreview);
      } else if (vista === 'pedidos') {
        await generarReportePedidos(datosPreview);
      } else if (vista === 'inventario') {
        await generarReporteInventario(datosPreview);
      } else if (vista === 'tributario') {
        await generarReporteTributario(datosPreview);
      }
    } catch (err) {
      console.error(err);
      alert('No se pudo descargar el PDF. Intentá de nuevo.');
    } finally {
      setDescargandoPdf(false);
    }
  };

  // ── Exportar a Excel desde la vista previa ──────────────────────────
  const handleExportarExcel = async () => {
    setExportandoExcel(true);
    try {
      if (vista === 'tributario') {
        generarReporteTributarioExcel(datosPreview);
      }
    } catch (err) {
      console.error(err);
      alert('No se pudo exportar a Excel. Intentá de nuevo.');
    } finally {
      setExportandoExcel(false);
    }
  };

  const cerrarVista = () => {
    setVista(null);
    setDatosPreview(null);
  };

  // ── Render: vista previa activa ─────────────────────────────────────
  if (vista && datosPreview) {
    return (
      <ReportePreview
        tipo={vista}
        datos={datosPreview}
        cargandoPdf={descargandoPdf}
        cargandoExcel={exportandoExcel}
        onCerrar={cerrarVista}
        onDescargar={handleDescargarPdf}
        onExportarExcel={vista === 'tributario' ? handleExportarExcel : undefined}
      />
    );
  }

  // ── Render: selección de reportes ───────────────────────────────────
  return (
    <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
      <h2 className="text-[#1a1a2e] dark:text-slate-100" style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
        Reportes
      </h2>
      <p className="text-[#666] dark:text-slate-400" style={{ fontSize: '13px', marginBottom: '24px' }}>
        Mirá tus reportes en pantalla, imprimilos o descargalos en PDF.
      </p>

      {error && (
        <div className="bg-[#fff0f0] dark:bg-red-950/40 border border-[#ffcccc] dark:border-red-800 text-[#cc0000] dark:text-red-400" style={{
          borderRadius: '8px', padding: '12px', marginBottom: '16px',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* ── Tarjeta 1: Estado de Resultados ── */}
      <div style={estilos.tarjeta} className="bg-white dark:bg-slate-800 border border-[#f0f0f0] dark:border-slate-700">
        <div style={estilos.tarjetaEncabezado}>
          <span style={estilos.icono}>📊</span>
          <div>
            <div style={estilos.titulo} className="text-[#1a1a2e] dark:text-slate-100">Estado de Resultados</div>
            <div style={estilos.subtitulo} className="text-[#888] dark:text-slate-400">Ingresos, gastos y utilidad del mes</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            style={estilos.select}
            className="border border-[#ddd] dark:border-slate-600 bg-[#fafafa] dark:bg-slate-800 text-[#333] dark:text-slate-100"
          >
            {MESES.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            style={{ ...estilos.select, maxWidth: '90px' }}
            className="border border-[#ddd] dark:border-slate-600 bg-[#fafafa] dark:bg-slate-800 text-[#333] dark:text-slate-100"
          >
            {aniosDisponibles.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleEstadoResultados}
          disabled={cargando !== null}
          style={estilos.boton(cargando === 'resultados')}
        >
          {cargando === 'resultados' ? 'Cargando...' : 'Ver reporte'}
        </button>
      </div>

      {/* ── Tarjeta 2: Reporte de Pedidos ── */}
      <div style={estilos.tarjeta} className="bg-white dark:bg-slate-800 border border-[#f0f0f0] dark:border-slate-700">
        <div style={estilos.tarjetaEncabezado}>
          <span style={estilos.icono}>📦</span>
          <div>
            <div style={estilos.titulo} className="text-[#1a1a2e] dark:text-slate-100">Reporte de Pedidos</div>
            <div style={estilos.subtitulo} className="text-[#888] dark:text-slate-400">Todos los pedidos con costo y ganancia</div>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={estilos.label} className="text-[#555] dark:text-slate-300">Filtrar por estado</label>
          <select
            value={filtroPedidos}
            onChange={(e) => setFiltroPedidos(e.target.value)}
            style={estilos.select}
            className="border border-[#ddd] dark:border-slate-600 bg-[#fafafa] dark:bg-slate-800 text-[#333] dark:text-slate-100"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="entregado">Entregado</option>
            <option value="cobrado">Cobrado</option>
          </select>
        </div>

        <button
          onClick={handleReportePedidos}
          disabled={cargando !== null}
          style={estilos.boton(cargando === 'pedidos')}
        >
          {cargando === 'pedidos' ? 'Cargando...' : 'Ver reporte'}
        </button>
      </div>

      {/* ── Tarjeta 3: Inventario ── */}
      <div style={estilos.tarjeta} className="bg-white dark:bg-slate-800 border border-[#f0f0f0] dark:border-slate-700">
        <div style={estilos.tarjetaEncabezado}>
          <span style={estilos.icono}>🗂️</span>
          <div>
            <div style={estilos.titulo} className="text-[#1a1a2e] dark:text-slate-100">Reporte de Inventario</div>
            <div style={estilos.subtitulo} className="text-[#888] dark:text-slate-400">Stock actual, costos y alertas de mínimos</div>
          </div>
        </div>

        <button
          onClick={handleReporteInventario}
          disabled={cargando !== null}
          style={{ ...estilos.boton(cargando === 'inventario'), marginTop: '4px' }}
        >
          {cargando === 'inventario' ? 'Cargando...' : 'Ver reporte'}
        </button>
      </div>

      {/* ── Tarjeta 4: Reporte Tributario Trimestral ── */}
      <div style={estilos.tarjeta} className="bg-white dark:bg-slate-800 border border-[#f0f0f0] dark:border-slate-700">
        <div style={estilos.tarjetaEncabezado}>
          <span style={estilos.icono}>🧾</span>
          <div>
            <div style={estilos.titulo} className="text-[#1a1a2e] dark:text-slate-100">Reporte Tributario Trimestral</div>
            <div style={estilos.subtitulo} className="text-[#888] dark:text-slate-400">Compras de material · Régimen Simplificado</div>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={estilos.label} className="text-[#555] dark:text-slate-300">Trimestre</label>
          <select
            value={`${trimestreSel.anio}-${trimestreSel.trimestre}`}
            onChange={(e) => {
              const [a, t] = e.target.value.split('-').map(Number);
              setTrimestreSel({ anio: a, trimestre: t });
            }}
            style={estilos.select}
            className="border border-[#ddd] dark:border-slate-600 bg-[#fafafa] dark:bg-slate-800 text-[#333] dark:text-slate-100"
          >
            {trimestresDisponibles.map((t) => (
              <option key={`${t.anio}-${t.trimestre}`} value={`${t.anio}-${t.trimestre}`}>
                {etiquetaTrimestre(t)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleReporteTributario}
          disabled={cargando !== null}
          style={estilos.boton(cargando === 'tributario')}
        >
          {cargando === 'tributario' ? 'Cargando...' : 'Ver reporte'}
        </button>
      </div>

      <p className="text-[#aaa] dark:text-slate-500" style={{ fontSize: '11px', textAlign: 'center', marginTop: '16px' }}>
        Desde la vista previa podés imprimir o descargar el PDF.
      </p>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────
const estilos = {
  tarjeta: {
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  tarjetaEncabezado: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '14px',
  },
  icono: {
    fontSize: '24px',
    lineHeight: 1,
    marginTop: '2px',
  },
  titulo: {
    fontSize: '15px',
    fontWeight: '700',
    marginBottom: '2px',
  },
  subtitulo: {
    fontSize: '12px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    marginBottom: '4px',
    fontWeight: '500',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  boton: (activo) => ({
    width: '100%',
    padding: '11px',
    borderRadius: '8px',
    border: 'none',
    background: activo ? '#a0b8d0' : '#2E75B6',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: activo ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s',
  }),
};

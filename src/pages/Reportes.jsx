// src/pages/Reportes.jsx
// AGEP v4 — Pantalla de Reportes PDF

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  generarEstadoResultados,
  generarReportePedidos,
  generarReporteInventario,
} from '../utils/pdfReports';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export default function Reportes() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [filtroPedidos, setFiltroPedidos] = useState('todos');
  const [cargando, setCargando] = useState(null); // 'resultados' | 'pedidos' | 'inventario'
  const [error, setError] = useState(null);

  // Anios disponibles: año actual y 2 anteriores
  const aniosDisponibles = [hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2];

  const obtenerPerfil = async (userId) => {
    const { data } = await supabase
      .from('perfiles')
      .select('nombre_negocio, nombre_propietario, moneda, color_principal, logo_url')
      .eq('id', userId)
      .single();
    return data;
  };

  // ── Estado de Resultados ──────────────────────────────────────────
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

      await generarEstadoResultados({
        perfil,
        fechaMes,
        ingresos,
        gastosOperativos: gastosPorTipo('operativo'),
        gastosMaterial: gastosPorTipo('material'),
        gastosActivo: gastosPorTipo('activo'),
        gastosRetiro: gastosPorTipo('retiro'),
        detalleIngresos: ingresosData || [],
        detalleGastos: gastosData || [],
      });
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el Estado de Resultados. Intentá de nuevo.');
    } finally {
      setCargando(null);
    }
  };

  // ── Reporte de Pedidos ────────────────────────────────────────────
  const handleReportePedidos = async () => {
    setCargando('pedidos');
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const perfil = await obtenerPerfil(user.id);

      // Traer pedidos con sus materiales para calcular costo
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

      await generarReportePedidos({ perfil, pedidos, filtroEstado: filtroPedidos });
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el Reporte de Pedidos. Intentá de nuevo.');
    } finally {
      setCargando(null);
    }
  };

  // ── Reporte de Inventario ─────────────────────────────────────────
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

      await generarReporteInventario({ perfil, materiales: materiales || [] });
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el Reporte de Inventario. Intentá de nuevo.');
    } finally {
      setCargando(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px', color: '#1a1a2e' }}>
        Reportes PDF
      </h2>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>
        Descargá reportes listos para compartir o archivar.
      </p>

      {error && (
        <div style={{
          background: '#fff0f0', border: '1px solid #ffcccc',
          borderRadius: '8px', padding: '12px', marginBottom: '16px',
          fontSize: '13px', color: '#cc0000',
        }}>
          {error}
        </div>
      )}

      {/* ── Tarjeta 1: Estado de Resultados ── */}
      <div style={estilos.tarjeta}>
        <div style={estilos.tarjetaEncabezado}>
          <span style={estilos.icono}>📊</span>
          <div>
            <div style={estilos.titulo}>Estado de Resultados</div>
            <div style={estilos.subtitulo}>Ingresos, gastos y utilidad del mes</div>
          </div>
        </div>

        {/* Selector mes / año */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            style={estilos.select}
          >
            {MESES.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            style={{ ...estilos.select, maxWidth: '90px' }}
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
          {cargando === 'resultados' ? 'Generando PDF...' : 'Descargar PDF'}
        </button>
      </div>

      {/* ── Tarjeta 2: Reporte de Pedidos ── */}
      <div style={estilos.tarjeta}>
        <div style={estilos.tarjetaEncabezado}>
          <span style={estilos.icono}>📦</span>
          <div>
            <div style={estilos.titulo}>Reporte de Pedidos</div>
            <div style={estilos.subtitulo}>Todos los pedidos con costo y ganancia</div>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={estilos.label}>Filtrar por estado</label>
          <select
            value={filtroPedidos}
            onChange={(e) => setFiltroPedidos(e.target.value)}
            style={estilos.select}
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
          {cargando === 'pedidos' ? 'Generando PDF...' : 'Descargar PDF'}
        </button>
      </div>

      {/* ── Tarjeta 3: Inventario ── */}
      <div style={estilos.tarjeta}>
        <div style={estilos.tarjetaEncabezado}>
          <span style={estilos.icono}>🗂️</span>
          <div>
            <div style={estilos.titulo}>Reporte de Inventario</div>
            <div style={estilos.subtitulo}>Stock actual, costos y alertas de mínimos</div>
          </div>
        </div>

        <button
          onClick={handleReporteInventario}
          disabled={cargando !== null}
          style={{ ...estilos.boton(cargando === 'inventario'), marginTop: '4px' }}
        >
          {cargando === 'inventario' ? 'Generando PDF...' : 'Descargar PDF'}
        </button>
      </div>

      <p style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', marginTop: '16px' }}>
        Los PDFs se descargan directamente en tu dispositivo.
      </p>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────
const estilos = {
  tarjeta: {
    background: '#fff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    border: '1px solid #f0f0f0',
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
    color: '#1a1a2e',
    marginBottom: '2px',
  },
  subtitulo: {
    fontSize: '12px',
    color: '#888',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#555',
    marginBottom: '4px',
    fontWeight: '500',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
    background: '#fafafa',
    color: '#333',
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



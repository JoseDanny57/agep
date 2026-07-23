// src/pages/CentroTributario.jsx
// AGEP — Centro Tributario: trimestre actual, fechas límite y estado de declaración

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  trimestreDeFecha,
  rangoTrimestre,
  etiquetaTrimestreConRango,
  getOrCreatePeriodo,
} from '../utils/tributario';

function fmt(monto, moneda) {
  if (moneda === 'USD') return `$${Number(monto).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
  return `₡${Number(monto).toLocaleString('es-CR', { minimumFractionDigits: 0 })}`;
}

function ToggleDeclarado({ declarado, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      aria-label={declarado ? 'Marcar como pendiente' : 'Marcar como declarado'}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
        declarado ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          declarado ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function TarjetaPeriodo({ periodo, color, guardando, onCambiarFecha, onToggleDeclarado, onVerReporte }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
      <p className="font-semibold text-slate-800 dark:text-slate-100">{etiquetaTrimestreConRango(periodo)}</p>

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha límite</label>
        <input
          type="date"
          value={periodo.fecha_limite || ''}
          onChange={(e) => onCambiarFecha(periodo, e.target.value)}
          disabled={guardando === periodo.id}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {periodo.declarado ? 'Declarado' : 'Pendiente'}
        </span>
        <ToggleDeclarado
          declarado={periodo.declarado}
          onChange={() => onToggleDeclarado(periodo)}
          disabled={guardando === periodo.id}
        />
      </div>

      <button
        onClick={() => onVerReporte(periodo)}
        className="w-full text-sm font-semibold rounded-lg px-3 py-2 text-white hover:opacity-90"
        style={{ backgroundColor: color }}
      >
        Ver Reporte Tributario
      </button>
    </div>
  );
}

export default function CentroTributario({ perfil, userId, onVerReporteTributario }) {
  const color = perfil?.color_principal || '#2E75B6';
  const moneda = perfil?.moneda || 'CRC';
  const trimestreActualInfo = trimestreDeFecha(new Date());

  const [periodoActual, setPeriodoActual] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, cantidad: 0 });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const actual = await getOrCreatePeriodo(userId, trimestreActualInfo.anio, trimestreActualInfo.trimestre);
      setPeriodoActual(actual);

      const { data: todos } = await supabase
        .from('periodos_tributarios')
        .select('*')
        .eq('user_id', userId)
        .order('anio', { ascending: false })
        .order('trimestre', { ascending: false });

      const anteriores = (todos || []).filter(
        (p) => !(p.anio === trimestreActualInfo.anio && p.trimestre === trimestreActualInfo.trimestre)
      );
      setHistorial(anteriores);

      const { inicio, fin } = rangoTrimestre(trimestreActualInfo.anio, trimestreActualInfo.trimestre);
      const { data: compras } = await supabase
        .from('gastos')
        .select('monto')
        .eq('user_id', userId)
        .eq('tipo', 'material')
        .gte('fecha', inicio)
        .lte('fecha', fin);

      setResumen({
        total: (compras || []).reduce((acc, c) => acc + Number(c.monto || 0), 0),
        cantidad: (compras || []).length,
      });
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el Centro Tributario. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [userId, trimestreActualInfo.anio, trimestreActualInfo.trimestre]);

  useEffect(() => { cargar(); }, [cargar]);

  function aplicarActualizacion(id, data) {
    if (!data) return;
    setPeriodoActual((prev) => (prev?.id === id ? data : prev));
    setHistorial((prev) => prev.map((p) => (p.id === id ? data : p)));
  }

  async function actualizarFechaLimite(periodo, nuevaFecha) {
    setGuardando(periodo.id);
    try {
      const { data } = await supabase
        .from('periodos_tributarios')
        .update({ fecha_limite: nuevaFecha })
        .eq('id', periodo.id)
        .select()
        .single();
      aplicarActualizacion(periodo.id, data);
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar la fecha límite.');
    } finally {
      setGuardando(null);
    }
  }

  async function toggleDeclarado(periodo) {
    setGuardando(periodo.id);
    try {
      const nuevoDeclarado = !periodo.declarado;
      const { data } = await supabase
        .from('periodos_tributarios')
        .update({
          declarado: nuevoDeclarado,
          fecha_declarado: nuevoDeclarado ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', periodo.id)
        .select()
        .single();
      aplicarActualizacion(periodo.id, data);
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar el estado de declaración.');
    } finally {
      setGuardando(null);
    }
  }

  function verReporte(periodo) {
    onVerReporteTributario?.(periodo.anio, periodo.trimestre);
  }

  if (loading) return <div className="text-center py-12 text-slate-400 dark:text-slate-500">Cargando...</div>;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Centro Tributario</h2>

      {error && (
        <div className="bg-[#fff0f0] dark:bg-red-950/40 border border-[#ffcccc] dark:border-red-800 text-[#cc0000] dark:text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {periodoActual && (
        <div>
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Trimestre actual</h3>
          <TarjetaPeriodo
            periodo={periodoActual}
            color={color}
            guardando={guardando}
            onCambiarFecha={actualizarFechaLimite}
            onToggleDeclarado={toggleDeclarado}
            onVerReporte={verReporte}
          />
          <div className="mt-3 flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 border border-slate-100 dark:border-slate-700 shadow-sm">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Compras del trimestre (material)</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{fmt(resumen.total, moneda)}</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {resumen.cantidad} compra{resumen.cantidad !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Trimestres anteriores</h3>
        {historial.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">Aún no hay trimestres anteriores registrados.</p>
        ) : (
          <div className="space-y-3">
            {historial.map((p) => (
              <TarjetaPeriodo
                key={p.id}
                periodo={p}
                color={color}
                guardando={guardando}
                onCambiarFecha={actualizarFechaLimite}
                onToggleDeclarado={toggleDeclarado}
                onVerReporte={verReporte}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

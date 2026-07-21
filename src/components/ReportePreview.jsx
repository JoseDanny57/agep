
// src/components/ReportePreview.jsx
// AGEP — Vista previa en pantalla de los Reportes, con opciones Imprimir / Descargar PDF

import { formatearMonto } from '../utils/pdfReports';

const ESTADO_ETIQUETA = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  entregado: 'Entregado',
  cobrado: 'Cobrado',
};

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CR');
}

export default function ReportePreview({ tipo, datos, cargandoPdf, cargandoExcel, onCerrar, onDescargar, onExportarExcel }) {
  const perfil = datos?.perfil;
  const color = perfil?.color_principal || '#2E75B6';
  const moneda = perfil?.moneda || 'CRC';

  const handleImprimir = () => window.print();

  let titulo = '';
  let subtitulo = '';

  if (tipo === 'resultados') {
    titulo = 'Estado de Resultados';
    subtitulo = datos.subtitulo;
  } else if (tipo === 'pedidos') {
    titulo = 'Reporte de Pedidos';
    subtitulo = datos.filtroEstado === 'todos' ? 'Todos los pedidos' : `Estado: ${ESTADO_ETIQUETA[datos.filtroEstado] || datos.filtroEstado}`;
  } else if (tipo === 'inventario') {
    const bajoMinimo = (datos.materiales || []).filter(
      (m) => Number(m.stock_actual) < Number(m.stock_minimo)
    ).length;
    titulo = 'Reporte de Inventario';
    subtitulo = bajoMinimo > 0 ? `${bajoMinimo} material${bajoMinimo > 1 ? 'es' : ''} bajo stock mínimo` : 'Inventario al día';
  } else if (tipo === 'tributario') {
    titulo = 'Reporte Tributario Trimestral – Régimen Simplificado';
    subtitulo = datos.trimestreLabel;
  }

  return (
    <div style={estilos.overlay}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #agep-print-area, #agep-print-area * { visibility: visible; }
          #agep-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
        }
      `}</style>

      {/* Barra superior (no se imprime) */}
      <div style={estilos.barraSuperior} className="no-print">
        <button onClick={onCerrar} style={estilos.botonVolver}>← Volver</button>
        <span style={estilos.barraTitulo}>Vista previa</span>
        <span style={{ width: 60 }} />
      </div>

      {/* Contenido imprimible */}
      <div style={estilos.contenedorScroll}>
        <div id="agep-print-area" style={estilos.hoja}>
          <div style={estilos.encabezado}>
            <div style={estilos.encabezadoIzq}>
              {perfil?.logo_url && (
                <img src={perfil.logo_url} alt="Logo" style={estilos.logo} />
              )}
              <div>
                <div style={estilos.nombreNegocio}>{perfil?.nombre_negocio || 'Mi Negocio'}</div>
                <div style={estilos.nombrePropietario}>{perfil?.nombre_propietario || ''}</div>
              </div>
            </div>
            <div style={estilos.encabezadoDer}>
              <div style={{ ...estilos.tituloReporte, color }}>{titulo}</div>
              <div style={estilos.subtituloReporte}>{subtitulo}</div>
            </div>
          </div>
          <div style={{ ...estilos.linea, borderColor: color }} />

          {tipo === 'resultados' && <VistaResultados datos={datos} moneda={moneda} color={color} />}
          {tipo === 'pedidos' && <VistaPedidos datos={datos} moneda={moneda} color={color} />}
          {tipo === 'inventario' && <VistaInventario datos={datos} moneda={moneda} color={color} />}
          {tipo === 'tributario' && <VistaTributario datos={datos} moneda={moneda} color={color} />}

          <div style={estilos.pie}>
            Generado con AGEP • {new Date().toLocaleDateString('es-CR')}
          </div>
        </div>
      </div>

      {/* Barra de acciones (no se imprime) */}
      <div style={estilos.barraAcciones} className="no-print">
        <button onClick={handleImprimir} style={estilos.botonSecundario}>
          🖨️ Imprimir
        </button>
        <button onClick={onDescargar} disabled={cargandoPdf} style={{ ...estilos.botonPrimario, backgroundColor: color, opacity: cargandoPdf ? 0.6 : 1 }}>
          {cargandoPdf ? 'Generando...' : '⬇️ Descargar PDF'}
        </button>
        {onExportarExcel && (
          <button onClick={onExportarExcel} disabled={cargandoExcel} style={{ ...estilos.botonSecundario, opacity: cargandoExcel ? 0.6 : 1 }}>
            {cargandoExcel ? 'Generando...' : '📊 Exportar a Excel'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Estado de Resultados ─────────────────────────────────
function VistaResultados({ datos, moneda, color }) {
  const { ingresos, gastosOperativos, gastosMaterial, gastosActivo, gastosRetiro, detalleIngresos, detalleGastos } = datos;
  const utilidad = ingresos - gastosOperativos;
  const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;
  const operativos = (detalleGastos || []).filter((g) => g.tipo === 'operativo');

  return (
    <>
      <table style={estilos.tabla}>
        <thead>
          <tr style={{ backgroundColor: color }}>
            <th style={estilos.th}>Concepto</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={estilos.td}>Ingresos del mes</td><td style={estilos.tdDer}>{formatearMonto(ingresos, moneda)}</td></tr>
          <tr style={estilos.filaAlterna}><td style={estilos.td}>Gastos operativos</td><td style={estilos.tdDer}>{formatearMonto(gastosOperativos, moneda)}</td></tr>
          <tr>
            <td style={{ ...estilos.td, fontWeight: 700 }}>Utilidad neta</td>
            <td style={{ ...estilos.tdDer, fontWeight: 700, color: utilidad >= 0 ? '#00823c' : '#b41e1e' }}>
              {formatearMonto(utilidad, moneda)}
            </td>
          </tr>
          <tr style={estilos.filaAlterna}><td style={estilos.td}>Margen de utilidad</td><td style={estilos.tdDer}>{margen.toFixed(1)}%</td></tr>
        </tbody>
      </table>

      <div style={estilos.subtituloSeccion}>Movimientos informativos (no afectan la utilidad)</div>
      <table style={estilos.tabla}>
        <thead>
          <tr style={{ backgroundColor: '#787878' }}>
            <th style={estilos.th}>Tipo</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={estilos.td}>Compras de material</td><td style={estilos.tdDer}>{formatearMonto(gastosMaterial, moneda)}</td></tr>
          <tr style={estilos.filaAlterna}><td style={estilos.td}>Compra de activos</td><td style={estilos.tdDer}>{formatearMonto(gastosActivo, moneda)}</td></tr>
          <tr><td style={estilos.td}>Retiros del propietario</td><td style={estilos.tdDer}>{formatearMonto(gastosRetiro, moneda)}</td></tr>
        </tbody>
      </table>

      {detalleIngresos?.length > 0 && (
        <>
          <div style={estilos.subtituloSeccion}>Detalle de Ingresos</div>
          <table style={estilos.tabla}>
            <thead>
              <tr style={{ backgroundColor: color }}>
                <th style={estilos.th}>Fecha</th><th style={estilos.th}>Descripción</th><th style={{ ...estilos.th, textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {detalleIngresos.map((r, i) => (
                <tr key={i} style={i % 2 ? estilos.filaAlterna : undefined}>
                  <td style={estilos.td}>{formatearFecha(r.fecha)}</td>
                  <td style={estilos.td}>{r.descripcion}</td>
                  <td style={estilos.tdDer}>{formatearMonto(r.monto, moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {operativos.length > 0 && (
        <>
          <div style={estilos.subtituloSeccion}>Detalle de Gastos Operativos</div>
          <table style={estilos.tabla}>
            <thead>
              <tr style={{ backgroundColor: color }}>
                <th style={estilos.th}>Fecha</th><th style={estilos.th}>Descripción</th><th style={{ ...estilos.th, textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {operativos.map((r, i) => (
                <tr key={i} style={i % 2 ? estilos.filaAlterna : undefined}>
                  <td style={estilos.td}>{formatearFecha(r.fecha)}</td>
                  <td style={estilos.td}>{r.descripcion}</td>
                  <td style={estilos.tdDer}>{formatearMonto(r.monto, moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

// ── Reporte de Pedidos ───────────────────────────────────
function VistaPedidos({ datos, moneda, color }) {
  const { pedidos = [], filtroEstado } = datos;
  const lista = filtroEstado === 'todos' ? pedidos : pedidos.filter((p) => p.estado === filtroEstado);
  const totalVenta = lista.reduce((acc, p) => acc + Number(p.precio_venta || 0), 0);
  const totalCosto = lista.reduce((acc, p) => acc + Number(p.costoMateriales || 0), 0);
  const totalGanancia = totalVenta - totalCosto;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ ...estilos.tabla, minWidth: 640 }}>
        <thead>
          <tr style={{ backgroundColor: color }}>
            <th style={estilos.th}>Cliente</th>
            <th style={estilos.th}>Descripción</th>
            <th style={estilos.th}>Entrega</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Precio venta</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Costo mat.</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Ganancia</th>
            <th style={estilos.th}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((p, i) => {
            const ganancia = (p.precio_venta || 0) - (p.costoMateriales || 0);
            return (
              <tr key={i} style={i % 2 ? estilos.filaAlterna : undefined}>
                <td style={estilos.td}>{p.cliente}</td>
                <td style={estilos.td}>{p.descripcion}</td>
                <td style={estilos.td}>{formatearFecha(p.fecha_entrega)}</td>
                <td style={estilos.tdDer}>{formatearMonto(p.precio_venta, moneda)}</td>
                <td style={estilos.tdDer}>{formatearMonto(p.costoMateriales || 0, moneda)}</td>
                <td style={{ ...estilos.tdDer, color: ganancia >= 0 ? '#00823c' : '#b41e1e', fontWeight: 600 }}>
                  {formatearMonto(ganancia, moneda)}
                </td>
                <td style={estilos.td}>{ESTADO_ETIQUETA[p.estado] || p.estado}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={estilos.filaTotal}>
            <td style={estilos.td} colSpan={3}><strong>Totales</strong></td>
            <td style={estilos.tdDer}><strong>{formatearMonto(totalVenta, moneda)}</strong></td>
            <td style={estilos.tdDer}><strong>{formatearMonto(totalCosto, moneda)}</strong></td>
            <td style={estilos.tdDer}><strong>{formatearMonto(totalGanancia, moneda)}</strong></td>
            <td style={estilos.td} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Reporte de Inventario ────────────────────────────────
function VistaInventario({ datos, moneda, color }) {
  const { materiales = [] } = datos;
  const valorTotal = materiales.reduce(
    (acc, m) => acc + Number(m.costo_unitario || 0) * Number(m.stock_actual || 0), 0
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ ...estilos.tabla, minWidth: 560 }}>
        <thead>
          <tr style={{ backgroundColor: color }}>
            <th style={estilos.th}>Material</th>
            <th style={estilos.th}>Unidad</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Costo unit.</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Stock actual</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Stock mín.</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Valor en stock</th>
          </tr>
        </thead>
        <tbody>
          {materiales.map((m, i) => {
            const bajo = Number(m.stock_actual) < Number(m.stock_minimo);
            const estiloBajo = bajo ? { color: '#b41e1e', fontWeight: 700 } : {};
            return (
              <tr key={i} style={i % 2 ? estilos.filaAlterna : undefined}>
                <td style={{ ...estilos.td, ...estiloBajo }}>{m.nombre}</td>
                <td style={{ ...estilos.td, ...estiloBajo }}>{m.unidad}</td>
                <td style={{ ...estilos.tdDer, ...estiloBajo }}>{formatearMonto(m.costo_unitario, moneda)}</td>
                <td style={{ ...estilos.tdDer, ...estiloBajo }}>{m.stock_actual}</td>
                <td style={{ ...estilos.tdDer, ...estiloBajo }}>{m.stock_minimo}</td>
                <td style={{ ...estilos.tdDer, ...estiloBajo }}>{formatearMonto(Number(m.costo_unitario || 0) * Number(m.stock_actual || 0), moneda)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={estilos.filaTotal}>
            <td style={estilos.td} colSpan={4} />
            <td style={estilos.tdDer}><strong>Valor total:</strong></td>
            <td style={estilos.tdDer}><strong>{formatearMonto(valorTotal, moneda)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Reporte Tributario Trimestral ────────────────────────
function VistaTributario({ datos, moneda, color }) {
  const {
    perfil,
    fechaEmision,
    totalCompras = 0,
    cantidadCompras = 0,
    proveedoresDistintos = 0,
    compraPromedio = 0,
    totalesPorCategoria = [],
    totalesPorTarifa = [],
    totalesPorProveedor = [],
    conFoto = 0,
    sinFoto = 0,
    detalle = [],
  } = datos;

  return (
    <>
      <div style={estilos.infoTrimestre}>
        <div><strong>Actividad económica:</strong> {perfil?.actividad_economica || '—'}</div>
        <div><strong>Fecha de emisión:</strong> {fechaEmision}</div>
      </div>

      <div style={estilos.subtituloSeccion}>Resumen del trimestre</div>
      <table style={estilos.tabla}>
        <thead>
          <tr style={{ backgroundColor: color }}>
            <th style={estilos.th}>Concepto</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={estilos.td}>Compras del trimestre</td><td style={estilos.tdDer}>{formatearMonto(totalCompras, moneda)}</td></tr>
          <tr style={estilos.filaAlterna}><td style={estilos.td}>Cantidad de compras</td><td style={estilos.tdDer}>{cantidadCompras}</td></tr>
          <tr><td style={estilos.td}>Proveedores diferentes</td><td style={estilos.tdDer}>{proveedoresDistintos}</td></tr>
          <tr style={estilos.filaAlterna}><td style={estilos.td}>Compra promedio</td><td style={estilos.tdDer}>{formatearMonto(compraPromedio, moneda)}</td></tr>
        </tbody>
      </table>

      <div style={estilos.subtituloSeccion}>Totales por categoría</div>
      {totalesPorCategoria.length === 0 ? (
        <p style={estilos.sinDatos}>Sin compras registradas en este trimestre.</p>
      ) : (
        <table style={estilos.tabla}>
          <thead>
            <tr style={{ backgroundColor: color }}>
              <th style={estilos.th}>Categoría</th>
              <th style={{ ...estilos.th, textAlign: 'right' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {totalesPorCategoria.map((c, i) => (
              <tr key={c.nombre} style={i % 2 ? estilos.filaAlterna : undefined}>
                <td style={estilos.td}>{c.nombre}</td>
                <td style={estilos.tdDer}>{formatearMonto(c.monto, moneda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={estilos.subtituloSeccion}>Totales por tarifa de IVA</div>
      {totalesPorTarifa.length === 0 ? (
        <p style={estilos.sinDatos}>Sin compras registradas en este trimestre.</p>
      ) : (
        <table style={estilos.tabla}>
          <thead>
            <tr style={{ backgroundColor: color }}>
              <th style={estilos.th}>Tarifa</th>
              <th style={{ ...estilos.th, textAlign: 'right' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {totalesPorTarifa.map((t, i) => (
              <tr key={t.tarifa} style={i % 2 ? estilos.filaAlterna : undefined}>
                <td style={estilos.td}>{t.tarifa}%</td>
                <td style={estilos.tdDer}>{formatearMonto(t.monto, moneda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={estilos.subtituloSeccion}>Totales por proveedor</div>
      {totalesPorProveedor.length === 0 ? (
        <p style={estilos.sinDatos}>Sin compras registradas en este trimestre.</p>
      ) : (
        <table style={estilos.tabla}>
          <thead>
            <tr style={{ backgroundColor: color }}>
              <th style={estilos.th}>Proveedor</th>
              <th style={{ ...estilos.th, textAlign: 'right' }}>Monto</th>
            </tr>
          </thead>
          <tbody>
            {totalesPorProveedor.map((p, i) => (
              <tr key={p.proveedor} style={i % 2 ? estilos.filaAlterna : undefined}>
                <td style={estilos.td}>{p.proveedor}</td>
                <td style={estilos.tdDer}>{formatearMonto(p.monto, moneda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={estilos.subtituloSeccion}>Respaldo documental</div>
      <table style={estilos.tabla}>
        <thead>
          <tr style={{ backgroundColor: '#787878' }}>
            <th style={estilos.th}>Concepto</th>
            <th style={{ ...estilos.th, textAlign: 'right' }}>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={estilos.td}>Compras registradas</td><td style={estilos.tdDer}>{cantidadCompras}</td></tr>
          <tr style={estilos.filaAlterna}><td style={estilos.td}>Compras con fotografía del comprobante</td><td style={estilos.tdDer}>{conFoto}</td></tr>
          <tr><td style={estilos.td}>Compras sin respaldo digital</td><td style={estilos.tdDer}>{sinFoto}</td></tr>
        </tbody>
      </table>

      <div style={{ ...estilos.subtituloSeccion, marginTop: '24px' }}>Detalle de compras</div>
      {detalle.length === 0 ? (
        <p style={estilos.sinDatos}>Sin compras registradas en este trimestre.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ ...estilos.tabla, minWidth: 640 }}>
            <thead>
              <tr style={{ backgroundColor: color }}>
                <th style={estilos.th}>Fecha</th>
                <th style={estilos.th}>Proveedor</th>
                <th style={estilos.th}>N.° de comprobante</th>
                <th style={estilos.th}>Categoría</th>
                <th style={{ ...estilos.th, textAlign: 'right' }}>Tarifa IVA</th>
                <th style={{ ...estilos.th, textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {detalle.map((d, i) => (
                <tr key={i} style={i % 2 ? estilos.filaAlterna : undefined}>
                  <td style={estilos.td}>{formatearFecha(d.fecha)}</td>
                  <td style={estilos.td}>{d.proveedor || '—'}</td>
                  <td style={estilos.td}>{d.numero_comprobante || '—'}</td>
                  <td style={estilos.td}>{d.categoria}</td>
                  <td style={estilos.tdDer}>{d.tarifa_iva != null ? `${d.tarifa_iva}%` : '—'}</td>
                  <td style={estilos.tdDer}>{formatearMonto(d.monto, moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Estilos ───────────────────────────────────────────────
const estilos = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 60,
    background: '#f4f4f6',
    display: 'flex', flexDirection: 'column',
  },
  barraSuperior: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
    background: '#fff', borderBottom: '1px solid #e5e5e5',
    flexShrink: 0,
  },
  botonVolver: {
    background: 'none', border: 'none', fontSize: '14px', color: '#2E75B6', fontWeight: 600, cursor: 'pointer',
  },
  barraTitulo: { fontSize: '14px', fontWeight: 700, color: '#333' },
  contenedorScroll: {
    flex: 1, overflowY: 'auto', padding: '14px',
  },
  hoja: {
    background: '#fff', borderRadius: '10px', padding: '18px',
    maxWidth: '760px', margin: '0 auto',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  encabezado: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' },
  encabezadoIzq: { display: 'flex', alignItems: 'center', gap: '10px' },
  logo: { width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' },
  nombreNegocio: { fontSize: '15px', fontWeight: 700, color: '#1a1a2e' },
  nombrePropietario: { fontSize: '11px', color: '#888' },
  encabezadoDer: { textAlign: 'right' },
  tituloReporte: { fontSize: '18px', fontWeight: 700 },
  subtituloReporte: { fontSize: '11px', color: '#888' },
  linea: { borderBottom: '2px solid', margin: '10px 0 16px' },
  infoTrimestre: { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: '#555', marginBottom: '12px' },
  sinDatos: { fontSize: '12px', color: '#999', fontStyle: 'italic', margin: '4px 0 8px' },
  subtituloSeccion: { fontSize: '12px', fontWeight: 700, color: '#555', margin: '18px 0 6px' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th: { padding: '8px 10px', textAlign: 'left', color: '#fff', fontSize: '11px' },
  td: { padding: '7px 10px', borderBottom: '1px solid #eee' },
  tdDer: { padding: '7px 10px', borderBottom: '1px solid #eee', textAlign: 'right' },
  filaAlterna: { backgroundColor: '#f7f7f9' },
  filaTotal: { backgroundColor: '#e6e6e6' },
  pie: { fontSize: '9px', color: '#aaa', textAlign: 'center', marginTop: '20px' },
  barraAcciones: {
    display: 'flex', gap: '10px', padding: '12px 14px',
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    background: '#fff', borderTop: '1px solid #e5e5e5', flexShrink: 0,
  },
  botonSecundario: {
    flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd',
    background: '#fff', color: '#333', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  },
  botonPrimario: {
    flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
    color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  },
};

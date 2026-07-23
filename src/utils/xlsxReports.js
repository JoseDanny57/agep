// src/utils/xlsxReports.js
// AGEP — Exportación a Excel (.xlsx) de reportes, usando SheetJS (xlsx)

import * as XLSX from 'xlsx';
import { formatearMonto } from './pdfReports';

// ─────────────────────────────────────────────
// Reporte Tributario Trimestral — Régimen Simplificado
// ─────────────────────────────────────────────
export function generarReporteTributarioExcel(datos) {
  const {
    perfil,
    trimestreLabel,
    fechaEmision,
    fechaLimite,
    declarado,
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

  const moneda = perfil?.moneda || 'CRC';

  const resumenFilas = [
    ['Reporte Tributario Trimestral – Régimen Simplificado'],
    [],
    ['Nombre del negocio', perfil?.nombre_negocio || ''],
    ['Propietario', perfil?.nombre_propietario || ''],
    ['Actividad económica', perfil?.actividad_economica || ''],
    ['Trimestre', trimestreLabel],
    ['Fecha de emisión', fechaEmision],
    ['Fecha límite de declaración', fechaLimite ? new Date(fechaLimite + 'T12:00:00').toLocaleDateString('es-CR') : '—'],
    ['Estado', declarado ? 'Declarado' : 'Pendiente'],
    [],
    ['Resumen del trimestre'],
    ['Compras del trimestre', formatearMonto(totalCompras, moneda)],
    ['Cantidad de compras', cantidadCompras],
    ['Proveedores diferentes', proveedoresDistintos],
    ['Compra promedio', formatearMonto(compraPromedio, moneda)],
    [],
    ['Totales por categoría'],
    ['Categoría', 'Monto'],
    ...(totalesPorCategoria.length
      ? totalesPorCategoria.map((c) => [c.nombre, formatearMonto(c.monto, moneda)])
      : [['Sin compras registradas en este trimestre', '']]),
    [],
    ['Totales por tarifa de IVA'],
    ['Tarifa', 'Monto'],
    ...(totalesPorTarifa.length
      ? totalesPorTarifa.map((t) => [`${t.tarifa}%`, formatearMonto(t.monto, moneda)])
      : [['Sin compras registradas en este trimestre', '']]),
    [],
    ['Totales por proveedor'],
    ['Proveedor', 'Monto'],
    ...(totalesPorProveedor.length
      ? totalesPorProveedor.map((p) => [p.proveedor, formatearMonto(p.monto, moneda)])
      : [['Sin compras registradas en este trimestre', '']]),
    [],
    ['Respaldo documental'],
    ['Compras registradas', cantidadCompras],
    ['Compras con fotografía del comprobante', conFoto],
    ['Compras sin respaldo digital', sinFoto],
  ];

  const detalleFilas = [
    ['Fecha', 'Proveedor', 'N.° de comprobante', 'Categoría', 'Tarifa IVA', 'Monto'],
    ...detalle.map((d) => [
      d.fecha ? new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CR') : '—',
      d.proveedor || '—',
      d.numero_comprobante || '—',
      d.categoria || '—',
      d.tarifa_iva != null ? `${d.tarifa_iva}%` : '—',
      Number(d.monto || 0),
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenFilas);
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleFilas);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');

  XLSX.writeFile(wb, `Reporte_Tributario_${trimestreLabel.replace(/\s+/g, '_')}.xlsx`);
}

// src/utils/pdfReports.js
// AGEP v4 — Generacion de Reportes PDF (100% cliente, sin backend)
// Requiere: npm install jspdf jspdf-autotable

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ---------- Helpers ----------

export const formatearMonto = (monto, moneda = 'CRC') => {
  const num = Number(monto || 0);
  const simbolo = moneda === 'USD' ? '$' : '¢';
  return `${simbolo}${num.toLocaleString('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Convierte una etiqueta (posiblemente con espacios, paréntesis o barras) en un nombre de archivo seguro
export const sanitizarNombreArchivo = (texto) =>
  texto.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const nombreMes = (fecha) => `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;

export const hexToRgb = (hex) => {
  const clean = (hex || '2E75B6').replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

async function logoABase64(logoUrl) {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function dibujarEncabezado(doc, perfil, titulo, subtitulo) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const color = hexToRgb(perfil?.color_principal);
  let cursorY = 15;

  if (perfil?.logo_url) {
    const logoBase64 = await logoABase64(perfil.logo_url);
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'JPEG', 14, 10, 18, 18);
      } catch {
        // continuar sin logo
      }
    }
  }

  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(perfil?.nombre_negocio || 'Mi Negocio', 38, cursorY);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100);
  doc.text(perfil?.nombre_propietario || '', 38, cursorY + 5);

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...color);
  doc.text(titulo, pageWidth - 14, cursorY - 2, { align: 'right' });

  if (subtitulo) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80);
    doc.text(subtitulo, pageWidth - 14, cursorY + 6, { align: 'right' });
  }

  cursorY = 32;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  doc.line(14, cursorY, pageWidth - 14, cursorY);
  doc.setTextColor(0);

  return cursorY + 8;
}

function dibujarPie(doc) {
  const total = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(160);
    doc.text(`Generado con AGEP • ${new Date().toLocaleDateString('es-CR')}`, 14, pageHeight - 8);
    doc.text(`${i} / ${total}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
  doc.setTextColor(0);
}

// ─────────────────────────────────────────────
// 1. ESTADO DE RESULTADOS MENSUAL
// ─────────────────────────────────────────────
export async function generarEstadoResultados(datos) {
  const {
    perfil,
    fechaMes,
    ingresos = 0,
    gastosOperativos = 0,
    gastosMaterial = 0,
    gastosActivo = 0,
    gastosRetiro = 0,
    detalleIngresos = [],
    detalleGastos = [],
  } = datos;

  const moneda = perfil?.moneda || 'CRC';
  const color = hexToRgb(perfil?.color_principal);
  const utilidad = ingresos - gastosOperativos;
  const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;
  const doc = new jsPDF();

  let y = await dibujarEncabezado(doc, perfil, 'Estado de Resultados', nombreMes(fechaMes));

  doc.autoTable({
    startY: y,
    head: [['Concepto', 'Monto']],
    body: [
      ['Ingresos del mes', formatearMonto(ingresos, moneda)],
      ['Gastos operativos', formatearMonto(gastosOperativos, moneda)],
      ['Utilidad neta', formatearMonto(utilidad, moneda)],
      ['Margen de utilidad', `${margen.toFixed(1)}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: color, fontStyle: 'bold', fontSize: 10 },
    styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 2 && data.column.index === 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = utilidad >= 0 ? [0, 130, 60] : [180, 30, 30];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(80);
  doc.text('Movimientos informativos (no afectan la utilidad)', 14, y);
  y += 3;

  doc.autoTable({
    startY: y,
    head: [['Tipo', 'Monto']],
    body: [
      ['Compras de material', formatearMonto(gastosMaterial, moneda)],
      ['Compra de activos', formatearMonto(gastosActivo, moneda)],
      ['Retiros del propietario', formatearMonto(gastosRetiro, moneda)],
    ],
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [120, 120, 120], fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
  });

  y = doc.lastAutoTable.finalY + 10;

  if (detalleIngresos.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text('Detalle de Ingresos', 14, y);
    y += 3;
    doc.autoTable({
      startY: y,
      head: [['Fecha', 'Descripción', 'Monto']],
      body: detalleIngresos.map((r) => [
        new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CR'),
        r.descripcion,
        formatearMonto(r.monto, moneda),
      ]),
      theme: 'striped',
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: color, fontSize: 9 },
      columnStyles: { 2: { halign: 'right' } },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  const operativos = detalleGastos.filter((g) => g.tipo === 'operativo');
  if (operativos.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 50) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(40);
    doc.text('Detalle de Gastos Operativos', 14, y);
    y += 3;
    doc.autoTable({
      startY: y,
      head: [['Fecha', 'Descripción', 'Monto']],
      body: operativos.map((r) => [
        new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CR'),
        r.descripcion,
        formatearMonto(r.monto, moneda),
      ]),
      theme: 'striped',
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: color, fontSize: 9 },
      columnStyles: { 2: { halign: 'right' } },
    });
  }

  dibujarPie(doc);
  doc.save(`Estado_Resultados_${nombreMes(fechaMes).replace(' ', '_')}.pdf`);
}

// ─────────────────────────────────────────────
// 2. REPORTE DE PEDIDOS
// ─────────────────────────────────────────────
export async function generarReportePedidos({ perfil, pedidos = [], filtroEstado = 'todos' }) {
  const moneda = perfil?.moneda || 'CRC';
  const color = hexToRgb(perfil?.color_principal);
  const doc = new jsPDF({ orientation: 'landscape' });

  const lista =
    filtroEstado === 'todos' ? pedidos : pedidos.filter((p) => p.estado === filtroEstado);

  const subtitulo =
    filtroEstado === 'todos' ? 'Todos los pedidos' : `Estado: ${filtroEstado}`;

  let y = await dibujarEncabezado(doc, perfil, 'Reporte de Pedidos', subtitulo);

  const totalVenta = lista.reduce((acc, p) => acc + Number(p.precio_venta || 0), 0);
  const totalCosto = lista.reduce((acc, p) => acc + Number(p.costoMateriales || 0), 0);
  const totalGanancia = totalVenta - totalCosto;

  const estadoEtiqueta = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    entregado: 'Entregado',
    cobrado: 'Cobrado',
  };

  doc.autoTable({
    startY: y,
    head: [['Cliente', 'Descripción', 'Entrega', 'Precio venta', 'Costo mat.', 'Ganancia', 'Estado']],
    body: lista.map((p) => [
      p.cliente,
      p.descripcion,
      p.fecha_entrega ? new Date(p.fecha_entrega + 'T12:00:00').toLocaleDateString('es-CR') : '—',
      formatearMonto(p.precio_venta, moneda),
      formatearMonto(p.costoMateriales || 0, moneda),
      formatearMonto((p.precio_venta || 0) - (p.costoMateriales || 0), moneda),
      estadoEtiqueta[p.estado] || p.estado,
    ]),
    foot: [
      ['', '', 'Totales',
        formatearMonto(totalVenta, moneda),
        formatearMonto(totalCosto, moneda),
        formatearMonto(totalGanancia, moneda),
        '',
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: color, fontStyle: 'bold' },
    footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const fila = lista[data.row.index];
        const ganancia = (fila?.precio_venta || 0) - (fila?.costoMateriales || 0);
        data.cell.styles.textColor = ganancia >= 0 ? [0, 130, 60] : [180, 30, 30];
      }
    },
  });

  dibujarPie(doc);
  doc.save('Reporte_Pedidos.pdf');
}

// ─────────────────────────────────────────────
// 3. REPORTE DE INVENTARIO
// ─────────────────────────────────────────────
export async function generarReporteInventario({ perfil, materiales = [] }) {
  const moneda = perfil?.moneda || 'CRC';
  const color = hexToRgb(perfil?.color_principal);
  const doc = new jsPDF();

  const bajoMinimo = materiales.filter(
    (m) => Number(m.stock_actual) < Number(m.stock_minimo)
  ).length;

  let y = await dibujarEncabezado(
    doc,
    perfil,
    'Reporte de Inventario',
    bajoMinimo > 0
      ? `${bajoMinimo} material${bajoMinimo > 1 ? 'es' : ''} bajo stock minimo`
      : 'Inventario al dia'
  );

  const valorTotal = materiales.reduce(
    (acc, m) => acc + Number(m.costo_unitario || 0) * Number(m.stock_actual || 0),
    0
  );

  doc.autoTable({
    startY: y,
    head: [['Material', 'Unidad', 'Costo unit.', 'Stock actual', 'Stock min.', 'Valor en stock']],
    body: materiales.map((m) => [
      m.nombre,
      m.unidad,
      formatearMonto(m.costo_unitario, moneda),
      m.stock_actual,
      m.stock_minimo,
      formatearMonto(Number(m.costo_unitario || 0) * Number(m.stock_actual || 0), moneda),
    ]),
    foot: [['', '', '', '', 'Valor total:', formatearMonto(valorTotal, moneda)]],
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: color, fontStyle: 'bold' },
    footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const fila = materiales[data.row.index];
        if (fila && Number(fila.stock_actual) < Number(fila.stock_minimo)) {
          data.cell.styles.textColor = [180, 30, 30];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  dibujarPie(doc);
  doc.save('Reporte_Inventario.pdf');
}

// ─────────────────────────────────────────────
// 4. REPORTE TRIBUTARIO TRIMESTRAL — RÉGIMEN SIMPLIFICADO
// ─────────────────────────────────────────────
export async function generarReporteTributario(datos) {
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
  const color = hexToRgb(perfil?.color_principal);
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = await dibujarEncabezado(doc, perfil, 'Reporte Tributario Trimestral', trimestreLabel);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(80);
  doc.text(`Actividad económica: ${perfil?.actividad_economica || '—'}`, 14, y);
  doc.text(`Fecha de emisión: ${fechaEmision}`, 14, y + 5);
  doc.text(
    `Fecha límite de declaración: ${fechaLimite ? new Date(fechaLimite + 'T12:00:00').toLocaleDateString('es-CR') : '—'}`,
    14,
    y + 10
  );
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...(declarado ? [0, 130, 60] : [148, 108, 0]));
  doc.text(`Estado: ${declarado ? 'Declarado' : 'Pendiente'}`, 14, y + 15);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(0);
  y += 22;

  doc.autoTable({
    startY: y,
    head: [['Resumen del trimestre', '']],
    body: [
      ['Compras del trimestre', formatearMonto(totalCompras, moneda)],
      ['Cantidad de compras', String(cantidadCompras)],
      ['Proveedores diferentes', String(proveedoresDistintos)],
      ['Compra promedio', formatearMonto(compraPromedio, moneda)],
    ],
    theme: 'grid',
    headStyles: { fillColor: color, fontStyle: 'bold', fontSize: 10 },
    styles: { fontSize: 9.5 },
    columnStyles: { 1: { halign: 'right' } },
  });
  y = doc.lastAutoTable.finalY + 10;

  const seccion = (titulo, head, body) => {
    if (y > pageHeight - 50) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(80);
    doc.text(titulo, 14, y);
    y += 3;
    doc.autoTable({
      startY: y,
      head: [head],
      body,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: color, fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
    });
    y = doc.lastAutoTable.finalY + 10;
  };

  seccion(
    'Totales por categoría',
    ['Categoría', 'Monto'],
    totalesPorCategoria.length
      ? totalesPorCategoria.map((c) => [c.nombre, formatearMonto(c.monto, moneda)])
      : [['Sin compras registradas en este trimestre', '']]
  );

  seccion(
    'Totales por tarifa de IVA',
    ['Tarifa', 'Monto'],
    totalesPorTarifa.length
      ? totalesPorTarifa.map((t) => [`${t.tarifa}%`, formatearMonto(t.monto, moneda)])
      : [['Sin compras registradas en este trimestre', '']]
  );

  seccion(
    'Totales por proveedor',
    ['Proveedor', 'Monto'],
    totalesPorProveedor.length
      ? totalesPorProveedor.map((p) => [p.proveedor, formatearMonto(p.monto, moneda)])
      : [['Sin compras registradas en este trimestre', '']]
  );

  seccion(
    'Respaldo documental',
    ['Concepto', 'Cantidad'],
    [
      ['Compras registradas', String(cantidadCompras)],
      ['Compras con fotografía del comprobante', String(conFoto)],
      ['Compras sin respaldo digital', String(sinFoto)],
    ]
  );

  // ── Detalle (segunda sección) ──
  doc.addPage();
  y = 20;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(40);
  doc.text('Detalle de Compras', 14, y);
  y += 5;

  doc.autoTable({
    startY: y,
    head: [['Fecha', 'Proveedor', 'N.° de comprobante', 'Categoría', 'Tarifa IVA', 'Monto']],
    body: detalle.length
      ? detalle.map((d) => [
          d.fecha ? new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CR') : '—',
          d.proveedor || '—',
          d.numero_comprobante || '—',
          d.categoria || '—',
          d.tarifa_iva != null ? `${d.tarifa_iva}%` : '—',
          formatearMonto(d.monto, moneda),
        ])
      : [['—', 'Sin compras registradas en este trimestre', '—', '—', '—', '—']],
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: color, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: { 5: { halign: 'right' } },
  });

  dibujarPie(doc);
  doc.save(`Reporte_Tributario_${sanitizarNombreArchivo(trimestreLabel)}.pdf`);
}

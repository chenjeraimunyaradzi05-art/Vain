import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

interface Metric {
  metric: string;
  period: string;
  value: number;
  recordedAt?: Date | string | null;
  cohortId?: string | null;
  metadata?: any;
}

interface ExportRow {
  metric: string;
  period: string;
  value: number;
  recordedAt: string;
  cohortId: string;
  metadata: string;
}

function toRowsForMetrics(metrics: Metric[]): ExportRow[] {
  return metrics.map((m) => ({
    metric: m.metric,
    period: m.period,
    value: m.value,
    recordedAt: m.recordedAt ? new Date(m.recordedAt).toISOString() : '',
    cohortId: m.cohortId || '',
    metadata: m.metadata ? JSON.stringify(m.metadata) : '',
  }));
}

function exportCsv(rows: ExportRow[]): Buffer {
  const header = ['metric', 'period', 'value', 'recordedAt', 'cohortId', 'metadata'];
  const escape = (v: any) => `"${String(v ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`;
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(header.map((k) => escape((r as any)[k])).join(','));
  }
  return Buffer.from(lines.join('\n'), 'utf8');
}

async function exportXlsx(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Impact Metrics');

  sheet.columns = [
    { header: 'Metric', key: 'metric', width: 22 },
    { header: 'Period', key: 'period', width: 12 },
    { header: 'Value', key: 'value', width: 12 },
    { header: 'Recorded At', key: 'recordedAt', width: 24 },
    { header: 'Cohort ID', key: 'cohortId', width: 20 },
    { header: 'Metadata', key: 'metadata', width: 40 },
  ];

  rows.forEach((r) => sheet.addRow(r));
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function exportPdf({ title, rows }: { title?: string; rows: ExportRow[] }): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', (d: any) => chunks.push(d));

  doc.fontSize(18).text(title || 'Impact Report', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown(1);
  doc.fillColor('#000');

  doc.fontSize(11).text('Metrics', { underline: true });
  doc.moveDown(0.5);

  // Simple table-like layout (no fancy drawing to keep it robust).
  for (const r of rows.slice(0, 200)) {
    doc
      .fontSize(10)
      .text(`${r.metric} | ${r.period} | ${r.value} | ${r.recordedAt}${r.cohortId ? ` | cohort:${r.cohortId}` : ''}`);
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Export impact metrics in the requested format.
 */
export async function exportImpactMetrics(format: string, metrics: Metric[]) {
  const rows = toRowsForMetrics(metrics);

  const f = String(format || 'csv').toLowerCase();
  if (f === 'csv') {
    return {
      contentType: 'text/csv',
      fileExt: 'csv',
      buffer: exportCsv(rows),
    };
  }
  if (f === 'xlsx') {
    return {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileExt: 'xlsx',
      buffer: await exportXlsx(rows),
    };
  }
  if (f === 'pdf') {
    return {
      contentType: 'application/pdf',
      fileExt: 'pdf',
      buffer: await exportPdf({ title: 'Impact Metrics Report', rows }),
    };
  }

  const err: any = new Error('Unsupported export format');
  err.statusCode = 400;
  throw err;
}


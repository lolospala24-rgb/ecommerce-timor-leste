import * as ExcelJS from 'exceljs';
// Explicit import, not the ambient global: exceljs's own typings declare a
// top-level `interface Buffer extends ArrayBuffer {}` that merges with (and
// structurally conflicts with) Node's real global Buffer type. Importing
// the class directly from 'buffer' shadows that pollution within this file.
import { Buffer } from 'buffer';

export interface ExportColumn {
  key: string;
  header: string;
}

// RFC 4180-ish escaping: wrap in quotes and double up any embedded quotes
// whenever the field contains a comma, quote, or newline that would
// otherwise corrupt the column structure.
function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(rows: Record<string, unknown>[], columns: ExportColumn[]): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsvField(row[c.key])).join(','));
  return [header, ...lines].join('\r\n');
}

// Return type is NodeJS.Buffer (not the bare `Buffer` identifier) because
// exceljs's own typings declare a global `interface Buffer extends
// ArrayBuffer {}` that merges with — and structurally conflicts with —
// Node's real Buffer type. Wrapping the result in Buffer.from(...) here
// means every caller gets an unambiguous, genuine Node Buffer regardless
// of what exceljs's writeBuffer() is typed (or mistyped) as.
export async function rowsToExcelBuffer(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  sheetName: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31)); // Excel sheet-name length limit
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw as ArrayBuffer);
}

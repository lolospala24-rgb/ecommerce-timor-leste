import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

// Reuses the same exceljs dependency export.util.ts already relies on for
// CSV/Excel generation — no new parsing library needed. Accepts either a
// .csv or .xlsx upload (sellers who prefer Excel don't need to re-save as
// CSV first) and returns plain row objects keyed by the header row, so
// callers never deal with column-index bookkeeping.
export async function parseSpreadsheetRows(
  buffer: Buffer,
  filename: string,
): Promise<Record<string, string>[]> {
  const isCsv = filename.toLowerCase().endsWith('.csv');
  const workbook = new ExcelJS.Workbook();

  if (isCsv) {
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.load(buffer as any);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim();
  });

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    // A fully blank row (common trailing row in spreadsheet exports) has
    // no meaningful data to import — skip it rather than reporting it as
    // a row with every required field "missing".
    const isBlank = row.values == null || (Array.isArray(row.values) && row.values.every((v) => v == null || v === ''));
    if (isBlank) return;

    const record: Record<string, string> = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      record[header] = String(cell.value ?? '').trim();
    });
    rows.push(record);
  });

  return rows;
}

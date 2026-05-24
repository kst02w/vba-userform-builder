/**
 * Read an uploaded .xlsx/.xls/.csv File into our WorkbookData structure.
 * Uses the SheetJS (`xlsx`) library. Runs fully client-side.
 */
import * as XLSX from 'xlsx'
import type { SheetData, WorkbookData } from '../types/project'

const PREVIEW_ROWS = 10

export async function parseWorkbookFile(file: File): Promise<WorkbookData> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: false })

  const sheets: SheetData[] = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]
    if (!ws) {
      return { name, headers: [], previewRows: [], rowCount: 0 }
    }
    // header: 1 → first row becomes header strings; values become array of arrays
    const aoa: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(
      ws,
      { header: 1, defval: null, blankrows: false, raw: true },
    )
    const headerRow = (aoa[0] ?? []).map((v) =>
      v === null || v === undefined ? '' : String(v),
    )
    const dataRows = aoa.slice(1)
    return {
      name,
      headers: headerRow,
      previewRows: dataRows.slice(0, PREVIEW_ROWS),
      rowCount: dataRows.length,
    }
  })

  return {
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
    sheets,
  }
}

/**
 * Excel column letter from 0-based index (0 → "A", 25 → "Z", 26 → "AA").
 */
export function colIndexToLetter(index: number): string {
  let n = index + 1
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Quote a sheet name for VBA Range references when it contains spaces/special chars. */
export function quoteSheetName(name: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return name
  return `'${name.replace(/'/g, "''")}'`
}

/**
 * Conversion helpers between Builder pixel/RGB units and VBA persistence units
 * (twips / OLE_COLOR / Booleans).
 */

/** Twips per pixel at 96 DPI: 1440 / 96 = 15. */
export const TWIPS_PER_PX = 15

export function pxToTwips(px: number): number {
  return Math.round(px * TWIPS_PER_PX)
}

/**
 * Convert "#RRGGBB" or "transparent" to a VBA OLE_COLOR literal (e.g., &H80000005&).
 * Uses 0x80000000 to indicate "system color" fallback when transparent.
 */
export function hexToOleColor(hex: string | undefined): string {
  if (!hex || hex === 'transparent') {
    // BUTTON FACE system color
    return '&H8000000F&'
  }
  const m = hex.match(/^#([0-9a-f]{6})$/i)
  if (!m) return '&H00000000&'
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  // OLE_COLOR is 0x00BBGGRR
  const v = (b << 16) | (g << 8) | r
  return `&H00${v.toString(16).toUpperCase().padStart(6, '0')}&`
}

export function vbaBool(b: boolean | undefined): string {
  return b ? "-1  'True" : "0  'False"
}

export function escapeVbaString(s: string): string {
  return '"' + (s ?? '').replace(/"/g, '""') + '"'
}

/** Indent helper for nested form blocks. */
export function indent(level: number, ...lines: string[]): string {
  const pad = '   '.repeat(level)
  return lines.map((l) => pad + l).join('\r\n')
}

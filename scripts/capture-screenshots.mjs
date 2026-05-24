/**
 * Capture screenshots for MANUAL.md.
 * Assumes the dev server is running at http://localhost:5180/vba-userform-builder/
 *
 * Run with:
 *   npm run dev   (in one shell)
 *   node scripts/capture-screenshots.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'docs', 'images')
mkdirSync(outDir, { recursive: true })

// Generate a tiny sample workbook so we can demo the workbook section.
function makeSampleXlsx() {
  const wb = XLSX.utils.book_new()
  const masters = XLSX.utils.aoa_to_sheet([
    ['商品名', '単価'],
    ['商品A', 1000],
    ['商品B', 2500],
    ['商品C', 800],
    ['商品D', 4200],
  ])
  XLSX.utils.book_append_sheet(wb, masters, 'Masters')
  const orders = XLSX.utils.aoa_to_sheet([['日付', '顧客名', '商品', '数量', '備考']])
  XLSX.utils.book_append_sheet(wb, orders, 'Orders')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const p = resolve(tmpdir(), 'sample-orders.xlsx')
  writeFileSync(p, buf)
  return p
}

const BASE = 'http://localhost:5180/vba-userform-builder/'

const shots = []

async function shot(page, name, opts = {}) {
  const path = resolve(outDir, name)
  await page.screenshot({ path, fullPage: opts.fullPage ?? false })
  console.log('  →', name)
  shots.push(name)
}

/** Close any open .fixed.inset-0 modal by clicking its header close button. */
async function closeAnyModal(page) {
  // The X button in modals is inside the header — it's the last button in the header row
  // Selector: the first button in the modal's header that contains the X icon (lucide X)
  const closed = await page.evaluate(() => {
    const overlay = document.querySelector('div.fixed.inset-0')
    if (!overlay) return false
    // Find a button with an SVG (the X icon)
    const btns = overlay.querySelectorAll('header button, button')
    for (const b of btns) {
      // Buttons with class 'rounded p-1' tend to be the X close button
      if (b.className.includes('rounded') && b.className.includes('p-1') && b.querySelector('svg')) {
        b.click()
        return true
      }
    }
    return false
  })
  if (!closed) {
    // Fallback: click outside the modal
    await page.mouse.click(10, 10)
  }
}

async function clearStorage(page) {
  await page.evaluate(async () => {
    try {
      const dbs = await indexedDB.databases?.()
      if (dbs) for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name)
    } catch {}
    try { localStorage.clear() } catch {}
    try { sessionStorage.clear() } catch {}
  })
  await page.reload({ waitUntil: 'networkidle' })
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 800 },
    deviceScaleFactor: 1.5,
    locale: 'ja-JP',
  })
  const page = await ctx.newPage()

  console.log('Opening', BASE)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await clearStorage(page)
  await page.waitForTimeout(500)

  // ---------- 1. Empty / initial state ----------
  console.log('Empty state')
  await shot(page, '01-overview-empty.png')

  // ---------- 2. Place some controls via drag (use the store directly for reliability) ----------
  console.log('Seeding controls via store')
  await page.evaluate(() => {
    // No direct global access — instead simulate via the template picker which we know works.
  })

  // Use template picker → 顧客登録フォーム
  console.log('Open template picker')
  await page.click('button[title="テンプレートから新規"]')
  await page.waitForTimeout(300)
  await shot(page, '02-template-picker.png')

  console.log('Pick customer template')
  await page.click('text=顧客登録フォーム')
  await page.waitForTimeout(500)
  await shot(page, '03-designer-with-template.png')

  // ---------- 4. Select a control to show properties panel ----------
  console.log('Click on a control')
  // Click on the txtName-like first text input area (around top-left of the form)
  // Find any control element on canvas and click
  const ctrlHandle = await page.$('div[style*="position: absolute"][style*="cursor: move"]')
  if (ctrlHandle) {
    await ctrlHandle.click({ position: { x: 5, y: 5 } })
    await page.waitForTimeout(200)
  }
  await shot(page, '04-properties-panel.png')

  // ---------- 5. Code view ----------
  console.log('Switch to code view')
  await page.keyboard.press('F7')
  // Wait for Monaco to fully load (lazy loader fetches from CDN)
  await page.waitForSelector('.monaco-editor', { timeout: 30000 })
  await page.waitForTimeout(2500)
  // Click on frmCustomer in the form list so we see the template's code
  const frmBtn = await page.$('button:has-text("frmCustomer")')
  if (frmBtn) {
    await frmBtn.click()
    await page.waitForTimeout(800)
  }
  await shot(page, '05-code-editor.png')

  // ---------- 6. Back to designer ----------
  console.log('Back to designer')
  await page.keyboard.press('Shift+F7')
  await page.waitForTimeout(300)

  // ---------- 7. Open export menu ----------
  console.log('Open export menu')
  await page.click('button:has-text("エクスポート")')
  await page.waitForTimeout(300)
  await shot(page, '06-export-menu.png')
  // close menu
  await page.keyboard.press('Escape')
  await page.mouse.click(20, 20)
  await page.waitForTimeout(200)

  // ---------- 8. Help dialog (from footer) ----------
  console.log('Open help dialog')
  await page.click('button[title="ヘルプ"]')
  await page.waitForTimeout(300)
  await shot(page, '07-help-dialog.png')
  await closeAnyModal(page)
  await page.waitForTimeout(300)

  // ---------- 9. Preview modal ----------
  console.log('Open preview')
  await page.click('button:has-text("プレビュー")')
  await page.waitForTimeout(800)
  await shot(page, '08-preview-modal.png')
  await closeAnyModal(page)
  await page.waitForTimeout(300)

  // ---------- 10. AI dialog (without sending) ----------
  console.log('Open AI dialog')
  await page.click('button:has-text("AI生成")')
  await page.waitForTimeout(300)
  await shot(page, '09-ai-dialog.png')
  // Close modal by clicking the X (modals don't bind Escape)
  await closeAnyModal(page)
  await page.waitForTimeout(300)

  // ---------- 11. Workbook upload + mapping ----------
  console.log('Upload sample workbook')
  const samplePath = makeSampleXlsx()
  const fileInput = await page.$('input[type="file"][accept*=".xlsx"]')
  if (fileInput) {
    await fileInput.setInputFiles(samplePath)
    await page.waitForTimeout(2500)  // wait for SheetJS parse
    // Wait until WorkbookSection re-renders with sheet list
    await page.waitForSelector('text=sample-orders.xlsx', { timeout: 10000 })
    // WorkbookSection auto-opens the first sheet on upload, but we re-toggle
    // defensively in case it didn't render. We click only if the sheet appears closed.
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('aside button'))
      const target = buttons.find(
        (b) =>
          b.textContent &&
          b.textContent.includes('Masters') &&
          b.textContent.includes('行'),
      )
      if (!target) return
      // ChevronDown svg has class 'lucide-chevron-down', ChevronRight has 'lucide-chevron-right'
      const svg = target.querySelector('svg')
      const cls = svg?.getAttribute('class') || ''
      const isClosed = cls.includes('chevron-right')
      if (isClosed) target.click()
    })
    await page.waitForTimeout(800)
    await shot(page, '10-workbook-section.png')

    // Now click the txtName TextBox via direct mouseDown dispatch.
    // The wrapper div has inline style `left: 80px; top: 12px` (txtName position).
    await page.evaluate(() => {
      const draggables = Array.from(
        document.querySelectorAll('div[style*="cursor: move"]'),
      )
      // Find one at left:80px (txtName)
      const target = draggables.find((d) => {
        const s = d.getAttribute('style') || ''
        return /left:\s*80px/.test(s) && /top:\s*12px/.test(s)
      })
      if (target) {
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }
    })
    await page.waitForTimeout(500)
    // Ensure データ連携 section is open (defaults to open per code)
    // Scroll the right panel to bring it into view
    const dataSection = page.locator('button:has-text("データ連携")').first()
    if (await dataSection.count()) {
      await dataSection.scrollIntoViewIfNeeded()
      // If closed (chevron-right), click to open
      const isOpen = await dataSection.evaluate((el) => el.querySelector('svg')?.getAttribute('class')?.includes('lucide-chevron-down'))
      if (!isOpen) await dataSection.click()
    }
    await page.waitForTimeout(400)
    await shot(page, '11-mapping-fields.png')
  }

  console.log('Done.')
  console.log('Saved files:')
  for (const s of shots) console.log('  -', s)

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

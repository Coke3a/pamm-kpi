// DIFFERENTIAL PARITY TEST — proves our React port is behaviourally identical
// to the ORIGINAL summarykpi.netlify.app logic.
//
// Instead of hand-transcribing the original into an assertion, this test
// EXTRACTS the genuine `processCSVData` function straight out of the
// byte-exact reference (reference/original-dashboard.html) and evaluates it,
// then runs BOTH the original and our port over thousands of randomised
// inputs (covering every branch) and asserts bit-for-bit identical output.
//
// If any line of our port ever diverges from the original's behaviour, some
// seed here will catch it. The reference file was verified byte-identical to
// the live https://summarykpi.netlify.app/ source at re-check time.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { processCSVData } from './processCsv'
import { deriveDashboard } from './deriveDashboard'
import type { ProcessedData } from './types'

// ---------------------------------------------------------------------------
// 1. Pull the REAL original processCSVData out of the reference HTML and eval
//    it. No hand-copying — this is the exact code the live site ships.
// ---------------------------------------------------------------------------
const here = dirname(fileURLToPath(import.meta.url))
const refPath = resolve(here, '../../reference/original-dashboard.html')
const html = readFileSync(refPath, 'utf8')

function extractFunction(src: string, signature: string): string {
  const start = src.indexOf(signature)
  if (start === -1) throw new Error(`signature not found: ${signature}`)
  let depth = 0
  let i = src.indexOf('{', start)
  const open = i
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) return src.slice(start, i + 1)
    }
  }
  throw new Error(`unbalanced braces from ${open}`)
}

const originalSource = extractFunction(html, 'function processCSVData(data)')

// eslint-disable-next-line @typescript-eslint/no-implied-eval
const originalProcessCSVData = new Function(
  `${originalSource}\n;return processCSVData;`,
)() as (data: Record<string, string>[]) => ProcessedData

// Sanity: we really extracted the original (contains the Thai warranty regex).
it('extracted the genuine original processCSVData from the reference', () => {
  expect(originalSource).toContain('function processCSVData(data)')
  expect(originalSource).toContain('ประกัน') // Thai chars survived the read
  expect(originalSource).toContain('SUPPORT')
  expect(typeof originalProcessCSVData).toBe('function')
})

// ---------------------------------------------------------------------------
// 2. Faithful re-statement of the ORIGINAL's pure derivation
//    (applyDashboardData, reference lines 303-348 — the computed values, not
//    the DOM/HTML string building). Palette copied verbatim from ref line 192.
// ---------------------------------------------------------------------------
const PALETTE_ORIG = ['#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#EAB308', '#6366F1', '#14B8A6', '#84CC16', '#F43F5E']

function originalDerive(data: ProcessedData) {
  const summary = data.summary
  const staff = data.staff
  const storeTopupRate = summary.salesCount > 0 ? (summary.topupCount / summary.salesCount) * 100 : 0
  const sortedStaff = Object.keys(staff)
    .filter((k) => (staff[k].r > 0 || staff[k].e > 0 || staff[k].v > 0) && k !== 'SUPPORT')
    .sort((a, b) => staff[b].r - staff[a].r)
  let maxTopUpRate = 0
  sortedStaff.forEach((name) => {
    const d = staff[name]
    const tr = d.s > 0 ? (d.t / d.s) * 100 : 0
    if (tr > maxTopUpRate) maxTopUpRate = tr
  })
  const cards = sortedStaff.map((name, index) => {
    const d = staff[name]
    const color = PALETTE_ORIG[index % PALETTE_ORIG.length]
    const tr = d.s > 0 ? (d.t / d.s) * 100 : 0
    let role = 'Senior Sales Staff'
    const checkName = name.toUpperCase()
    if (checkName === 'TROY') role = 'Shop Manager'
    else if (checkName === 'BUDDH' || checkName === 'BUDD') role = 'Assistant Shop Manager'
    const badges = {
      highestSale: index === 0 && d.r > 0,
      topUpMaster: tr === maxTopUpRate && tr > 0,
      voids: d.v,
    }
    return { name, color, tr, role, badges, topLenses: d.topLenses, r: d.r, v: d.v, e: d.e, c: d.c, eg: d.eg, d: d.d, delay: 0.6 + index * 0.1 }
  })
  return { storeTopupRate, sortedNames: sortedStaff, cards }
}

// ---------------------------------------------------------------------------
// 3. Deterministic fuzzer — seeded PRNG so failures are reproducible.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TYPE_COL_NAMES = ['TYPE', 'BILL TYPE', 'DOC TYPE', 'TYPE ']
const TYPE_VALUES = ['VOID', 'void', ' Void ', 'SALE', 'sale', '', 'RETURN', 'N/A', 'EXCHANGE']
const AMOUNTS = ['1234.56', '-500', '0', '', 'abc', '1e3', '  250 ', '99999999', '-0.01', '750', '1200.5', 'NaN']
// NOTE: '-' and 'N/A' are deliberately NOT in the SALE pool. They are the ONE
// SALE input where the port INTENTIONALLY diverges from the original (the
// original crashes on `staff[saleName]`; the port folds them into SUPPORT —
// real-data fix, see constants.ts EXCLUDED_NAMES). That divergence is asserted
// explicitly below ("diverges ON PURPOSE ..."). Keeping them out of the fuzz
// pool is what lets the fuzz prove "byte-identical on every OTHER input".
const SALES = ['', ' ', 'TROY', 'troy', ' Buddh ', 'BUDD', 'Alice', 'BOB', 'น้องเอ', 'Support', 'SUPPORT', 'Carol', 'dave']
const PRODUCT_TOKENS = [
  'EYESL X', '1.67 AS', '1.74 BLUE', 'RX-100', 'EN-T COAT', 'TS FILM', 'PRE-ORDER', 'COMPAL', 'MC2', 'COL1', 'MIRROR', 'PRES-T', 'SIGNATURE', 'ULTIMATE', 'GOLD RING',
  'PLAIN FRAME', 'CASE', 'CLOTH', 'ห้าง', 'GENERIC',
  '[WARRANTY] ประกัน % สาขาที ชื่อ: ZPELL @ FUTURE PARK วันที่ ชื่อ:',
]
const ROLE_NAMES = ['', ' ', '-', 'N/A', 'Alice', 'TROY', 'bob', ' carol ', 'DAVE', 'น้องบี']
const ROLE_COLS = ['EYECHECK', 'CASHIER', 'EDGING', 'DISPENSING'] as const

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function genRow(rng: () => number): Record<string, string> {
  const row: Record<string, string> = {}
  // TYPE column (occasionally two 'TYPE'-containing cols to exercise the
  // Object.keys(...).find(k => k.includes('TYPE')) first-match lookup).
  const typeCol = pick(rng, TYPE_COL_NAMES)
  if (rng() < 0.15) row['SUBTYPE'] = pick(rng, TYPE_VALUES) // another col containing 'TYPE'
  row[typeCol] = pick(rng, TYPE_VALUES)

  row['AMOUNT'] = pick(rng, AMOUNTS)
  row['SALE'] = pick(rng, SALES)

  const nTokens = Math.floor(rng() * 4)
  const tokens: string[] = []
  for (let i = 0; i < nTokens; i++) tokens.push(pick(rng, PRODUCT_TOKENS))
  row['PRODUCT DETAILS'] = tokens.join(', ')

  for (const col of ROLE_COLS) row[col] = pick(rng, ROLE_NAMES)
  return row
}

function genDataset(seed: number): Record<string, string>[] {
  const rng = mulberry32(seed)
  const n = Math.floor(rng() * 31) // 0..30 rows
  const rows: Record<string, string>[] = []
  for (let i = 0; i < n; i++) rows.push(genRow(rng))
  return rows
}

const clone = <T>(v: T): T => structuredClone(v)

// Run a fn, capturing either its value or the fact that it threw. Lets us
// assert that port and original agree even when the ORIGINAL itself throws.
function attempt<T>(fn: () => T): { ok: true; value: T } | { ok: false; error: unknown } {
  try {
    return { ok: true, value: fn() }
  } catch (error) {
    return { ok: false, error }
  }
}

// ---------------------------------------------------------------------------
// 4. The differential runs.
// ---------------------------------------------------------------------------
describe('port === original (differential fuzz)', () => {
  const RUNS = 4000

  it(`processCSVData matches the original across ${RUNS} randomised datasets`, () => {
    // branch-coverage counters — prove the fuzz actually hit every path
    const cov = { rows: 0, voids: 0, topups: 0, warranty: 0, support: 0, mgr: 0, neg: 0, nanAmt: 0, lensRows: 0 }

    for (let seed = 1; seed <= RUNS; seed++) {
      const rows = genDataset(seed)
      const mineRun = attempt(() => processCSVData(clone(rows)))
      const origRun = attempt(() => originalProcessCSVData(clone(rows)))

      // Both must succeed or both must throw — never one and not the other.
      expect(mineRun.ok, `port ${mineRun.ok ? 'ok' : 'threw'} but original ${origRun.ok ? 'ok' : 'threw'} at seed=${seed}`).toBe(origRun.ok)
      if (!mineRun.ok || !origRun.ok) continue

      const mine = mineRun.value
      const orig = origRun.value
      expect(mine, `processCSVData diverged at seed=${seed}`).toEqual(orig)

      // accumulate coverage from the authoritative original output
      cov.rows += rows.length
      cov.voids += orig.summary.voidCount
      cov.topups += orig.summary.topupCount
      for (const r of rows) {
        if (/WARRANTY]/.test(r['PRODUCT DETAILS'] ?? '')) cov.warranty++
        const amt = r['AMOUNT'] ?? ''
        if (parseFloat(amt) < 0) cov.neg++
        if (Number.isNaN(parseFloat(amt))) cov.nanAmt++
      }
      if (orig.staff['SUPPORT']) cov.support++
      if (orig.staff['TROY'] || orig.staff['BUDD'] || orig.staff['BUDDH']) cov.mgr++
      for (const s in orig.staff) if (orig.staff[s].topLenses.length > 0) cov.lensRows++
    }

    // Fail loudly if the fuzz didn't actually exercise the branches, so a
    // green run genuinely means "all paths agree".
    expect(cov.rows, 'fuzz produced rows').toBeGreaterThan(10000)
    expect(cov.voids, 'exercised VOID path').toBeGreaterThan(0)
    expect(cov.topups, 'exercised top-up path').toBeGreaterThan(0)
    expect(cov.warranty, 'exercised warranty-regex path').toBeGreaterThan(0)
    expect(cov.support, 'exercised blank-SALE -> SUPPORT path').toBeGreaterThan(0)
    expect(cov.mgr, 'exercised manager-name path').toBeGreaterThan(0)
    expect(cov.neg, 'exercised negative AMOUNT path').toBeGreaterThan(0)
    expect(cov.nanAmt, 'exercised non-numeric AMOUNT path').toBeGreaterThan(0)
    expect(cov.lensRows, 'exercised lens-aggregation path').toBeGreaterThan(0)
  })

  it(`deriveDashboard matches the original derivation across ${RUNS} datasets`, () => {
    let withCards = 0
    let withBadges = 0
    for (let seed = 1; seed <= RUNS; seed++) {
      const rows = genDataset(seed)
      const pd = originalProcessCSVData(rows) // authoritative processed input
      const mine = deriveDashboard(clone(pd))
      const orig = originalDerive(clone(pd))

      expect(mine.storeTopupRate, `storeTopupRate diverged at seed=${seed}`).toBe(orig.storeTopupRate)
      expect(mine.sortedNames, `sortedNames diverged at seed=${seed}`).toEqual(orig.sortedNames)
      expect(mine.cards, `cards diverged at seed=${seed}`).toEqual(orig.cards)

      if (orig.cards.length > 0) withCards++
      if (orig.cards.some((c) => c.badges.highestSale || c.badges.topUpMaster || c.badges.voids > 0)) withBadges++
    }
    expect(withCards, 'exercised non-empty dashboards').toBeGreaterThan(0)
    expect(withBadges, 'exercised badge logic').toBeGreaterThan(0)
  })

  // The ONE intentional divergence (real-data fix): the original CRASHES on a
  // non-void row whose SALE is a '-'/'N/A' sentinel (its initStaff guard skips
  // creation, then `staff[saleName].r` dereferences undefined). A real export
  // file carries '-' in SALE for un-attributed sales, so the original app hangs
  // on "Processing Data...". Our port instead folds the row into SUPPORT — the
  // same bucket a BLANK SALE uses — so the revenue still counts in the store
  // total but no card is shown. This test pins BOTH sides of that difference.
  it.each(['-', 'N/A'])("diverges ON PURPOSE from the original's crash on SALE=%s", (sentinel) => {
    const rows = [{ TYPE: 'SALE', AMOUNT: '100', SALE: sentinel, 'PRODUCT DETAILS': 'PLAIN' }]
    const origRun = attempt(() => originalProcessCSVData(clone(rows)))
    const mineRun = attempt(() => processCSVData(clone(rows)))

    // Original still throws...
    expect(origRun.ok, 'original is expected to throw on this input').toBe(false)
    // ...but the port handles it gracefully — no throw, revenue preserved.
    expect(mineRun.ok, 'port must NOT crash — it handles the sentinel').toBe(true)
    if (mineRun.ok) {
      // Folded into SUPPORT (like a blank SALE); no invented UNASSIGNED bucket.
      expect(mineRun.value.staff.SUPPORT?.r).toBe(100)
      expect(mineRun.value.staff.SUPPORT?.s).toBe(1)
      expect(mineRun.value.staff.UNASSIGNED).toBeUndefined()
      expect(mineRun.value.summary.revenue).toBe(100)
    }
  })
})

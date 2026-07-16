# pamm-kpi React Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the single-file vanilla-JS OWNDAYS Executive Dashboard (`reference/original-dashboard.html`) to a React + Vite + TypeScript SPA, preserving KPI logic and the 2-page PDF export layout exactly, deployed to Cloudflare Workers via GitHub Actions.

**Architecture:** Client-only SPA. Pure functions do the CSV aggregation (`processCsv.ts`) and view derivation (`deriveDashboard.ts`); React renders the dashboard into an exact two-page DOM (`#export-page-1`, `#export-page-2`); an imperative `exportPdf.ts` captures those nodes with html2canvas → jsPDF. No server code.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind v4 (`@tailwindcss/vite`), `react-chartjs-2` + `chart.js`, `papaparse`, `jspdf` + `html2canvas` (lazy), Vitest, `wrangler` (Workers static assets).

## Global Constraints

- Node 20+, npm. Package manager: npm (commit `package-lock.json`).
- **Fidelity > idiom:** never change a computed value or the PDF layout to be more "React-y". When in doubt, match `reference/original-dashboard.html` byte-for-behavior. The full contract is in `docs/superpowers/specs/2026-07-16-pamm-kpi-react-port-design.md` (referenced below as **SPEC §N**).
- Preserve identity verbatim: `<title>OWNDAYS EXECUTIVE DASHBOARD - DARK EDITION</title>`; hardcoded names `TROY`, `BUDDH`, `BUDD`; the top-up keyword list; the warranty string; the palette; the Thai error alert.
- Tailwind utility classes in JSX kept **verbatim** (including arbitrary values like `bg-[#0B0E14]`, `max-w-[1440px]`, `xl:grid-cols-4`). Custom `<style>` block copied **verbatim** into `src/index.css`.
- `jspdf` and `html2canvas` are **dynamic-imported inside the export handler only** (never top-level).
- TDD (Vitest) for the two pure-logic modules. Frequent commits — one per task minimum.
- Do not delete/modify `reference/original-dashboard.html` (ground truth, not shipped).

---

### Task 1: Scaffold + static shell + full CSS

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `src/vite-env.d.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

**Interfaces:**
- Produces: a running Vite app whose initial screen (before any upload) is a pixel-match of the original's empty state; `src/index.css` containing every custom rule from the original `<style>`; `App` default export rendering the full static shell markup.

- [ ] **Step 1: Scaffold and install deps**

```bash
npm create vite@latest . -- --template react-ts   # if prompted about non-empty dir, keep existing files
npm install chart.js react-chartjs-2 papaparse jspdf html2canvas
npm install -D @tailwindcss/vite tailwindcss vitest jsdom @types/papaparse @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Configure Vite + Vitest** — `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', globals: true },
})
```

Add `/// <reference types="vitest" />` at the top if the `test` key errors under TS. Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json` scripts.

- [ ] **Step 3: Port `index.html`** — replace the Vite default with the original's `<head>` essentials: keep `<title>OWNDAYS EXECUTIVE DASHBOARD - DARK EDITION</title>`, the Google Fonts Inter `<link>` (reference line 12), a `<div id="root"></div>`, the `<iframe id="pdf-iframe" …>` (reference line 183), and `<script type="module" src="/src/main.tsx"></script>`. Do NOT add the Tailwind/Chart.js/Papa/jsPDF CDN scripts — those become npm deps.

- [ ] **Step 4: Port CSS verbatim** — `src/index.css` = `@import "tailwindcss";` followed by the **entire** contents of the original `<style>` block (reference lines 15–93), copied character-for-character (body, `.text-glow-blue`, `.progress-glow`, `.card-dark` + `:hover`, `.btn-primary/danger` + `:hover`, `.badge-*`, `.staff-name-text`, `.staff-role-text`, `#loading-screen`, `.cyber-loader`, `@keyframes spin/slideUpFade/pulse`, `.card-enter`, `.export-overlay`, `.export-active`, `.export-spinner`, `.export-text`, and all `body.exporting-mode …` rules). Import it in `main.tsx`.

- [ ] **Step 5: Port the static shell** — `src/App.tsx` renders the markup from reference lines 96–183 as JSX. Conversion rules (apply mechanically):
  - `class=` → `className=`; `for=` → `htmlFor=`; every `style="…"` → a JSX style object; self-close void tags (`<input …/>`, `<line …/>`).
  - SVG attrs to camelCase: `stroke-width` → `strokeWidth` (keep `viewBox`, `points`, `x1/y1/x2/y2`, `fill`, `stroke`, `d` as-is).
  - Keep every className string exactly. Keep `id`s exactly: `main-body`, `export-screen`, `main-container`, `export-page-1`, `store-title`, `csvFileInput`, `btn-export-pdf`, `emptyState`, `loading-screen`, `dashboardPage1`, `mixedChartContainer`, `mixedChart` (as a `<canvas>` placeholder for now — chart wiring is Task 5), `workloadChartContainer`, `workloadBarChart`, `export-page-2`, `staffCardsContainer`.
  - Buttons/inputs are inert this task (no handlers). `dashboardPage1` and `export-page-2` keep their `hidden` class; `loading-screen` keeps `display:none`.

- [ ] **Step 6: Verify build + typecheck**

Run: `npm run build`
Expected: succeeds, emits `dist/`.

- [ ] **Step 7: Verify empty state visually**

Run: `npm run dev`, open the app. Expected: dark page, header "Executive Dashboard", "Upload CSV Report" button, empty-state card "Please Upload Staff KPI Report (.csv)" — visually identical to the original's initial screen. (Orchestrator confirms at review.)

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: scaffold Vite React app with ported shell and CSS"
```

---

### Task 2: KPI aggregation logic (`processCsv.ts`) — TDD

**Files:**
- Create: `src/lib/types.ts`, `src/lib/constants.ts`, `src/lib/processCsv.ts`, `src/lib/processCsv.test.ts`, `sample/sample-kpi.csv`

**Interfaces:**
- Produces: `processCSVData(rows: Record<string,string>[]): ProcessedData` and the `Summary`, `StaffStat`, `LensCount`, `ProcessedData` types (SPEC §5); constants `TOPUP_KEYWORDS`, `PALETTE`, `WARRANTY_REGEX`, `WORKLOAD_ROLES`.

- [ ] **Step 1: Write `src/lib/types.ts`** exactly as SPEC §5.

- [ ] **Step 2: Write `src/lib/constants.ts`**

```ts
export const TOPUP_KEYWORDS = ['EYESL','1.67','1.74','RX','EN-T','TS','PRE','COMPAL','MC2','COL1','MIRROR','PRES-T','SIGNATURE','ULTIMATE','GOLD'] as const
export const PALETTE = ['#06B6D4','#10B981','#F59E0B','#8B5CF6','#EC4899','#3B82F6','#EAB308','#6366F1','#14B8A6','#84CC16','#F43F5E'] as const
export const WORKLOAD_ROLES = ['EYECHECK','CASHIER','EDGING','DISPENSING'] as const
// hoisted regexp (js-hoist-regexp); value copied verbatim from reference line 259
export const WARRANTY_REGEX = /\[WARRANTY\]\s*ประกัน\s*%\s*สาขาที\s*ชื่อ:\s*ZPELL\s*@\s*FUTURE\s*PARK\s*วันที่\s*ชื่อ:/g
```

- [ ] **Step 3: Write failing tests** — `src/lib/processCsv.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { processCSVData } from './processCsv'

describe('processCSVData', () => {
  it('VOID row: counts void bill + abs(amount), adds nothing to revenue', () => {
    const { summary, staff } = processCSVData([{ 'TYPE': 'VOID', 'AMOUNT': '-500', 'SALE': 'ANNA' }])
    expect(summary.voidCount).toBe(1)
    expect(summary.voidAmt).toBe(500)
    expect(summary.revenue).toBe(0)
    expect(summary.salesCount).toBe(0)
    expect(staff.ANNA.v).toBe(1)
    expect(staff.ANNA.r).toBe(0)
  })

  it('blank SALE falls back to SUPPORT and accrues revenue', () => {
    const { summary, staff } = processCSVData([{ 'TYPE': 'SALE', 'AMOUNT': '1000', 'SALE': '', 'PRODUCT DETAILS': 'FRAME ONLY' }])
    expect(summary.revenue).toBe(1000)
    expect(summary.salesCount).toBe(1)
    expect(staff.SUPPORT.r).toBe(1000)
    expect(staff.SUPPORT.s).toBe(1)
    expect(summary.topupCount).toBe(0)
  })

  it('a product containing a top-up keyword marks the sale as top-up and records the lens', () => {
    const { summary, staff } = processCSVData([{ 'TYPE': 'SALE', 'AMOUNT': '2000', 'SALE': 'BOB', 'PRODUCT DETAILS': 'LENS 1.67 ASP, FRAME X' }])
    expect(summary.topupCount).toBe(1)
    expect(staff.BOB.t).toBe(1)
    expect(staff.BOB.topLenses).toEqual([{ name: 'LENS 1.67 ASP', count: 1 }])
  })

  it('finds the type column even when named "BILL TYPE"', () => {
    const { summary, staff } = processCSVData([{ 'BILL TYPE': 'VOID', 'AMOUNT': '300' }])
    expect(summary.voidCount).toBe(1)
    expect(summary.voidAmt).toBe(300)
    expect(staff.SUPPORT.v).toBe(1)
  })

  it('credits workload roles on sales, ignores "-"/"N/A", and never on VOID', () => {
    const sale = processCSVData([{ 'TYPE': 'SALE', 'AMOUNT': '100', 'SALE': 'ANNA', 'EYECHECK': 'CARL', 'CASHIER': 'ANNA', 'EDGING': '-', 'DISPENSING': 'N/A' }])
    expect(sale.staff.CARL.e).toBe(1)
    expect(sale.staff.ANNA.c).toBe(1)
    expect(sale.staff.ANNA.eg).toBe(0)
    const voided = processCSVData([{ 'TYPE': 'VOID', 'AMOUNT': '100', 'SALE': 'ANNA', 'EYECHECK': 'CARL' }])
    expect(voided.staff.CARL).toBeUndefined()
  })

  it('keeps only the top 5 lenses, sorted by count desc', () => {
    const rows = ['1.67 A','1.67 A','1.74 B','RX C','TS D','GOLD E','MIRROR F'].map(p => ({ 'TYPE': 'SALE', 'AMOUNT': '1', 'SALE': 'KAT', 'PRODUCT DETAILS': p }))
    const { staff } = processCSVData(rows)
    expect(staff.KAT.topLenses.length).toBe(5)
    expect(staff.KAT.topLenses[0]).toEqual({ name: '1.67 A', count: 2 })
  })
})
```

- [ ] **Step 4: Run tests, verify they fail**

Run: `npm test`
Expected: FAIL — `processCSVData` not found.

- [ ] **Step 5: Implement `src/lib/processCsv.ts`** as a 1:1 port of reference lines 228–301, following SPEC §6 exactly. Use `WARRANTY_REGEX` and `WORKLOAD_ROLES` from constants; keep the `is_tu` first-match `break`; keep the independent lens-count loop; `delete` the transient `lenses` after computing `topLenses`.

- [ ] **Step 6: Run tests, verify they pass**

Run: `npm test`
Expected: PASS (all 6).

- [ ] **Step 7: Create `sample/sample-kpi.csv`** — a small realistic file (header row: `TYPE,AMOUNT,SALE,PRODUCT DETAILS,EYECHECK,CASHIER,EDGING,DISPENSING`) with ~10 rows exercising: two named sellers, a SUPPORT (blank SALE) row, one VOID row (negative amount), top-up products (`1.67`, `RX`, `GOLD`), a non-keyword product, and workload names incl. one `-`. Used for browser parity in later tasks.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add CSV aggregation logic ported 1:1 with tests"
```

---

### Task 3: View derivation (`deriveDashboard.ts`) — TDD

**Files:**
- Create: `src/lib/deriveDashboard.ts`, `src/lib/deriveDashboard.test.ts`

**Interfaces:**
- Consumes: `ProcessedData`, `StaffStat` (Task 2).
- Produces:
  ```ts
  interface DerivedStaff { name: string; color: string; tr: number; role: string;
    badges: { highestSale: boolean; topUpMaster: boolean; voids: number };
    topLenses: LensCount[]; r: number; v: number; e: number; c: number; eg: number; d: number; delay: number }
  interface Dashboard { storeTopupRate: number; sortedNames: string[]; staff: Record<string, StaffStat>; cards: DerivedStaff[] }
  function deriveDashboard(data: ProcessedData): Dashboard
  function truncateText(s: string, max: number): string
  ```
  (`sortedNames` + `staff` are exposed for the charts in Task 5, which need raw `r/s/t/e/c/eg/d` in sorted order.)

- [ ] **Step 1: Write failing tests** — `src/lib/deriveDashboard.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveDashboard, truncateText } from './deriveDashboard'
import type { ProcessedData } from './types'

const mk = (over: Partial<Record<string, any>>): ProcessedData => ({
  summary: { revenue: 0, topupCount: 0, salesCount: 0, voidCount: 0, voidAmt: 0, ...(over.summary || {}) },
  staff: over.staff || {},
})
const s = (o: Partial<any> = {}) => ({ r: 0, s: 0, t: 0, v: 0, e: 0, c: 0, eg: 0, d: 0, topLenses: [], ...o })

describe('deriveDashboard', () => {
  it('storeTopupRate = topupCount/salesCount*100, 0 when no sales', () => {
    expect(deriveDashboard(mk({ summary: { salesCount: 4, topupCount: 1 } })).storeTopupRate).toBe(25)
    expect(deriveDashboard(mk({})).storeTopupRate).toBe(0)
  })

  it('sorts by revenue desc and excludes SUPPORT and zero-activity staff', () => {
    const d = deriveDashboard(mk({ staff: {
      ANNA: s({ r: 100 }), BOB: s({ r: 300 }), SUPPORT: s({ r: 999 }), ZED: s({ r: 0 }),
    }}))
    expect(d.cards.map(c => c.name)).toEqual(['BOB', 'ANNA'])
  })

  it('maps hardcoded roles', () => {
    const d = deriveDashboard(mk({ staff: { TROY: s({ r: 3 }), BUDDH: s({ r: 2 }), BUDD: s({ r: 1 }), X: s({ e: 1 }) }}))
    const role = (n: string) => d.cards.find(c => c.name === n)!.role
    expect(role('TROY')).toBe('Shop Manager')
    expect(role('BUDDH')).toBe('Assistant Shop Manager')
    expect(role('BUDD')).toBe('Assistant Shop Manager')
    expect(role('X')).toBe('Senior Sales Staff')
  })

  it('badges: highest sale for top revenue, top-up master at max rate, voids when v>0', () => {
    const d = deriveDashboard(mk({ staff: {
      ANNA: s({ r: 500, s: 2, t: 2, v: 1 }),  // tr 100
      BOB: s({ r: 900, s: 4, t: 1 }),          // tr 25, highest revenue
    }}))
    const anna = d.cards.find(c => c.name === 'ANNA')!
    const bob = d.cards.find(c => c.name === 'BOB')!
    expect(bob.badges.highestSale).toBe(true)
    expect(anna.badges.highestSale).toBe(false)
    expect(anna.badges.topUpMaster).toBe(true)
    expect(anna.badges.voids).toBe(1)
    expect(bob.badges.voids).toBe(0)
  })

  it('truncateText adds ellipsis past the limit only', () => {
    expect(truncateText('short', 28)).toBe('short')
    expect(truncateText('x'.repeat(30), 28)).toBe('x'.repeat(28) + '...')
  })
})
```

- [ ] **Step 2: Run tests, verify they fail.** Run: `npm test` → FAIL.

- [ ] **Step 3: Implement `deriveDashboard.ts`** per SPEC §7. Compute `sortedNames` via the exact filter+sort; `maxTopUpRate` across those names; per card `color = PALETTE[i % PALETTE.length]`, `tr`, role, badges (`highestSale = i===0 && r>0`, `topUpMaster = tr===maxTopUpRate && tr>0`, `voids = v`), `topLenses` (names pre-truncated with `truncateText(name,28)` OR truncate in the component — pick one and keep it consistent; recommended: keep full names here, truncate in `StaffCard`), `delay = 0.6 + i*0.1`. Export `truncateText`.

- [ ] **Step 4: Run tests, verify they pass.** Run: `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add dashboard view derivation with tests"
```

---

### Task 4: Data flow + summary/empty/loading UI

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/SummaryCards.tsx`, `src/components/EmptyState.tsx`, `src/components/LoadingScreen.tsx`

**Interfaces:**
- Consumes: `processCSVData` (Task 2), `deriveDashboard` (Task 3), `papaparse`.
- Produces: working upload → parse → render flow; `SummaryCards` renders the 3 KPI values.

- [ ] **Step 1: App state** — in `App.tsx` add state: `data: ProcessedData | null`, `status: 'empty' | 'loading' | 'ready'`, `storeTitle: string` (default `'Store Performance Insight'`). Compute `const dashboard = useMemo(() => data ? deriveDashboard(data) : null, [data])`.

- [ ] **Step 2: Upload handler** — on `#csvFileInput` change (port reference lines 199–226):
  - If `file.name.includes('Staff_KPI_Report_Store_')`, set `storeTitle = file.name.replace('.csv','').replace(/_/g,' ')`.
  - Set `status='loading'`. `Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => { const processed = processCSVData(res.data as any); setTimeout(() => { setData(processed); setStatus('ready') }, 500) } })`.
  - Render `#store-title` from `storeTitle` state.

- [ ] **Step 3: Conditional rendering** — show `EmptyState` when `empty`, `LoadingScreen` when `loading`, `#dashboardPage1` + `#export-page-2` + Export button when `ready` (use ternaries per `rendering-conditional-render`; keep the same DOM ids/classes as the shell). Export button visible only when `ready`.

- [ ] **Step 4: `SummaryCards.tsx`** — port reference lines 139–155; props: `revenue`, `topupRate`, `voidCount`, `voidAmt` (already-formatted display, or format here with the SPEC §7 `toLocaleString`/`toFixed(1)` rules). Keep classNames verbatim.

- [ ] **Step 5: `EmptyState.tsx` / `LoadingScreen.tsx`** — extract reference lines 127–130 and 132–135 verbatim.

- [ ] **Step 6: Verify** — `npm run build` passes; `npm run dev`, upload `sample/sample-kpi.csv`, confirm the three KPI numbers match what the original computes for the same file. (Orchestrator confirms parity at review.)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: wire CSV upload flow and summary cards"
```

---

### Task 5: Charts

**Files:**
- Create: `src/lib/chartSetup.ts`, `src/components/SalesTopupChart.tsx`, `src/components/WorkloadChart.tsx`
- Modify: `src/App.tsx` (mount charts inside `#mixedChartContainer` / `#workloadChartContainer`)

**Interfaces:**
- Consumes: `Dashboard.sortedNames`, `Dashboard.staff`, `PALETTE`.
- Produces: `SalesTopupChart` and `WorkloadChart` exposing their underlying Chart.js instances via ref for PDF export (Task 7). Expose e.g. `forwardRef` returning `{ toBase64Image(): string; resize(): void }`.

- [ ] **Step 1: `chartSetup.ts`** — register only used components and set defaults:

```ts
import { Chart, BarController, LineController, BarElement, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js'
Chart.register(BarController, LineController, BarElement, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)
Chart.defaults.animation = false
Chart.defaults.color = '#9CA3AF'
Chart.defaults.font.family = "'Inter', sans-serif"
Chart.defaults.font.size = 11
```

Import once (e.g. in `main.tsx`).

- [ ] **Step 2: `SalesTopupChart.tsx`** — `react-chartjs-2` `<Chart type="bar" …>` with the exact `data`/`options` from SPEC §8 (mixed bar+line, dual axis `y`/`y1`, palette bars `borderRadius:6`, line `#3B82F6` `pointRadius:4`, top-up data `s>0 ? (t/s*100).toFixed(1) : 0`). Wrap in `React.memo`. Forward a ref to the chart instance.

- [ ] **Step 3: `WorkloadChart.tsx`** — grouped bar, labels `['EXAM','CASHIER','EDGING','DISPENSE']`, one dataset per name `{ label, data:[e,c,eg,d], backgroundColor: PALETTE[i%len], borderRadius:4 }`, options per SPEC §8. `React.memo` + ref.

- [ ] **Step 4: Mount** in `App.tsx` inside the existing containers (replace the placeholder `<canvas>` from Task 1).

- [ ] **Step 5: Verify** — build passes; with `sample-kpi.csv`, both charts render with the same series/shape as the original. (Orchestrator confirms.)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add sales/top-up and workload charts (exact configs)"
```

---

### Task 6: Staff cards (Individual Performance page)

**Files:**
- Create: `src/components/StaffCard.tsx`
- Modify: `src/App.tsx` (render `dashboard.cards` into `#staffCardsContainer`)

**Interfaces:**
- Consumes: `DerivedStaff` (Task 3), `truncateText`.

- [ ] **Step 1: `StaffCard.tsx`** — port reference lines 350–404 verbatim into JSX, driven by a `DerivedStaff` prop. Preserve exactly: `border-top: 4px solid ${color}`, `animation-delay: ${delay}s`, badge container (`👑 HIGHEST SALE` / `💎 TOP UP MASTER` / `⚠️ VOIDS: ${v}` under the same badge classes and conditions), name + role, Sale Revenue `฿${r.toLocaleString(undefined,{minimumFractionDigits:0})}` with `text-shadow: 0 0 20px ${color}40`, Top-Up Rate `${tr.toFixed(1)}%` + progress bar `width:${tr}%`, "Top 5 Paid Lenses Sold" list (`truncateText(l.name,28)`, `title={l.name}`, empty → "No Lens Data Available"), Void Transactions (`text-[#EF4444]` when `v>0`), and the 4 workload tiles (Eye `e` / Cash `c` / Edge `eg` / Disp `d`, value colored `${color}`). Wrap in `React.memo`.

- [ ] **Step 2: Render** the sorted `dashboard.cards` in `#staffCardsContainer` (keep the `grid-staff` classes).

- [ ] **Step 3: Verify** — build passes; cards match the original's layout, badges, ordering, and numbers for `sample-kpi.csv`. (Orchestrator confirms.)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add individual performance staff cards"
```

---

### Task 7: PDF export (paper-fit, exact)

**Files:**
- Create: `src/features/exportPdf.ts`
- Modify: `src/App.tsx` (refs to `#export-page-1/2`, both charts, store title; wire `#btn-export-pdf`)

**Interfaces:**
- Consumes: chart refs (`toBase64Image`, `resize`) from Task 5; `storeTitle`.
- Produces: `exportDashboardPdf(opts: { page1: HTMLElement; page2: HTMLElement; charts: { instance, container }[]; storeTitle: string; button: HTMLElement }): Promise<void>`.

- [ ] **Step 1: Implement `exportPdf.ts`** as a 1:1 port of reference lines 444–536, following SPEC §9 exactly:
  - overlay on, hide `.action-buttons`, `scrollTo(0,0)`, add `document.body.classList.add('exporting-mode')`.
  - For each chart: build an `<img>` from `instance.toBase64Image()` (`width/height:100%`, id `tempMixedImg`/`tempWorkloadImg`), append to its container, hide the canvas.
  - `await new Promise(r => setTimeout(r, 1000))`.
  - `const { jsPDF } = await import('jspdf'); const html2canvas = (await import('html2canvas')).default`.
  - Page 1 then Page 2 exactly as SPEC §9 steps 6–8 (`scale:2, useCORS:true, backgroundColor:'#0B0E14', width:1440, windowWidth:1440`; `toDataURL('image/jpeg',0.98)`; `format:[1440, scrollHeight]`; orientation `1440>h?'landscape':'portrait'`; one image per page).
  - `pdf.save(storeTitle + '-Report.pdf')`.
  - `catch`: `console.error` + `alert("มีบางอย่างผิดพลาด โปรดลองใหม่อีกครั้ง")`.
  - `finally`: restore page displays to `block`, remove temp imgs, restore canvas display, remove `exporting-mode`, restore `.action-buttons` (`display:flex`), restore button, `instance.resize()` for both charts, overlay off.

- [ ] **Step 2: Wire** `#btn-export-pdf` `onClick` in `App.tsx` to call `exportDashboardPdf` with the refs. Keep the button disabled-visual behavior (`pointerEvents/opacity`) from the original.

- [ ] **Step 3: Verify PDF** — with `sample-kpi.csv`, click Export. Expected: a 2-page PDF, each page 1440px wide, page 1 = header+summary+charts, page 2 = staff cards in a 4-column grid, dark background, no clipped content. Compare against a PDF exported from `reference/original-dashboard.html` with the same CSV: same page count, same page dimensions, same layout. (Orchestrator performs this comparison.)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add exact 2-page PDF export with lazy-loaded libs"
```

---

### Task 8: Cloudflare Workers deploy config + CI + README

**Files:**
- Create: `wrangler.jsonc`, `.github/workflows/deploy.yml`, `README.md`
- Modify: `package.json` (add `"deploy": "wrangler deploy"`; add `wrangler` to devDeps)

**Interfaces:**
- Produces: a deployable Workers static-assets config and a CI workflow that builds and deploys on push to `main`.

- [ ] **Step 1: `wrangler.jsonc`** per SPEC §12 (`name: "pamm-kpi"`, a recent `compatibility_date`, `assets: { directory: "./dist", not_found_handling: "single-page-application" }`). Confirm the current assets schema against wrangler docs; if a Worker entry is required by the installed wrangler version, add a minimal one, otherwise keep assets-only.

- [ ] **Step 2: `.github/workflows/deploy.yml`** — trigger `on: push: branches: [main]`; job: `actions/checkout@v4` → `actions/setup-node@v4` (node 20, `cache: npm`) → `npm ci` → `npm run build` → `cloudflare/wrangler-action@v3` with `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`, `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`.

- [ ] **Step 3: `README.md`** — project overview, `npm install/dev/build/test`, how to add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets, and manual `npm run deploy` (after `npx wrangler login`).

- [ ] **Step 4: Verify** — `npm run build` emits `dist/`; run `npx wrangler deploy --dry-run --outdir=/tmp/wr` (or `wrangler versions upload --dry-run`) to validate config without deploying. Expected: config parses, assets directory recognized.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: add Cloudflare Workers config, CI workflow, and README"
```

---

### Task 9: Parity verification + push (orchestrator)

**Files:** none (verification + git).

- [ ] **Step 1:** Run the app and `reference/original-dashboard.html` side by side with `sample/sample-kpi.csv`; confirm identical summary numbers, staff ordering/badges/lenses, and chart series.
- [ ] **Step 2:** Export PDF from both; confirm 2 pages, 1440-wide, matching layout. Fix any drift (new task/commit as needed).
- [ ] **Step 3:** `npm test` green, `npm run build` clean.
- [ ] **Step 4:** Push: `git push -u origin main`.
- [ ] **Step 5:** Tell the user to add the two Cloudflare secrets so CI can deploy (or run `npm run deploy` locally once).

---

## Self-Review

- **Spec coverage:** §3 stack → T1/T2/T5/T8; §4 structure → all; §5 types → T2; §6 processCsv → T2; §7 derivation → T3; §8 charts → T5; §9 PDF → T7; §10 styling → T1/T6; §11 best-practices → T2 (hoist regexp), T5 (tree-shake), T7 (dynamic import), T4/T5/T6 (memo); §12 deploy → T8; §13 verify → T2/T4/T9. Covered.
- **Placeholder scan:** logic tasks inline full test code; UI tasks cite exact reference line ranges + SPEC sections (concrete, in-repo) rather than paraphrase. No TBD/TODO.
- **Type consistency:** `ProcessedData`/`StaffStat`/`LensCount` defined T2, consumed T3–T7; `Dashboard`/`DerivedStaff` defined T3, consumed T4–T7; `deriveDashboard`, `truncateText`, `processCSVData` names stable across tasks.

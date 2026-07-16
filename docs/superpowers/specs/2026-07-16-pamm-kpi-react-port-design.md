# pamm-kpi — React Port of OWNDAYS Executive Dashboard

**Date:** 2026-07-16
**Status:** Approved design → implementation
**Ground-truth source:** `reference/original-dashboard.html` (verbatim copy of the live site's single-file app)

---

## 1. Goal

Reverse-engineer `https://summarykpi.netlify.app/` and rebuild it as a modern **React + Vite + TypeScript SPA**, deployed to **Cloudflare Workers (static assets)** via **GitHub Actions CI/CD** to `git@github.com:Coke3a/pamm-kpi.git`.

The original is a single self-contained HTML file (vanilla JS) using Tailwind CDN, Chart.js, PapaParse, html2canvas, and jsPDF. It is a **100% client-side** KPI dashboard: user uploads a Staff KPI `.csv`, it is parsed and aggregated in the browser, and rendered as a dark dashboard with a 2-page PDF export.

## 2. Non-negotiables (the "copy เป๊ะ" contract)

Two things MUST be byte-for-behavior identical to the original. Everything else (framework, file layout) may modernize.

1. **Computation logic** — CSV parsing, aggregation, KPI formulas, keyword lists, badge rules, hardcoded names/roles must produce identical numbers and labels for the same CSV.
2. **Export/PDF layout** — the 2-page PDF is the primary deliverable (paper-fit, presentation-ready). Page structure, the `exporting-mode` CSS lock, and every html2canvas/jsPDF parameter must be preserved exactly. See §9.

If a React idiom would change output, **fidelity wins**. Verify parity in the browser, not by assumption.

## 3. Tech stack & rationale

| Concern | Choice | Why |
|---|---|---|
| Framework | **Vite + React 18 + TypeScript**, SPA (no SSR) | App is 100% client-side (File API, in-browser parse, canvas charts, browser PDF). SSR/Next.js adds an OpenNext adapter for zero benefit. |
| Styling | **Tailwind (real build via `@tailwindcss/vite`)** + custom CSS ported verbatim to `index.css` | Keep every Tailwind class in JSX as-is; move CDN → build. Custom `<style>` block copied 1:1. |
| Charts | **`react-chartjs-2`** + tree-shaken `chart.js` | Wraps Chart.js so the exact dataset/options configs port 1:1. Register only used components (no full CDN build). |
| CSV | **`papaparse`** (npm) | Same `header:true, skipEmptyLines:true` parse. |
| PDF | **`jspdf` + `html2canvas`** (npm), lazy-imported on export click | Preserve exact export mechanics; `bundle-dynamic-imports` keeps them out of the initial bundle. |
| Font | Inter (Google Fonts link or `@fontsource/inter`) | Same font stack. |
| Deploy | **Cloudflare Workers static assets** + `wrangler` | `assets` dir = `./dist`, `not_found_handling: "single-page-application"`. |
| CI/CD | **GitHub Actions** → `cloudflare/wrangler-action` on push to `main` | Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. |

## 4. Project structure

```
pamm-kpi/
├── index.html                       # Vite entry; <div id="root">, iframe#pdf-iframe, keep <title>
├── src/
│   ├── main.tsx                     # React mount
│   ├── App.tsx                      # Header + upload + empty/loading + #export-page-1 + #export-page-2
│   ├── index.css                    # Tailwind directives + custom CSS ported VERBATIM from original <style>
│   ├── lib/
│   │   ├── types.ts                 # Summary, StaffStat, ProcessedData, DerivedStaff
│   │   ├── constants.ts             # TOPUP_KEYWORDS, PALETTE, WARRANTY_REGEX, ROLE_MAP, WORKLOAD_ROLES
│   │   └── processCsv.ts            # processCSVData(rows) → ProcessedData  (pure, 1:1 port, unit-tested)
│   ├── hooks/
│   │   └── useDerivedStaff.ts       # applyDashboardData's derivation: sort/filter/rates/badges (memoized)
│   ├── components/
│   │   ├── SummaryCards.tsx         # 3 KPI cards (revenue / top-up rate / voids)
│   │   ├── SalesTopupChart.tsx      # mixed bar+line, dual axis
│   │   ├── WorkloadChart.tsx        # grouped bar (EXAM/CASHIER/EDGING/DISPENSE)
│   │   ├── StaffCard.tsx            # one staff card (badges, revenue, top-up bar, top-5 lenses, workload)
│   │   ├── EmptyState.tsx
│   │   └── LoadingScreen.tsx
│   └── features/
│       └── exportPdf.ts             # imperative 2-page export; lazy-imports jspdf + html2canvas
├── reference/original-dashboard.html # ground truth (do not ship)
├── sample/sample-kpi.csv            # synthetic CSV for parity testing
├── wrangler.jsonc
├── vite.config.ts
├── tsconfig.json / tsconfig.node.json
├── package.json
├── .github/workflows/deploy.yml
├── .gitignore
└── README.md
```

## 5. Data model (`src/lib/types.ts`)

```ts
interface Summary { revenue: number; topupCount: number; salesCount: number; voidCount: number; voidAmt: number; }
interface LensCount { name: string; count: number; }
interface StaffStat {
  r: number; // revenue
  s: number; // sales count (non-void rows credited to this sale)
  t: number; // top-up count
  v: number; // void count
  e: number; // eyecheck
  c: number; // cashier
  eg: number; // edging
  d: number; // dispensing
  lenses: Record<string, number>; // transient; removed after topLenses computed
  topLenses: LensCount[];
}
interface ProcessedData { summary: Summary; staff: Record<string, StaffStat>; }
```

## 6. CSV processing — exact port (`processCsv.ts`)

Port `processCSVData(data)` from the original (reference lines 228–301) with identical behavior:

- `initStaff(name)`: create entry only if `name && name !== '-' && name !== 'N/A'` and not already present. Fields init to 0 / `{}`.
- Per row:
  - `typeKey = Object.keys(row).find(k => k.includes('TYPE'))`; `type = (row[typeKey] || '').trim().toUpperCase()`.
  - `amount = parseFloat(row['AMOUNT']) || 0`.
  - `isVoid = (type === 'VOID')`.
  - `saleName = (row['SALE'] || '').trim().toUpperCase()`; if `=== ''` → `'SUPPORT'`. Then `initStaff(saleName)`.
  - **If void:** `summary.voidCount++`; `summary.voidAmt += Math.abs(amount)`; `staff[saleName].v++`.
  - **Else (sale):** `summary.revenue += amount`; `summary.salesCount++`; `staff[saleName].r += amount`; `staff[saleName].s++`.
    - `productStr = (row['PRODUCT DETAILS'] || '').toUpperCase()`.
    - Apply `WARRANTY_REGEX` replace → `'WARRANTY ZPELL'` (see constants; the `/g` warranty string).
    - `products = productStr.split(',').map(p => p.trim())`.
    - `is_tu`: true if **any** product `includes` one of `TOPUP_KEYWORDS` (break on first match). If true: `staff[saleName].t++`, `summary.topupCount++`.
    - For **each** product matching a keyword: `staff[saleName].lenses[p] = (…||0) + 1`.
  - **Workload (only if NOT void):** for `role of ['EYECHECK','CASHIER','EDGING','DISPENSING']`: `name = (row[role]||'').trim().toUpperCase()`; if valid (`&& !== '-' && !== 'N/A'`): `initStaff(name)`; increment `e/c/eg/d` respectively.
- After all rows: for each staff, `topLenses = Object.entries(lenses).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count}))`; then `delete staff.lenses`.

**Subtleties to preserve (do NOT "fix"):**
- Negative `AMOUNT` on a non-void row reduces `revenue` (added as-is).
- `SUPPORT` accumulates revenue/voids into `summary` but is excluded from staff cards (§7).
- `is_tu` uses first-match break; lens counting is independent and counts every matching product occurrence.
- Warranty replace runs before split; `'WARRANTY ZPELL'` contains no keyword so it never counts as top-up/lens.
- Float top-up-rate equality is used for the badge (§7) — keep `===`.

## 7. Derived view — exact (`useDerivedStaff.ts`)

Port `applyDashboardData` (reference lines 303–413) as derived, memoized state:

- `storeTopupRate = salesCount > 0 ? topupCount/salesCount*100 : 0`.
- Summary display: `฿${revenue.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`, `${storeTopupRate.toFixed(1)}%`, `voidCount`, `฿${voidAmt.toLocaleString(...)}`.
- `sortedStaff = Object.keys(staff).filter(k => (staff[k].r>0 || staff[k].e>0 || staff[k].v>0) && k !== 'SUPPORT').sort((a,b)=>staff[b].r - staff[a].r)`.
- `maxTopUpRate` = max over sortedStaff of `tr = s>0 ? t/s*100 : 0`.
- Per staff (index `i`):
  - `color = PALETTE[i % PALETTE.length]`.
  - `tr = s>0 ? t/s*100 : 0`.
  - Role: default `"Senior Sales Staff"`; `TROY` → `"Shop Manager"`; `BUDDH` or `BUDD` → `"Assistant Shop Manager"` (compare on uppercased name).
  - Badges: `index===0 && r>0` → `👑 HIGHEST SALE`; `tr===maxTopUpRate && tr>0` → `💎 TOP UP MASTER`; `v>0` → `⚠️ VOIDS: ${v}`.
  - Lens rows: `truncateText(name, 28)` (`> 28` → `substring(0,28)+'...'`), show `count`; empty → "No Lens Data Available".
  - Card enter animation delay = `0.6 + i*0.1` seconds.
  - Top-up progress bar width = `tr%`.
  - Workload tiles: Eye `e`, Cash `c`, Edge `eg`, Disp `d`, colored with `color`.

## 8. Charts — exact configs (`SalesTopupChart.tsx`, `WorkloadChart.tsx`)

Global Chart defaults: `animation=false`, `color='#9CA3AF'`, `font.family="'Inter', sans-serif"`, `font.size=11`.
`PALETTE = ['#06B6D4','#10B981','#F59E0B','#8B5CF6','#EC4899','#3B82F6','#EAB308','#6366F1','#14B8A6','#84CC16','#F43F5E']`.

- **Mixed chart** (`mixedChart`): type `bar`; labels = sortedNames.
  - Dataset 1 `Net Sales (THB)`: `data = r`, `backgroundColor = palette per index`, `borderRadius:6`, `yAxisID:'y'`.
  - Dataset 2 `Top-Up Rate (%)`: `type:'line'`, `data = s>0 ? (t/s*100).toFixed(1) : 0`, `borderColor/backgroundColor '#3B82F6'`, `borderWidth:2`, `pointBackgroundColor '#12141A'`, `pointBorderColor '#3B82F6'`, `pointBorderWidth:2`, `pointRadius:4`, `yAxisID:'y1'`.
  - Options: `responsive:true, maintainAspectRatio:false`; scales `y` (grid `#2A2D35` dashed `[4,4]`, beginAtZero, ticks `#9CA3AF`), `y1` (position right, no grid, min 0), `x` (no grid).
- **Workload chart** (`workloadBarChart`): type `bar`; labels `['EXAM','CASHIER','EDGING','DISPENSE']`; one dataset per staff `{ label:name, data:[e,c,eg,d], backgroundColor: palette[i], borderRadius:4 }`. Grouped bars. Same scale styling.

Register: `BarController, LineController, BarElement, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend` (only what's used).

## 9. Export / PDF fidelity contract (`exportPdf.ts`) — CRITICAL

The PDF must remain paper-fit and presentation-ready. Preserve exactly (reference lines 87–93 CSS, 444–536 JS).

**DOM contract:** two containers `#export-page-1` and `#export-page-2`, same child structure. Each → exactly one PDF page.
- Page 1 = header block + `.grid-summary` (3 KPI cards) + `.grid-charts` (2 charts, each `h-[400px]`).
- Page 2 = "Individual Performance" heading + `.grid-staff` (staff cards, `min-height:750px`).

**`body.exporting-mode` CSS — copy verbatim into `index.css`:**
- `body.exporting-mode`: width/min/max `1440px !important`, `margin:0 auto`, bg `#0B0E14`, `overflow:visible`.
- `#export-page-1/2`: width/min `1440px`, `padding:40px`, bg `#0B0E14`.
- `.grid-summary` → `repeat(3, minmax(0,1fr))`, gap `2rem`. `.grid-charts` → `1fr`. `.grid-staff` → `repeat(4, minmax(0,1fr))`, gap `2rem`.
- `.card-dark` → `transform:none, box-shadow:none, animation:none, opacity:1, border-color:#374151, transition:none`.
- Selectors stay `body.exporting-mode …`; toggle the class on `document.body` (React mounts under `#root`, but descendant selectors still match — verify no width constraint from `#root`).

**Export sequence (imperative, on real nodes via refs):**
1. Show `#export-screen` overlay (`export-active`); hide `.action-buttons`; `window.scrollTo(0,0)`.
2. `document.body.classList.add('exporting-mode')`.
3. Swap each chart: create `<img>` with `chart.toBase64Image()`, `width/height:100%`, append to chart container, `canvas.style.display='none'`.
4. `await sleep(1000)`.
5. `const { jsPDF } = await import('jspdf'); const html2canvas = (await import('html2canvas')).default;` — lazy.
6. `pdfWidth = 1440`. Page 1: `page1.style.display='block'; page2.style.display='none'`; `canvas1 = await html2canvas(page1, { scale:2, useCORS:true, backgroundColor:'#0B0E14', width:1440, windowWidth:1440 })`; `imgData1 = canvas1.toDataURL('image/jpeg', 0.98)`; `h1 = page1.scrollHeight`; `pdf = new jsPDF({ orientation: pdfWidth>h1?'landscape':'portrait', unit:'px', format:[pdfWidth,h1] })`; `pdf.addImage(imgData1,'JPEG',0,0,pdfWidth,h1)`.
7. Page 2: `page1.style.display='none'; page2.style.display='block'`; same html2canvas; `h2 = page2.scrollHeight`; `pdf.addPage([pdfWidth,h2], pdfWidth>h2?'landscape':'portrait')`; `pdf.addImage(imgData2,'JPEG',0,0,pdfWidth,h2)`.
8. `pdf.save(storeTitle + '-Report.pdf')`.
9. On error: `alert("มีบางอย่างผิดพลาด โปรดลองใหม่อีกครั้ง")`.
10. `finally`: restore page displays to `block`, remove temp imgs, restore canvas display, remove `exporting-mode`, restore `.action-buttons`, restore button state, `chart.resize()`, hide overlay.

**Store title:** on file select, if filename includes `Staff_KPI_Report_Store_`, set `store-title` = `filename.replace('.csv','').replace(/_/g,' ')`. PDF filename uses this text.

## 10. Styling

- `index.css`: `@import "tailwindcss";` (v4) + the entire original `<style>` block copied verbatim (body, `.card-dark`, `.btn-primary/danger`, `.badge-*`, `.staff-name-text`, loaders, `.card-enter`, `.export-overlay`, `body.exporting-mode` rules).
- JSX keeps original Tailwind utility classes verbatim (incl. arbitrary values like `bg-[#0B0E14]`, `max-w-[1440px]`, `xl:grid-cols-4`).
- `#export-page-2` starts hidden until data loaded (original toggles `hidden`); replicate.

## 11. React best practices applied (output unchanged)

- `bundle-dynamic-imports`: `jspdf` + `html2canvas` imported only inside the export click handler.
- Tree-shaken Chart.js registration (no CDN full build).
- `js-hoist-regexp`: `WARRANTY_REGEX` module-level constant.
- `useMemo` for `processCSVData` result and derived staff; memoized `StaffCard`.
- Keep parse work off the initial render; show LoadingScreen with the original `setTimeout(…, 500)` UX beat.

## 12. Deployment

**`wrangler.jsonc`:**
```jsonc
{
  "name": "pamm-kpi",
  "compatibility_date": "2025-01-01",
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" }
}
```
(Assets-only Worker — no server code needed. Confirm exact current schema with wrangler docs at implementation time.)

**`.github/workflows/deploy.yml`:** on push to `main` → `actions/checkout` → `actions/setup-node` (Node 20) → `npm ci` → `npm run build` → `cloudflare/wrangler-action@v3` with `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}` and `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`.

User adds `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repo secrets.

## 13. Verification

- **Unit:** test `processCSVData` against the synthetic `sample/sample-kpi.csv` covering: void rows, top-up products, non-keyword products, blank/`SUPPORT` sale, `-`/`N/A` staff, workload columns, negative amount, `BILL TYPE`-style TYPE column. Assert exact `summary` + `staff` numbers.
- **Visual parity:** run the Vite app and the original (`reference/original-dashboard.html`) locally with the same CSV; compare dashboard numbers, card content, chart shapes side by side in the browser.
- **PDF parity:** export from both; compare page count (2), page dimensions (1440 × scrollHeight), and layout.
- ⚠️ No real production CSV available — parity is validated against the ported logic + representative sample. Re-verify if a real/anonymized CSV is added.

## 14. Assumptions & risks

- App identity kept exactly: `OWNDAYS EXECUTIVE DASHBOARD` title, hardcoded staff names/roles (`TROY`, `BUDDH/BUDD`), keyword list, warranty string.
- Tailwind v4 preflight ≈ CDN preflight; verify no visual drift on the pixel-critical cards.
- `#root` wrapper must not constrain `body.exporting-mode` 1440px width — verify during PDF test.
- Expected CSV columns (inferred): a `*TYPE*` column, `AMOUNT`, `SALE`, `PRODUCT DETAILS`, `EYECHECK`, `CASHIER`, `EDGING`, `DISPENSING`.

## 15. Reference

- Ground truth: `reference/original-dashboard.html` (538 lines).
- Live: `https://summarykpi.netlify.app/`.
- Repo: `git@github.com:Coke3a/pamm-kpi.git`.

import { forwardRef, memo } from 'react'
import { Chart } from 'react-chartjs-2'
import type { Chart as ChartJS, ChartData, ChartOptions } from 'chart.js'
import type { StaffStat } from '../lib/types'
import { PALETTE } from '../lib/constants'

// The type Task 7 (PDF export) will hold a ref to: the real Chart.js instance
// (react-chartjs-2 v5's <Chart ref> forwards this directly — verified against
// the installed react-chartjs-2@5.3.1 source, node_modules/react-chartjs-2/
// dist/index.js: `chartRef.current = new Chart$1(...); reforwardRef(ref,
// chartRef.current)` — not a wrapper object), so `toBase64Image()` /
// `resize()` are available straight off it.
export type SalesTopupChartHandle = ChartJS<'bar', number[], string>

interface SalesTopupChartProps {
  sortedNames: string[]
  staff: Record<string, StaffStat>
}

// Options are static per SPEC §8 / reference line 427 (no per-render
// values), so this object is hoisted to module scope instead of rebuilt
// every render.
//
// NOTE on `borderDash`: the reference config nests it under `grid` (verbatim
// below, matching SPEC §8 exactly). Chart.js v4 actually reads gridline dash
// patterns from a scale's separate `border.dash` option (`grid.borderDash`
// was the Chart.js v3 property name); `chart.js`'s v4 types correctly no
// longer declare `borderDash` on `GridLineOptions`, which is why this isn't
// typed as `ChartOptions<'bar'>` directly (see the cast at the JSX callsite
// below). This is preserved exactly as the reference/brief specify rather
// than "corrected" to `border.dash` — see task-5-report.md for the browser
// comparison confirming this doesn't produce a visible discrepancy against
// reference/original-dashboard.html itself (v4 is a no-op for this key in
// *both* apps).
const options = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      grid: { color: '#2A2D35', borderDash: [4, 4] },
      beginAtZero: true,
      ticks: { color: '#9CA3AF' },
    },
    y1: {
      position: 'right',
      grid: { display: false },
      min: 0,
      ticks: { color: '#9CA3AF' },
    },
    x: {
      grid: { display: false },
      ticks: { color: '#9CA3AF' },
    },
  },
}

// 1:1 port of the `mixedChart` config from reference/original-dashboard.html
// lines 418-428 (renderCharts). Mixed bar+line chart: per-staff revenue bars
// (palette-colored) on the default 'y' axis, plus a top-up-rate line on a
// second 'y1' axis.
//
// Chart.js's "mixed chart" pattern — a dataset overriding the parent
// <Chart type="bar">'s type with its own `type: 'line'` — isn't modeled by
// chart.js's TS defs for a single-TType `data` prop (every dataset in
// ChartData<'bar', ...> is typed strictly as a bar dataset). The cast below
// is a type-checking-only escape hatch; the object handed to Chart.js at
// runtime is exactly the reference's config, unchanged.
const SalesTopupChart = memo(
  // react-chartjs-2's own ChartJSOrUndefined<TType,TData,TLabel> = Chart<...>
  // | undefined (never actually `undefined` at runtime — see the source note
  // above — but the ref callback's parameter type must match it structurally
  // for the `ref={ref}` passthrough below to typecheck).
  forwardRef<SalesTopupChartHandle | undefined, SalesTopupChartProps>(function SalesTopupChart(
    { sortedNames, staff },
    ref,
  ) {
    // INTENTIONAL DEVIATION from the original (user-requested visual fix): the
    // "Sales & Top-Up Analysis" chart is about salespeople, so it plots only
    // names that actually made a sale (`s > 0`). The original fed the whole
    // `sortedNames` list here, which meant a workload-only staffer (no sales,
    // e.g. a dispenser) drew an empty revenue bar AND forced its top-up rate to
    // a meaningless 0%, sending the line diving to the x-axis. Colours are taken
    // from each name's position in `sortedNames` so they stay in sync with the
    // Workload chart and the staff cards (which still list every staffer).
    const chartNames = sortedNames.filter((n) => staff[n].s > 0)

    const data = {
      labels: chartNames,
      datasets: [
        {
          label: 'Net Sales (THB)',
          data: chartNames.map((n) => staff[n].r),
          backgroundColor: chartNames.map((n) => PALETTE[sortedNames.indexOf(n) % PALETTE.length]),
          borderRadius: 6,
          yAxisID: 'y',
          // Draw the bars BELOW the top-up line. In Chart.js a higher `order`
          // is drawn first (further back); the tall revenue bars were otherwise
          // painted over the line, hiding it (user-requested fix).
          order: 2,
        },
        {
          label: 'Top-Up Rate (%)',
          data: chartNames.map((n) => (staff[n].t / staff[n].s * 100).toFixed(1)),
          type: 'line' as const,
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F6',
          borderWidth: 2,
          pointBackgroundColor: '#12141A',
          pointBorderColor: '#3B82F6',
          pointBorderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y1',
          // Lower `order` -> drawn last -> the line sits ON TOP of the bars.
          order: 1,
        },
      ],
    }

    return (
      <Chart
        ref={ref}
        id="mixedChart"
        type="bar"
        data={data as unknown as ChartData<'bar', number[], string>}
        options={options as unknown as ChartOptions<'bar'>}
      />
    )
  }),
)

export default SalesTopupChart

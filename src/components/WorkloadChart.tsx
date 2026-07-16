import { forwardRef, memo } from 'react'
import { Chart } from 'react-chartjs-2'
import type { Chart as ChartJS, ChartData, ChartOptions } from 'chart.js'
import type { StaffStat } from '../lib/types'
import { PALETTE } from '../lib/constants'

// See SalesTopupChart.tsx's SalesTopupChartHandle comment: react-chartjs-2's
// <Chart ref> forwards the real Chart.js instance directly.
export type WorkloadChartHandle = ChartJS<'bar', number[], string>

interface WorkloadChartProps {
  sortedNames: string[]
  staff: Record<string, StaffStat>
}

// Reference line 439: `labels: ['EXAM', 'CASHIER', 'EDGING', 'DISPENSE']`.
const LABELS = ['EXAM', 'CASHIER', 'EDGING', 'DISPENSE']

// Options are static per SPEC §8 / reference line 440 (no per-render
// values), so this object is hoisted to module scope instead of rebuilt
// every render.
//
// NOTE on `borderDash`: see SalesTopupChart.tsx's identical note — this is
// the reference's literal `grid.borderDash` shape (SPEC §8), not typed as
// `ChartOptions<'bar'>` directly because chart.js v4's `GridLineOptions`
// no longer declares that key (it moved to a scale's `border.dash`); cast at
// the JSX callsite below instead of "fixing" the reference's config shape.
const options = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#9CA3AF' },
    },
    y: {
      min: 0,
      grid: { color: '#2A2D35', borderDash: [4, 4] },
      ticks: { color: '#9CA3AF' },
    },
  },
}

// 1:1 port of the `workloadBarChart` config from
// reference/original-dashboard.html lines 430-441 (renderCharts). Grouped
// bar chart: one dataset per staff member, 4 values each
// (EXAM/CASHIER/EDGING/DISPENSE workload counts), all bars in a dataset
// sharing that staff member's palette color.
const WorkloadChart = memo(
  // See SalesTopupChart.tsx's identical note on the `| undefined` — matches
  // react-chartjs-2's own ChartJSOrUndefined ref-callback parameter type.
  forwardRef<WorkloadChartHandle | undefined, WorkloadChartProps>(function WorkloadChart(
    { sortedNames, staff },
    ref,
  ) {
    const data: ChartData<'bar', number[], string> = {
      labels: LABELS,
      datasets: sortedNames.map((name, i) => ({
        label: name,
        data: [staff[name].e, staff[name].c, staff[name].eg, staff[name].d],
        backgroundColor: PALETTE[i % PALETTE.length],
        borderRadius: 4,
      })),
    }

    return (
      <Chart
        ref={ref}
        id="workloadBarChart"
        type="bar"
        data={data}
        options={options as unknown as ChartOptions<'bar'>}
      />
    )
  }),
)

export default WorkloadChart

// Tree-shaken Chart.js registration + global defaults.
//
// 1:1 port of reference/original-dashboard.html lines 186-189 (Chart.defaults)
// plus the component set `renderCharts` (lines 415-442) actually draws with:
// a mixed bar+line chart (SalesTopupChart) and a grouped bar chart
// (WorkloadChart). See
// docs/superpowers/specs/2026-07-16-pamm-kpi-react-port-design.md §8.
//
// Only what's used is registered here (no CDN "auto" full build):
//   - BarController / LineController: the two chart "types" drawn.
//   - BarElement / LineElement / PointElement: what each type draws
//     (PointElement is required for the line dataset's points/markers).
//   - LinearScale / CategoryScale: the y/y1 (linear) and x (category) axes.
//   - Tooltip / Legend: neither chart's `options` disables these, so the
//     original's default tooltip/legend behavior must still work — with a
//     tree-shaken build they only function if explicitly registered.
//
// Side-effect only module: import once (see src/main.tsx) before any chart
// renders.
import {
  Chart,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js'

Chart.register(
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
)

// animation=false matches the original verbatim, and is also critical for a
// later task: PDF export (Task 7) calls chart.toBase64Image() right after
// (re)rendering the charts for capture — with animations on, that could grab
// a mid-transition frame instead of the final one.
Chart.defaults.animation = false
Chart.defaults.color = '#9CA3AF'
Chart.defaults.font.family = "'Inter', sans-serif"
Chart.defaults.font.size = 11

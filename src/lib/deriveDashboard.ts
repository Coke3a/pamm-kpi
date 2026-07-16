import type { LensCount, ProcessedData, StaffStat } from './types'
import { PALETTE } from './constants'

export interface DerivedStaff {
  name: string
  color: string
  tr: number
  role: string
  badges: { highestSale: boolean; topUpMaster: boolean; voids: number }
  topLenses: LensCount[]
  r: number
  v: number
  e: number
  c: number
  eg: number
  d: number
  delay: number
}

export interface Dashboard {
  storeTopupRate: number
  sortedNames: string[]
  staff: Record<string, StaffStat>
  cards: DerivedStaff[]
}

// 1:1 port of the `truncateText` helper from reference/original-dashboard.html
// (lines 194-197), including the falsy-input guard.
//
// NOTE: `deriveDashboard` below intentionally does NOT call this on `topLenses`
// names — it keeps them full-length so the data stays untruncated for any
// consumer. `truncateText` is exported so StaffCard (Task 6) can apply it at
// render time, e.g. `truncateText(name, 28)`, matching where the original does
// the truncation (in the lens-row template, not in `applyDashboardData` itself).
export function truncateText(s: string, max: number): string {
  if (!s) return ''
  return s.length > max ? s.substring(0, max) + '...' : s
}

function roleFor(name: string): string {
  const checkName = name.toUpperCase()
  if (checkName === 'TROY') return 'Shop Manager'
  if (checkName === 'BUDDH' || checkName === 'BUDD') return 'Assistant Shop Manager'
  return 'Senior Sales Staff'
}

function topUpRate(stat: StaffStat): number {
  return stat.s > 0 ? (stat.t / stat.s) * 100 : 0
}

// 1:1 port of applyDashboardData's derivation from reference/original-dashboard.html
// (lines 303-413). See docs/superpowers/specs/2026-07-16-pamm-kpi-react-port-design.md
// §7 for the behavioral contract. Pure: no DOM access, no chart/HTML rendering —
// those live in the components/hooks that consume this.
export function deriveDashboard(data: ProcessedData): Dashboard {
  const { summary, staff } = data

  const storeTopupRate = summary.salesCount > 0 ? (summary.topupCount / summary.salesCount) * 100 : 0

  const sortedNames = Object.keys(staff)
    .filter(k => (staff[k].r > 0 || staff[k].e > 0 || staff[k].v > 0) && k !== 'SUPPORT')
    .sort((a, b) => staff[b].r - staff[a].r)

  let maxTopUpRate = 0
  sortedNames.forEach(name => {
    const tr = topUpRate(staff[name])
    if (tr > maxTopUpRate) maxTopUpRate = tr
  })

  const cards: DerivedStaff[] = sortedNames.map((name, index) => {
    const stat = staff[name]
    const tr = topUpRate(stat)

    return {
      name,
      color: PALETTE[index % PALETTE.length],
      tr,
      role: roleFor(name),
      badges: {
        highestSale: index === 0 && stat.r > 0,
        topUpMaster: tr === maxTopUpRate && tr > 0,
        voids: stat.v,
      },
      topLenses: stat.topLenses,
      r: stat.r,
      v: stat.v,
      e: stat.e,
      c: stat.c,
      eg: stat.eg,
      d: stat.d,
      delay: 0.6 + index * 0.1,
    }
  })

  return { storeTopupRate, sortedNames, staff, cards }
}

import type { LensCount, ProcessedData, StaffStat, Summary } from './types'
import { TOPUP_KEYWORDS, UNASSIGNED_SALE, UNASSIGNED_SENTINELS, WARRANTY_REGEX, WORKLOAD_ROLES } from './constants'

// 1:1 port of processCSVData from reference/original-dashboard.html (lines 228-301).
// See docs/superpowers/specs/2026-07-16-pamm-kpi-react-port-design.md §6 for the
// behavioral contract and the subtleties that must be preserved verbatim.
export function processCSVData(data: Record<string, string>[]): ProcessedData {
  const summary: Summary = { revenue: 0, topupCount: 0, salesCount: 0, voidCount: 0, voidAmt: 0 }
  const staff: Record<string, StaffStat> = {}

  const initStaff = (name: string) => {
    if (name && name !== '-' && name !== 'N/A' && !staff[name]) {
      staff[name] = { r: 0, s: 0, t: 0, v: 0, e: 0, c: 0, eg: 0, d: 0, lenses: {}, topLenses: [] }
    }
  }

  data.forEach(row => {
    const typeKey = Object.keys(row).find(k => k.includes('TYPE'))
    const type = typeKey && row[typeKey] ? row[typeKey].trim().toUpperCase() : ''
    const amount = parseFloat(row['AMOUNT']) || 0
    const isVoid = type === 'VOID'

    let saleName = row['SALE'] ? row['SALE'].trim().toUpperCase() : ''
    if (saleName === '') saleName = 'SUPPORT'
    // INTENTIONAL DEVIATION (see constants.ts): the original leaves '-'/'N/A'
    // here and then crashes on `staff[saleName]`. Route them to a visible
    // 'UNASSIGNED' bucket instead. Files without these sentinels are unaffected.
    else if (UNASSIGNED_SENTINELS.includes(saleName)) saleName = UNASSIGNED_SALE

    initStaff(saleName)

    if (isVoid) {
      summary.voidCount++
      summary.voidAmt += Math.abs(amount)
      staff[saleName].v++
    } else {
      summary.revenue += amount
      summary.salesCount++
      staff[saleName].r += amount
      staff[saleName].s++

      let productStr = row['PRODUCT DETAILS'] ? row['PRODUCT DETAILS'].toUpperCase() : ''
      productStr = productStr.replace(WARRANTY_REGEX, 'WARRANTY ZPELL')

      const products = productStr.split(',').map(p => p.trim())
      let is_tu = false

      for (const p of products) {
        if (TOPUP_KEYWORDS.some(k => p.includes(k))) {
          is_tu = true
          break
        }
      }
      if (is_tu) {
        staff[saleName].t++
        summary.topupCount++
      }

      products.forEach(p => {
        if (TOPUP_KEYWORDS.some(k => p.includes(k))) {
          // `lenses` is always populated here: initStaff() above always sets it to
          // {} for a fresh entry, and nothing removes it until the final pass below.
          const lenses = staff[saleName].lenses!
          lenses[p] = (lenses[p] || 0) + 1
        }
      })
    }

    if (!isVoid) {
      WORKLOAD_ROLES.forEach(role => {
        const name = row[role] ? row[role].trim().toUpperCase() : ''
        if (name && name !== '-' && name !== 'N/A') {
          initStaff(name)
          if (role === 'EYECHECK') staff[name].e++
          if (role === 'CASHIER') staff[name].c++
          if (role === 'EDGING') staff[name].eg++
          if (role === 'DISPENSING') staff[name].d++
        }
      })
    }
  })

  for (const s in staff) {
    const lenses = staff[s].lenses ?? {}
    const topLenses: LensCount[] = Object.entries(lenses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    staff[s].topLenses = topLenses
    delete staff[s].lenses
  }

  return { summary, staff }
}

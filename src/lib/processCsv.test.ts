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

  it('negative AMOUNT on a non-void row adds as-is, not abs (contrast with void which uses Math.abs)', () => {
    const { summary, staff } = processCSVData([{ 'TYPE': 'SALE', 'AMOUNT': '-200', 'SALE': 'X' }])
    expect(summary.revenue).toBe(-200)
    expect(staff.X.r).toBe(-200)
    expect(summary.salesCount).toBe(1)
    expect(summary.voidCount).toBe(0)
  })

  it('two top-up products in one row: single top-up credit (is_tu break) but each matching lens counted (independent loop)', () => {
    const { summary, staff } = processCSVData([{ 'TYPE': 'SALE', 'AMOUNT': '1', 'SALE': 'Y', 'PRODUCT DETAILS': '1.67 ASP, GOLD COAT, FRAME Z' }])
    expect(summary.topupCount).toBe(1)
    expect(staff.Y.t).toBe(1)
    expect(staff.Y.topLenses).toContainEqual({ name: '1.67 ASP', count: 1 })
    expect(staff.Y.topLenses).toContainEqual({ name: 'GOLD COAT', count: 1 })
    expect(staff.Y.topLenses.map(l => l.name)).not.toContain('FRAME Z')
  })
})

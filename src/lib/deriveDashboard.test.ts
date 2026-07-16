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

  it('includes a staff member via v>0 alone, even with r=0 and e=0', () => {
    const d = deriveDashboard(mk({ staff: { ZED: s({ r: 0, e: 0, v: 1 }) } }))
    expect(d.cards.map(c => c.name)).toContain('ZED')
  })

  it('highestSale requires r>0 even at index 0', () => {
    const d = deriveDashboard(mk({ staff: { ZED: s({ r: 0, e: 1 }) } }))
    expect(d.cards[0].badges.highestSale).toBe(false)
  })

  it('topUpMaster: a tie at the max top-up rate awards the badge to both staff', () => {
    const d = deriveDashboard(mk({ staff: {
      ANNA: s({ r: 200, s: 4, t: 2 }), // tr = 50
      BOB: s({ r: 100, s: 2, t: 1 }),  // tr = 50
    }}))
    const anna = d.cards.find(c => c.name === 'ANNA')!
    const bob = d.cards.find(c => c.name === 'BOB')!
    expect(anna.badges.topUpMaster).toBe(true)
    expect(bob.badges.topUpMaster).toBe(true)
  })

  it('topUpMaster: zero-guard blocks the badge when every staff has t=0 (maxTopUpRate=0)', () => {
    const d = deriveDashboard(mk({ staff: {
      ANNA: s({ r: 200, s: 4, t: 0 }),
      BOB: s({ r: 100, s: 2, t: 0 }),
    }}))
    expect(d.cards.every(c => !c.badges.topUpMaster)).toBe(true)
  })

  it('truncateText: length===max is not truncated; empty string returns empty', () => {
    expect(truncateText('x'.repeat(28), 28)).toBe('x'.repeat(28))
    expect(truncateText('', 28)).toBe('')
  })
})

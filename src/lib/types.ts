// Data model for the ported KPI dashboard.
// Mirrors SPEC §5 (docs/superpowers/specs/2026-07-16-pamm-kpi-react-port-design.md).
//
// NOTE: `StaffStat.lenses` is marked optional (`lenses?`) rather than required.
// The original algorithm (reference/original-dashboard.html lines 295-298) builds
// it up per-row, then does `delete staff[s].lenses` once `topLenses` is computed.
// Under this project's `strict: true` tsconfig, TypeScript only allows the `delete`
// operator on a property that is declared optional (ts(2790) otherwise). Marking it
// optional preserves that exact runtime behavior (the field is transient and is gone
// on the objects `processCSVData` returns) while type-checking cleanly. This is a
// compile-time-only annotation change; it does not alter any computed value.

export interface Summary {
  revenue: number
  topupCount: number
  salesCount: number
  voidCount: number
  voidAmt: number
}

export interface LensCount {
  name: string
  count: number
}

export interface StaffStat {
  r: number // revenue
  s: number // sales count (non-void rows credited to this sale)
  t: number // top-up count
  v: number // void count
  e: number // eyecheck
  c: number // cashier
  eg: number // edging
  d: number // dispensing
  lenses?: Record<string, number> // transient; removed after topLenses computed
  topLenses: LensCount[]
}

export interface ProcessedData {
  summary: Summary
  staff: Record<string, StaffStat>
}

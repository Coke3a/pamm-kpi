// Constants ported verbatim from reference/original-dashboard.html.
// See docs/superpowers/specs/2026-07-16-pamm-kpi-react-port-design.md §6, §7, §8.

export const TOPUP_KEYWORDS = ['EYESL','1.67','1.74','RX','EN-T','TS','PRE','COMPAL','MC2','COL1','MIRROR','PRES-T','SIGNATURE','ULTIMATE','GOLD'] as const

// --- INTENTIONAL DEVIATION from the original (real-data cleanup) ----------
// Values that turn up in the name columns of REAL export files but are NOT a
// trackable person. They must never become a staff card and must not be
// counted as anyone's work. Compared AFTER `.trim().toUpperCase()`, so every
// entry here is already in its uppercased form (Thai has no case):
//   '-' / 'N/A'         the "no salesperson / no role" sentinel. A non-void
//                       row with SALE '-' crashes the original on
//                       `staff[saleName]`; here such a SALE folds into the
//                       SUPPORT bucket, exactly like a BLANK SALE — the
//                       revenue still counts in the store total, but no card
//                       is shown (deriveDashboard filters SUPPORT out).
//   'ซื้ออุปกรณ์เสริม'   "buy accessories": a transaction description that
//                       leaks into the EYECHECK/EDGING/DISPENSING columns
//                       (e.g. row 345004571). Skipped everywhere, so it is
//                       never counted as staff.
// A file WITHOUT any of these values produces byte-identical output to the
// original — the differential fuzz in parity.test.ts still passes.
export const EXCLUDED_NAMES: ReadonlySet<string> = new Set(['-', 'N/A', 'ซื้ออุปกรณ์เสริม'])
export const PALETTE = ['#06B6D4','#10B981','#F59E0B','#8B5CF6','#EC4899','#3B82F6','#EAB308','#6366F1','#14B8A6','#84CC16','#F43F5E'] as const
export const WORKLOAD_ROLES = ['EYECHECK','CASHIER','EDGING','DISPENSING'] as const
// hoisted regexp (js-hoist-regexp); value copied verbatim from reference line 259
export const WARRANTY_REGEX = /\[WARRANTY\]\s*ประกัน\s*%\s*สาขาที\s*ชื่อ:\s*ZPELL\s*@\s*FUTURE\s*PARK\s*วันที่\s*ชื่อ:/g

// Constants ported verbatim from reference/original-dashboard.html.
// See docs/superpowers/specs/2026-07-16-pamm-kpi-react-port-design.md §6, §7, §8.

export const TOPUP_KEYWORDS = ['EYESL','1.67','1.74','RX','EN-T','TS','PRE','COMPAL','MC2','COL1','MIRROR','PRES-T','SIGNATURE','ULTIMATE','GOLD'] as const
export const PALETTE = ['#06B6D4','#10B981','#F59E0B','#8B5CF6','#EC4899','#3B82F6','#EAB308','#6366F1','#14B8A6','#84CC16','#F43F5E'] as const
export const WORKLOAD_ROLES = ['EYECHECK','CASHIER','EDGING','DISPENSING'] as const
// hoisted regexp (js-hoist-regexp); value copied verbatim from reference line 259
export const WARRANTY_REGEX = /\[WARRANTY\]\s*ประกัน\s*%\s*สาขาที\s*ชื่อ:\s*ZPELL\s*@\s*FUTURE\s*PARK\s*วันที่\s*ชื่อ:/g

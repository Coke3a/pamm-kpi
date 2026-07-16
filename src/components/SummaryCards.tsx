// 1:1 port of the 3 KPI summary cards from reference/original-dashboard.html
// (lines 140-154 — the children of `.grid-summary`), classNames verbatim.
// Formatting follows docs/superpowers/specs/2026-07-16-pamm-kpi-react-port-design.md
// §7 exactly (reference lines 308-311, `applyDashboardData`):
//   revenue    -> `฿${revenue.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`
//   topupRate  -> `${storeTopupRate.toFixed(1)}%`
//   voidCount  -> as-is (no formatting)
//   voidAmt    -> `฿${voidAmt.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`
//
// Returns a Fragment (not a wrapping <div>) so the 3 cards stay direct
// children of the `.grid-summary grid grid-cols-1 md:grid-cols-3` container
// in App.tsx — that grid wrapper is intentionally left in App.tsx per the
// task's "do not restructure the grid wrappers" instruction, with this
// component slotted in as its children.
interface SummaryCardsProps {
  revenue: number
  topupRate: number
  voidCount: number
  voidAmt: number
}

function SummaryCards({ revenue, topupRate, voidCount, voidAmt }: SummaryCardsProps) {
  return (
    <>
      <div className="bg-[#12141A] border border-[#232630] rounded-2xl p-6 border-t-4 border-t-[#3B82F6] flex flex-col justify-center">
        <div className="text-gray-400 text-[11px] font-bold tracking-widest mb-1 uppercase">Net Revenue (Ex. VAT)</div>
        <div id="summary-revenue" className="text-4xl font-black text-white mt-2 tracking-tight" style={{ textShadow: '0 0 15px rgba(56, 189, 248, 0.5)' }}>
          ฿{revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
      </div>
      <div className="bg-[#12141A] border border-[#232630] rounded-2xl p-6 border-t-4 border-t-[#4ADE80] flex flex-col justify-center">
        <div className="text-gray-400 text-[11px] font-bold tracking-widest mb-1 uppercase">Store Top-Up Rate</div>
        <div id="summary-topup" className="text-4xl font-black text-[#4ADE80] mt-2 tracking-tight" style={{ textShadow: '0 0 15px rgba(74,222,128,0.4)' }}>
          {topupRate.toFixed(1)}%
        </div>
      </div>
      <div className="bg-[#12141A] border border-[#232630] rounded-2xl p-6 border-t-4 border-t-[#EF4444] flex flex-col justify-center">
        <div className="text-gray-400 text-[11px] font-bold tracking-widest mb-1 uppercase">Void Transactions</div>
        <div className="text-4xl font-black text-[#EF4444] mt-2 tracking-tight flex items-baseline gap-2" style={{ textShadow: '0 0 15px rgba(239,68,68,0.4)' }}>
          <span id="summary-void">{voidCount}</span> <span className="text-lg font-bold text-[#FCA5A5]">Bills</span>
        </div>
        <div className="text-xs font-semibold text-gray-500 mt-2">
          Void Value: <span id="summary-void-amt" className="text-gray-300">฿{voidAmt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
      </div>
    </>
  )
}

export default SummaryCards

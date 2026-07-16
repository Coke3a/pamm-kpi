import { memo } from 'react'
import type { DerivedStaff } from '../lib/deriveDashboard'
import { truncateText } from '../lib/deriveDashboard'

// 1:1 port of the staff-card template from reference/original-dashboard.html
// (lines 350-404, built inside `applyDashboardData`), classNames verbatim.
// Field wiring follows docs/superpowers/specs/2026-07-16-pamm-kpi-react-port-design.md
// §7 (per-staff card fields). All derivation (color, tr, role, badges, delay)
// already happened in `deriveDashboard` (Task 3) — this component only renders.
//
// NOTE on Sale Revenue formatting: `minimumFractionDigits: 0` only (no
// `maximumFractionDigits`), matching reference line 362 exactly. This
// differs from SummaryCards' revenue format (which sets both digit options)
// — that's an existing inconsistency in the original dashboard, ported as-is.
interface StaffCardProps {
  staff: DerivedStaff
}

function StaffCard({ staff }: StaffCardProps) {
  const { name, color, tr, role, badges, topLenses, r, v, e, c, eg, d, delay } = staff

  // Reference line 342: `combinedBadges` only wraps a `.badge-container` when
  // at least one of the three badge conditions produced markup.
  const hasBadges = badges.highestSale || badges.topUpMaster || badges.voids > 0

  return (
    <div className="card-dark card-enter" style={{ animationDelay: `${delay}s`, borderTop: `4px solid ${color}` }}>
      {hasBadges ? (
        <div className="badge-container">
          {badges.highestSale ? <div className="badge-item badge-crown">👑 HIGHEST SALE</div> : null}
          {badges.topUpMaster ? <div className="badge-item badge-topup">💎 TOP UP MASTER</div> : null}
          {badges.voids > 0 ? <div className="badge-item badge-alert">⚠️ VOIDS: {badges.voids}</div> : null}
        </div>
      ) : null}

      <div className="flex-none pr-28 relative z-10">
        <div className="staff-name-text text-white" title={name}>{name}</div>
        <div className="staff-role-text text-[13px] font-bold text-gray-500">{role}</div>
      </div>

      <div className="flex-none bg-[#161922] rounded-2xl p-6 mb-6 border border-[#232630]">
        <div className="text-gray-500 text-[10px] font-bold tracking-widest mb-3 uppercase">Sale Revenue</div>
        <div
          className="text-[36px] font-black text-white mb-6 tracking-tight leading-none"
          style={{ textShadow: `0 0 20px ${color}40` }}
        >
          ฿{r.toLocaleString(undefined, { minimumFractionDigits: 0 })}
        </div>

        <div className="flex justify-between items-end mb-2">
          <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Top-Up Rate</div>
          <div className="text-[14px] font-black text-[#4ADE80]">{tr.toFixed(1)}%</div>
        </div>
        <div className="w-full bg-[#232630] rounded-full h-[6px] overflow-hidden">
          <div className="bg-[#4ADE80] h-[6px] rounded-full" style={{ width: `${tr}%`, boxShadow: '0 0 10px #4ADE8080' }}></div>
        </div>
      </div>

      <div className="flex-grow flex flex-col mb-4">
        <div className="text-gray-500 text-[10px] font-bold tracking-widest mb-4 uppercase">Top 5 Paid Lenses Sold</div>
        <div className="space-y-1">
          {topLenses.length > 0 ? (
            topLenses.map(lens => (
              <div key={lens.name} className="flex justify-between items-start text-[13px] font-medium pb-3">
                <span
                  className="text-gray-300 pr-2 truncate block"
                  style={{ lineHeight: 'normal', paddingBottom: '4px' }}
                  title={lens.name}
                >
                  {truncateText(lens.name, 28)}
                </span>
                <span className="font-black text-white flex-shrink-0 block" style={{ lineHeight: 'normal' }}>
                  {lens.count}
                </span>
              </div>
            ))
          ) : (
            <div className="text-[13px] text-gray-500 text-center py-4 block" style={{ lineHeight: 'normal' }}>
              No Lens Data Available
            </div>
          )}
        </div>
      </div>

      <div className="flex-none flex justify-between items-center py-4 border-t border-[#232630] mb-2 mt-auto">
        <div className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">Void Transactions</div>
        <div className={`font-black text-[15px] ${v > 0 ? 'text-[#EF4444]' : 'text-white'}`}>{v}</div>
      </div>

      <div className="flex-none grid grid-cols-4 gap-3">
        <div className="bg-[#161922] border border-[#232630] rounded-xl p-3 flex flex-col items-center justify-center">
          <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase">Eye</div>
          <div className="font-black text-[22px] leading-none" style={{ color }}>{e}</div>
        </div>
        <div className="bg-[#161922] border border-[#232630] rounded-xl p-3 flex flex-col items-center justify-center">
          <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase">Cash</div>
          <div className="font-black text-[22px] leading-none" style={{ color }}>{c}</div>
        </div>
        <div className="bg-[#161922] border border-[#232630] rounded-xl p-3 flex flex-col items-center justify-center">
          <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase">Edge</div>
          <div className="font-black text-[22px] leading-none" style={{ color }}>{eg}</div>
        </div>
        <div className="bg-[#161922] border border-[#232630] rounded-xl p-3 flex flex-col items-center justify-center">
          <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase">Disp</div>
          <div className="font-black text-[22px] leading-none" style={{ color }}>{d}</div>
        </div>
      </div>
    </div>
  )
}

export default memo(StaffCard)

// 1:1 port of the pre-upload empty state from reference/original-dashboard.html
// (lines 127-130), extracted verbatim. Rendered by App.tsx only when
// status === 'empty'.
function EmptyState() {
  return (
    <div id="emptyState" className="text-center py-32 bg-[#12141A] rounded-3xl border border-[#232630]">
      <div className="text-5xl mb-5 opacity-20">📈</div>
      <h2 className="text-xl font-bold text-gray-400">Please Upload Staff KPI Report (.csv)</h2>
    </div>
  )
}

export default EmptyState

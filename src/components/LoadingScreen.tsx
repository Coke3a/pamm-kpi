// 1:1 port of the "Processing Data..." loading screen from
// reference/original-dashboard.html (lines 132-135), extracted verbatim.
// Rendered by App.tsx only when status === 'loading'.
//
// NOTE on the inline `display: flex` style: src/index.css carries the
// original's `#loading-screen { display: none; }` rule verbatim (it is a
// global, ID-scoped default — out of scope for this task to touch). The
// original page keeps this element permanently mounted in the DOM and
// toggles visibility imperatively via `loading-screen.style.display =
// 'flex' | 'none'` (reference lines 214, 221), which — as an inline style —
// outranks the ID-selector CSS rule. Here, App.tsx instead mounts/unmounts
// this whole component based on `status`, so whenever it IS mounted it must
// still win against that global `display:none` rule the same way the
// original's inline style did, or the spinner would render but stay
// invisible. Setting `display: 'flex'` here reproduces that exact override.
function LoadingScreen() {
  return (
    <div
      id="loading-screen"
      className="flex-col items-center justify-center py-32 bg-[#12141A] rounded-3xl border border-[#232630]"
      style={{ display: 'flex' }}
    >
      <div className="cyber-loader"></div>
      <h2 className="text-xl font-bold text-white animate-pulse">Processing Data...</h2>
    </div>
  )
}

export default LoadingScreen

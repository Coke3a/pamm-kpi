function App() {
  return (
    <div className="bg-[#0B0E14]" id="main-body">
      <div id="export-screen" className="export-overlay">
        <div className="export-spinner"></div>
        <div className="export-text">LOADING...</div>
      </div>

      <div className="max-w-[1440px] mx-auto pb-20" id="main-container">
        <div id="export-page-1" className="p-6 md:p-10 bg-[#0B0E14]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#12141A] p-6 md:p-8 rounded-3xl border border-[#232630] mb-8 gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
                Executive <span className="text-[#3B82F6]">Dashboard</span>
              </h1>
              <p className="text-gray-400 font-semibold tracking-widest text-[11px] uppercase mt-2" id="store-title">Store Performance Insight</p>
            </div>
            <div className="flex items-center gap-3 action-buttons" data-html2canvas-ignore="true">
              <input type="file" id="csvFileInput" accept=".csv" className="hidden" />
              <label htmlFor="csvFileInput" className="btn-primary">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Upload CSV Report
              </label>
              <button id="btn-export-pdf" className="btn-danger">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Export PDF
              </button>
            </div>
          </div>

          <div id="emptyState" className="text-center py-32 bg-[#12141A] rounded-3xl border border-[#232630]">
            <div className="text-5xl mb-5 opacity-20">📈</div>
            <h2 className="text-xl font-bold text-gray-400">Please Upload Staff KPI Report (.csv)</h2>
          </div>

          <div id="loading-screen" className="flex-col items-center justify-center py-32 bg-[#12141A] rounded-3xl border border-[#232630]">
            <div className="cyber-loader"></div>
            <h2 className="text-xl font-bold text-white animate-pulse">Processing Data...</h2>
          </div>

          <div id="dashboardPage1" className="space-y-8 hidden">
            <div className="grid-summary grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#12141A] border border-[#232630] rounded-2xl p-6 border-t-4 border-t-[#3B82F6] flex flex-col justify-center">
                <div className="text-gray-400 text-[11px] font-bold tracking-widest mb-1 uppercase">Net Revenue (Ex. VAT)</div>
                <div id="summary-revenue" className="text-4xl font-black text-white mt-2 tracking-tight" style={{ textShadow: '0 0 15px rgba(56, 189, 248, 0.5)' }}>฿0</div>
              </div>
              <div className="bg-[#12141A] border border-[#232630] rounded-2xl p-6 border-t-4 border-t-[#4ADE80] flex flex-col justify-center">
                <div className="text-gray-400 text-[11px] font-bold tracking-widest mb-1 uppercase">Store Top-Up Rate</div>
                <div id="summary-topup" className="text-4xl font-black text-[#4ADE80] mt-2 tracking-tight" style={{ textShadow: '0 0 15px rgba(74,222,128,0.4)' }}>0%</div>
              </div>
              <div className="bg-[#12141A] border border-[#232630] rounded-2xl p-6 border-t-4 border-t-[#EF4444] flex flex-col justify-center">
                <div className="text-gray-400 text-[11px] font-bold tracking-widest mb-1 uppercase">Void Transactions</div>
                <div className="text-4xl font-black text-[#EF4444] mt-2 tracking-tight flex items-baseline gap-2" style={{ textShadow: '0 0 15px rgba(239,68,68,0.4)' }}>
                  <span id="summary-void">0</span> <span className="text-lg font-bold text-[#FCA5A5]">Bills</span>
                </div>
                <div className="text-xs font-semibold text-gray-500 mt-2">Void Value: <span id="summary-void-amt" className="text-gray-300">฿0</span></div>
              </div>
            </div>

            <div className="grid-charts grid grid-cols-1 gap-8">
              <div className="bg-[#12141A] border border-[#232630] rounded-2xl p-6 flex flex-col h-[400px]">
                <h2 className="text-[11px] font-bold text-gray-400 tracking-widest mb-6 uppercase">Sales & Top-Up Analysis</h2>
                <div id="mixedChartContainer" className="relative w-full flex-grow"><canvas id="mixedChart"></canvas></div>
              </div>
              <div className="bg-[#12141A] border border-[#232630] rounded-2xl p-6 flex flex-col h-[400px]">
                <h2 className="text-[11px] font-bold text-gray-400 tracking-widest mb-6 uppercase">Workload Distribution</h2>
                <div id="workloadChartContainer" className="relative w-full flex-grow"><canvas id="workloadBarChart"></canvas></div>
              </div>
            </div>
          </div>
        </div>

        <div id="export-page-2" className="p-6 md:p-10 bg-[#0B0E14] hidden">
          <div className="flex items-center gap-4 mb-8 px-2">
            <div className="h-8 w-1.5 bg-[#3B82F6] rounded-full shadow-[0_0_10px_#3B82F6]"></div>
            <h2 className="text-2xl font-black text-white tracking-tight">Individual Performance</h2>
          </div>

          <div id="staffCardsContainer" className="grid-staff grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

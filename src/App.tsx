import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import Papa from 'papaparse'
import { processCSVData } from './lib/processCsv'
import { deriveDashboard } from './lib/deriveDashboard'
import type { ProcessedData } from './lib/types'
import EmptyState from './components/EmptyState'
import LoadingScreen from './components/LoadingScreen'
import SummaryCards from './components/SummaryCards'
import SalesTopupChart, { type SalesTopupChartHandle } from './components/SalesTopupChart'
import WorkloadChart, { type WorkloadChartHandle } from './components/WorkloadChart'

type Status = 'empty' | 'loading' | 'ready'

function App() {
  const [data, setData] = useState<ProcessedData | null>(null)
  const [status, setStatus] = useState<Status>('empty')
  const [storeTitle, setStoreTitle] = useState('Store Performance Insight')

  // Chart.js instance refs — react-chartjs-2 forwards the real Chart.js
  // instance (not a wrapper), so `.current` will expose `toBase64Image()`
  // and `.resize()` once the charts mount. Consumed by the PDF export flow
  // (Task 7); unused otherwise in this task.
  const mixedChartRef = useRef<SalesTopupChartHandle | null>(null)
  const workloadChartRef = useRef<WorkloadChartHandle | null>(null)

  // Memoized so re-renders triggered by state unrelated to `data` don't
  // re-run the O(staff) derivation (SPEC §7/§11 "deferred-memoization intent").
  const dashboard = useMemo(() => (data ? deriveDashboard(data) : null), [data])

  // Port of the csvFileInput 'change' handler (reference/original-dashboard.html
  // lines 199-226).
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.name.includes('Staff_KPI_Report_Store_')) {
      setStoreTitle(file.name.replace('.csv', '').replace(/_/g, ' '))
    }

    setStatus('loading')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const processed = processCSVData(res.data as any)
        // Matches the original's setTimeout(..., 500) UX beat between
        // "Processing Data..." and the dashboard appearing.
        setTimeout(() => {
          setData(processed)
          setStatus('ready')
        }, 500)
      },
    })
  }

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
              <p className="text-gray-400 font-semibold tracking-widest text-[11px] uppercase mt-2" id="store-title">{storeTitle}</p>
            </div>
            <div className="flex items-center gap-3 action-buttons" data-html2canvas-ignore="true">
              <input type="file" id="csvFileInput" accept=".csv" className="hidden" onChange={handleFileChange} />
              <label htmlFor="csvFileInput" className="btn-primary">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Upload CSV Report
              </label>
              <button
                id="btn-export-pdf"
                className="btn-danger"
                style={{ display: status === 'ready' ? 'inline-flex' : 'none' }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Export PDF
              </button>
            </div>
          </div>

          {status === 'empty' ? (
            <EmptyState />
          ) : status === 'loading' ? (
            <LoadingScreen />
          ) : data && dashboard ? (
            <div id="dashboardPage1" className="space-y-8">
              <div className="grid-summary grid grid-cols-1 md:grid-cols-3 gap-8">
                <SummaryCards
                  revenue={data.summary.revenue}
                  topupRate={dashboard.storeTopupRate}
                  voidCount={data.summary.voidCount}
                  voidAmt={data.summary.voidAmt}
                />
              </div>

              <div className="grid-charts grid grid-cols-1 gap-8">
                <div className="bg-[#12141A] border border-[#232630] rounded-2xl p-6 flex flex-col h-[400px]">
                  <h2 className="text-[11px] font-bold text-gray-400 tracking-widest mb-6 uppercase">Sales & Top-Up Analysis</h2>
                  <div id="mixedChartContainer" className="relative w-full flex-grow">
                    <SalesTopupChart ref={mixedChartRef} sortedNames={dashboard.sortedNames} staff={dashboard.staff} />
                  </div>
                </div>
                <div className="bg-[#12141A] border border-[#232630] rounded-2xl p-6 flex flex-col h-[400px]">
                  <h2 className="text-[11px] font-bold text-gray-400 tracking-widest mb-6 uppercase">Workload Distribution</h2>
                  <div id="workloadChartContainer" className="relative w-full flex-grow">
                    <WorkloadChart ref={workloadChartRef} sortedNames={dashboard.sortedNames} staff={dashboard.staff} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {status === 'ready' ? (
          <div id="export-page-2" className="p-6 md:p-10 bg-[#0B0E14]">
            <div className="flex items-center gap-4 mb-8 px-2">
              <div className="h-8 w-1.5 bg-[#3B82F6] rounded-full shadow-[0_0_10px_#3B82F6]"></div>
              <h2 className="text-2xl font-black text-white tracking-tight">Individual Performance</h2>
            </div>

            <div id="staffCardsContainer" className="grid-staff grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default App

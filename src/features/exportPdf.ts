import type { Chart as ChartJsInstance } from 'chart.js'

/**
 * A chart participating in the export. `instance` is the live Chart.js
 * instance (react-chartjs-2 forwards it directly — see SalesTopupChart.tsx /
 * WorkloadChart.tsx). `tempImgId` matches the reference's hardcoded
 * 'tempMixedImg' / 'tempWorkloadImg' ids (reference/original-dashboard.html
 * lines 465, 471). `container` is optional — when omitted, it resolves to
 * `instance.canvas.parentElement`, which is exactly the `#…ChartContainer`
 * div the reference looks up via `document.getElementById` (lines 475-476).
 */
export interface ExportChartTarget {
  instance: ChartJsInstance<'bar', number[], string> | null
  tempImgId: string
  container?: HTMLElement | null
}

export interface ExportDashboardPdfOptions {
  page1: HTMLElement
  page2: HTMLElement
  charts: ExportChartTarget[]
  storeTitle: string
  button: HTMLElement
}

const EXPORT_ERROR_MESSAGE = 'มีบางอย่างผิดพลาด โปรดลองใหม่อีกครั้ง'

/**
 * 1:1 port of the `btn-export-pdf` click handler in
 * reference/original-dashboard.html (lines 444-536) / SPEC §9.
 *
 * Deliberately imperative: every mutation below (overlay class, button
 * pointer-events/opacity, `.action-buttons` display, `body.exporting-mode`,
 * chart canvas <-> <img> swap, page `display`) is applied directly to real
 * DOM nodes, never via React state. This mirrors the original's vanilla-JS
 * flow exactly and guarantees html2canvas-pro captures precisely the DOM it
 * mutated — a React re-render triggered mid-export could otherwise clobber
 * these mutations before the second `html2canvas` call runs.
 *
 * html2canvas-pro (not html2canvas) is used because Tailwind v4's build
 * output compiles utility colors (e.g. `text-gray-400`) to `oklch()`, which
 * html2canvas@1.4.1 (the reference's pinned version) cannot parse — it
 * throws "unsupported color function oklch" mid-capture. The reference runs
 * Tailwind via the v3-era CDN build (rgb colors), so it never hits this.
 * html2canvas-pro is a drop-in fork with an identical `html2canvas(el,
 * options)` API that additionally supports oklch()/lab()/lch(), so the
 * options object below is byte-for-byte what the reference passes.
 */
export async function exportDashboardPdf({
  page1,
  page2,
  charts,
  storeTitle,
  button,
}: ExportDashboardPdfOptions): Promise<void> {
  const exportScreen = document.getElementById('export-screen')
  exportScreen?.classList.add('export-active')

  button.style.pointerEvents = 'none'
  button.style.opacity = '0.7'

  const actionButtons = document.querySelector<HTMLElement>('.action-buttons')
  if (actionButtons) actionButtons.style.display = 'none'

  window.scrollTo(0, 0)

  document.body.classList.add('exporting-mode')

  // Freeze each live chart to a static <img> snapshot and hide its canvas —
  // matches reference lines 458-476 exactly (same swap, same temp ids).
  const tempImgs: HTMLImageElement[] = []
  for (const chart of charts) {
    if (!chart.instance) continue
    const canvas: HTMLCanvasElement = chart.instance.canvas
    const container = chart.container ?? canvas.parentElement
    if (!container) continue

    const img = document.createElement('img')
    img.src = chart.instance.toBase64Image()
    img.style.width = '100%'
    img.style.height = '100%'
    img.id = chart.tempImgId

    canvas.style.display = 'none'
    container.appendChild(img)
    tempImgs.push(img)
  }

  await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    const { jsPDF } = await import('jspdf')
    const html2canvas = (await import('html2canvas-pro')).default

    const pdfWidth = 1440

    page1.style.display = 'block'
    page2.style.display = 'none'

    const canvas1 = await html2canvas(page1, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0B0E14',
      width: 1440,
      windowWidth: 1440,
    })
    const imgData1 = canvas1.toDataURL('image/jpeg', 0.98)
    const pdfHeight1 = page1.scrollHeight

    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight1 ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pdfWidth, pdfHeight1],
    })
    pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight1)

    page1.style.display = 'none'
    page2.style.display = 'block'

    const canvas2 = await html2canvas(page2, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0B0E14',
      width: 1440,
      windowWidth: 1440,
    })
    const imgData2 = canvas2.toDataURL('image/jpeg', 0.98)
    const pdfHeight2 = page2.scrollHeight

    pdf.addPage([pdfWidth, pdfHeight2], pdfWidth > pdfHeight2 ? 'landscape' : 'portrait')
    pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight2)

    pdf.save(storeTitle + '-Report.pdf')
  } catch (err) {
    console.error('Export Error: ', err)
    alert(EXPORT_ERROR_MESSAGE)
  } finally {
    page1.style.display = 'block'
    page2.style.display = 'block'

    for (const img of tempImgs) img.remove()
    for (const chart of charts) {
      if (chart.instance) (chart.instance.canvas as HTMLCanvasElement).style.display = 'block'
    }

    document.body.classList.remove('exporting-mode')
    if (actionButtons) actionButtons.style.display = 'flex'

    button.style.pointerEvents = 'auto'
    button.style.opacity = '1'

    for (const chart of charts) {
      chart.instance?.resize()
    }

    exportScreen?.classList.remove('export-active')
  }
}

# pamm-kpi — OWNDAYS Executive Dashboard

A client-side KPI dashboard for OWNDAYS staff performance reports. Upload a
Staff KPI `.csv` export and the app parses and aggregates it entirely in the
browser — no backend, no server-side processing — rendering a dark
executive dashboard (revenue, top-up rate, void tracking, sales/workload
charts, per-staff performance cards) with a 2-page, presentation-ready PDF
export.

This is a React + Vite port of the original single-file HTML dashboard
(`reference/original-dashboard.html`), kept byte-for-behavior identical on
CSV computation logic and PDF export layout.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript (SPA, no SSR)
- [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`)
- [Chart.js](https://www.chartjs.org/) via `react-chartjs-2`
- [PapaParse](https://www.papaparse.com/) for CSV parsing
- [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas-pro](https://github.com/yorickshan/html2canvas-pro) for PDF export
- [Vitest](https://vitest.dev/) + Testing Library for unit tests
- Deployed as static assets on [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/)

## Getting started

```bash
npm install       # install dependencies
npm run dev       # start the Vite dev server
npm run build     # type-check and build to ./dist
npm test          # run the unit test suite (Vitest)
```

To try it out, run `npm run dev` and upload `sample/sample-kpi.csv` from the
app's "Upload CSV Report" button.

## Deployment

The app is deployed to **Cloudflare Workers** as static assets (`./dist`,
no server-side Worker code — see `wrangler.jsonc`). Client-side routing
falls back to `index.html` via `not_found_handling: "single-page-application"`.

### Automatic deploy (GitHub Actions)

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the
app and deploys it with [`wrangler-action`](https://github.com/cloudflare/wrangler-action).
This requires two repository secrets:

1. Go to the repo on GitHub → **Settings → Secrets and variables → Actions**.
2. Add a new repository secret named `CLOUDFLARE_API_TOKEN` (a Cloudflare
   API token with permission to deploy Workers).
3. Add a new repository secret named `CLOUDFLARE_ACCOUNT_ID` (your
   Cloudflare account ID).

Once both secrets are set, pushing to `main` deploys automatically.

### Manual deploy

```bash
npx wrangler login   # one-time browser auth against your Cloudflare account
npm run build
npm run deploy        # wraps `wrangler deploy`
```

# Palette Planner

Open http://localhost:4173. To restart the preview, run `npm start` in this folder.

## GitHub and Vercel

Import this repository into Vercel. The checked-in configuration runs `npm test` and publishes `dist` as a static site. No environment variables, installation, database, or running Node server is required on Vercel. The local preview still uses `npm start`.

Each browser and site address has its own saved workspace. To move your existing localhost data, open **Sources → Download backup** locally, then **Sources → Restore backup** at the Vercel address. Your saved plans and uploaded files stay in your browser; they are not committed to GitHub or sent to Vercel.

## The workspace

- Olive and citron visual design, responsive calendar and agenda, category filters, daily workload chart, and a contextual block panel.
- Assignments with actual due dates, editable estimates and notes, completion, removal with Undo, and a full assignment list.
- Deterministic planning with balanced or early scheduling, travel buffers, editable sleep and meal windows, study limits, and locked blocks. Regeneration places new study only in future time and avoids unnecessarily tiny final blocks.
- Configurable deadline lookahead includes work due early next week. Unfinished overdue assignments remain visible with honest unplaced-work explanations.
- Conflict and capacity reporting, including conflicts involving locked study blocks.
- Protected personal time and 25- or 50-minute focus sessions with pause/reset controls. The timer survives panel closure and reloads; completed minutes are recorded in local backup data.
- Wide and long matrix CSV imports with a review step, remembered mappings, recurring or week-specific scope, overnight splitting, and raw-file preservation.
- Term catalog CSV imports and section selection.
- Canvas ICS file imports preserving assignment dates and source time zones. Existing effort estimates and unchanged locks survive reimport.
- Immutable plan snapshots, validated local backup and restore, and downloadable PDFs with a weekly grid, agenda, and deadlines. PDFs are generated locally, with extra pages when needed; browser print remains available.
- Quick find with Ctrl+K and arrow-key/Enter navigation; N opens a new assignment. Icon buttons retain accessible names on small screens.

## Local scope

The app starts with labeled sample data and migrates the previous local version without resetting it. Records are stored in this browser. The server binds only to 127.0.0.1. Export a backup from Sources before switching browsers or clearing browser data.

Hosted accounts, shared catalogs, Supabase, live Canvas feed sync, and AI services are not connected. Recurring ICS entries are explicitly skipped with an import warning. Matrix applicability filters for class year/company are not implemented. Online interface fonts have system fallbacks. PDF export uses the locally bundled MIT-licensed pdf-lib and standard PDF fonts; unsupported non-Latin characters are replaced with question marks.

## Validation

`npm test` runs 28 checks covering deterministic placement, scheduling cutoffs, capacity, buffers, locked blocks, conflicts, CSV and ICS parsing, source time zones, invalid calendar dates, midnight boundaries, DST-safe date arithmetic, upcoming/overdue work, overlap layout, focus timer drift, migration, and backup validation.

The local browser was checked for keyboard search, assignment editor opening, focus persistence across reload, export generation, and mobile day navigation without horizontal page overflow at a 390px CSS viewport. The sample three-page PDF was generated, rendered, and visually inspected. The browser showed successful PDF generation; the automation download-event observer timed out, so receipt in the browser's download destination was not verified. JavaScript syntax checks pass.

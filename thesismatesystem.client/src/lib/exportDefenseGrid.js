/**
 * Exports a calendar-style schedule grid to XLSX using ExcelJS.
 *
 * Layout:
 *   Row 1  — title banner spanning all columns
 *   Row 2  — column headers: "TIME" | Day+Date per unique date
 *   Row 3+ — 30-min time slots (7 AM – 9 PM)
 *             Defense blocks are merged across the rows they occupy,
 *             colored by phase, with group/project/venue/panel content.
 *
 * Frozen panes lock the Time column and header row while scrolling.
 */

const SLOT_MINS  = 30
const DAY_START  = 7   // 7:00 AM
const DAY_END    = 21  // 9:00 PM (last slot starts at 8:30 PM)

const PHASE = {
  TitleDefense:    { label: 'Title Defense',    short: 'TD', bg: 'FFE9D5FF', fg: 'FF4C1D95' },
  ProposalDefense: { label: 'Proposal Defense', short: 'PD', bg: 'FFFFF3CC', fg: 'FF78350F' },
  FinalDefense:    { label: 'Final Defense',    short: 'FD', bg: 'FFD1FAE5', fg: 'FF064E3B' },
}

const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

// Always parse scheduledDateTime as UTC (append Z if missing) so the local
// date/time getters below reflect PHT — not some ambiguous Unspecified value.
function parseUtcDate(str) {
  if (!str) return new Date(NaN)
  const s = str.endsWith('Z') || str.includes('+') ? str : str + 'Z'
  return new Date(s)
}

// Use local getters so dates match what the user sees in PH time (not UTC)
function localDateKey(dt) {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fmtTime(h, m) {
  const ap = h < 12 ? 'AM' : 'PM'
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}

function borderSet(style, argb) {
  const s = { style, color: { argb } }
  return { top: s, left: s, bottom: s, right: s }
}

function hairBorder(h, m) {
  // Thicker top border on each full hour to make reading easier
  return {
    top:    { style: m === 0 ? 'thin' : 'hair',   color: { argb: 'FFCCCCCC' } },
    left:   { style: 'hair',                        color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'hair',                        color: { argb: 'FFCCCCCC' } },
    right:  { style: 'hair',                        color: { argb: 'FFCCCCCC' } },
  }
}

export async function exportDefenseGrid(yearDefenses, yearGroups, selectedYear) {
  // Dynamic import keeps the 300 KB ExcelJS bundle out of the initial load
  const ExcelJS = (await import('exceljs')).default

  // ── Prep data ─────────────────────────────────────────────────────────
  const active = yearDefenses
    .filter(d => d.status !== 'Cancelled')
    .map(d => ({
      ...d,
      dt:    parseUtcDate(d.scheduledDateTime),   // always UTC so local getters give PHT
      group: yearGroups.find(g => Number(g.id) === Number(d.capstoneGroupId)),
    }))

  if (active.length === 0) return false

  // Unique calendar dates using LOCAL getters (toISOString is UTC and shifts the date in PHT)
  const dateKeys = [...new Set(active.map(d => localDateKey(d.dt)))].sort()

  // Local midnight for each date so DAY_NAMES[dt.getDay()] is correct
  const dates = dateKeys.map(k => {
    const [y, mo, da] = k.split('-').map(Number)
    return new Date(y, mo - 1, da)
  })

  // 30-min time slots
  const slots = []
  for (let h = DAY_START; h < DAY_END; h++) {
    slots.push({ h, m: 0 })
    slots.push({ h, m: 30 })
  }

  // Map each defense to { dateKey, slotStart, slotCount }
  const defensesByDate = new Map()   // dateKey -> [{slotStart, slotCount, d}]
  for (const d of active) {
    const dk = localDateKey(d.dt)
    if (!dateKeys.includes(dk)) continue

    const totalMins = (d.dt.getHours() - DAY_START) * 60 + d.dt.getMinutes()
    const slotStart = Math.max(0, Math.floor(totalMins / SLOT_MINS))
    const slotCount = Math.max(1, Math.ceil((d.durationMinutes ?? 60) / SLOT_MINS))

    if (!defensesByDate.has(dk)) defensesByDate.set(dk, [])
    defensesByDate.get(dk).push({ slotStart, slotCount, d })
  }

  // ── Workbook setup ────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ThesisMate'

  const ws = wb.addWorksheet(`SY ${selectedYear}`, {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  })

  const NCOLS = 1 + dates.length

  // Column widths: Time | one per date
  ws.columns = [
    { width: 11 },
    ...dates.map(() => ({ width: 30 })),
  ]

  // ── Row 1 — title banner ───────────────────────────────────────────────
  ws.addRow([`DEFENSE SCHEDULE  ·  S.Y. ${selectedYear}`, ...Array(dates.length).fill(null)])
  ws.mergeCells(1, 1, 1, NCOLS)
  const titleCell = ws.getCell(1, 1)
  titleCell.value   = `DEFENSE SCHEDULE  ·  S.Y. ${selectedYear}`
  titleCell.fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1628' } }
  titleCell.font    = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FFC9A84C' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.border  = borderSet('medium', 'FF0A1628')
  ws.getRow(1).height = 30

  // ── Row 2 — day/date headers ──────────────────────────────────────────
  ws.addRow([
    'TIME',
    ...dates.map(dt =>
      `${DAY_NAMES[dt.getDay()]}\n${MONTH_NAMES[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`
    ),
  ])
  const hdrRow = ws.getRow(2)
  hdrRow.height = 40
  hdrRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    if (colNum > NCOLS) return
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162238' } }
    cell.font   = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFF0ECE4' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = borderSet('medium', 'FF0A1628')
  })

  // ── Rows 3+ — time slots ──────────────────────────────────────────────
  const ROW_OFFSET  = 2   // header rows above
  const SLOT_HEIGHT = 20

  for (let si = 0; si < slots.length; si++) {
    const { h, m } = slots[si]
    ws.addRow([fmtTime(h, m), ...Array(dates.length).fill(null)])

    const row = ws.getRow(ROW_OFFSET + si + 1)
    row.height = SLOT_HEIGHT

    // Time label cell
    const tc = row.getCell(1)
    tc.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: m === 0 ? 'FF1E3350' : 'FF162238' } }
    tc.font   = { name: 'Calibri', size: 9, bold: m === 0, color: { argb: m === 0 ? 'FFF0ECE4' : 'FF6B7D8E' } }
    tc.alignment = { horizontal: 'center', vertical: 'middle' }
    tc.border = {
      top:    { style: m === 0 ? 'thin' : 'hair', color: { argb: 'FF0A1628' } },
      left:   { style: 'medium',                   color: { argb: 'FF0A1628' } },
      bottom: { style: 'hair',                      color: { argb: 'FF0A1628' } },
      right:  { style: 'thin',                      color: { argb: 'FF0A1628' } },
    }

    // Empty day cells
    for (let di = 0; di < dates.length; di++) {
      const cell = row.getCell(2 + di)
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: m === 0 ? 'FFF5F5F5' : 'FFFFFFFF' } }
      cell.border = hairBorder(h, m)
    }
  }

  // ── Place defense blocks ───────────────────────────────────────────────
  for (let di = 0; di < dateKeys.length; di++) {
    const entries = defensesByDate.get(dateKeys[di]) ?? []
    const col = 2 + di   // 1-indexed; col 1 = Time

    for (const { slotStart, slotCount, d } of entries) {
      if (slotStart < 0 || slotStart >= slots.length) continue

      const rowStart = ROW_OFFSET + slotStart + 1  // 1-indexed
      const rowEnd   = Math.min(rowStart + slotCount - 1, ROW_OFFSET + slots.length)

      const ph = PHASE[d.phase] ?? PHASE.TitleDefense

      const panelNames = (d.panelists ?? [])
        .map(p => `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim())
        .filter(Boolean)

      const lines = [
        `[${ph.short}] ${ph.label}`,
        d.groupName,
        d.group?.projectTitle ?? '',
        `Venue: ${d.venue ?? '(TBD)'}`,
        `Duration: ${d.durationMinutes ?? 60} min`,
        panelNames.length ? `Panel Members:` : '',
        ...panelNames.map(n => `  • ${n}`),
      ].filter(Boolean)

      // Merge the rows this defense occupies
      if (rowEnd > rowStart) ws.mergeCells(rowStart, col, rowEnd, col)

      const cell = ws.getCell(rowStart, col)
      cell.value     = lines.join('\n')
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: ph.bg } }
      cell.font      = { name: 'Calibri', size: 10, color: { argb: ph.fg } }
      cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
      cell.border    = borderSet('medium', ph.fg)

      // Give merged rows a taller height so content is visible
      const contentRows = rowEnd - rowStart + 1
      const neededHeight = Math.max(SLOT_HEIGHT * contentRows, 20 + lines.length * 13)
      const perRowHeight = Math.ceil(neededHeight / contentRows)
      for (let r = rowStart; r <= rowEnd; r++) {
        ws.getRow(r).height = Math.max(ws.getRow(r).height ?? SLOT_HEIGHT, perRowHeight)
      }
    }
  }

  // ── Legend row at the bottom ───────────────────────────────────────────
  const legendRowNum = ROW_OFFSET + slots.length + 2
  ws.getRow(legendRowNum).height = 18
  Object.values(PHASE).forEach((ph, i) => {
    const col = 1 + i * 2
    if (col > NCOLS) return
    const cell = ws.getCell(legendRowNum, col)
    cell.value = `${ph.short} = ${ph.label}`
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: ph.bg } }
    cell.font  = { name: 'Calibri', bold: true, size: 9, color: { argb: ph.fg } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = borderSet('thin', ph.fg)
  })

  // ── Freeze: Time column + 2 header rows stay fixed when scrolling ──────
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2, activeCell: 'B3' }]

  // ── Download ───────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `defense-schedule-grid-${selectedYear}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return true
}

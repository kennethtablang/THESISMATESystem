// The capstone manuscript format, chapter by chapter. The editor shows every sub-topic as a
// fixed heading with its own writing area, and a chapter's completion is the share of its
// required sub-topics that have content. Adjust the lists here when the department's chapter
// format changes — the editor, the export and the server-side completion all follow them
// (the server reads the data-subsection / data-required markers written into the saved HTML).
//
// `key` doubles as the Yjs fragment name, so never rename a key once groups have written in
// it: the text under the old key would no longer be shown.
export const CHAPTER_TEMPLATES = {
  chapter1: {
    title: 'PROJECT OVERVIEW',
    subsections: [
      { key: 'projectContext',    title: 'Project Context' },
      { key: 'companyProfile',    title: 'Company Profile', optional: true },
      { key: 'objectives',        title: 'Objectives of the Project' },
      { key: 'significance',      title: 'Significance of the Study' },
      { key: 'scopeLimitation',   title: 'Scope and Limitation' },
      { key: 'definitionOfTerms', title: 'Definition of Terms' },
    ],
  },
  chapter2: {
    title: 'REVIEW OF RELATED LITERATURE AND STUDIES',
    subsections: [
      { key: 'featuresNecessary',     title: 'Features Necessary for the Development of the Project' },
      { key: 'acceptabilityStandards', title: 'Standards for Determining the Acceptability Level of the Project' },
      { key: 'rrlSummary',            title: 'Summary' },
    ],
  },
  chapter3: {
    title: 'DESIGN AND METHODOLOGY',
    subsections: [
      { key: 'researchDesign',        title: 'Research Design' },
      { key: 'dataInstrumentation',   title: 'Data Instrumentation and Procedure' },
      { key: 'populationLocale',      title: 'Population and Locale of the Project' },
      { key: 'dataAnalysis',          title: 'Data Analysis' },
      { key: 'initialPrototype',      title: 'Description of Initial Prototype' },
    ],
  },
  chapter4: {
    title: 'RESULTS AND DISCUSSION',
    subsections: [
      { key: 'projectDescription',    title: 'Project Description' },
      { key: 'projectStructure',      title: 'Project Structure' },
      { key: 'capabilitiesLimits',    title: 'Project Capabilities and Limitations' },
      { key: 'projectEvaluation',     title: 'Project Evaluation' },
    ],
  },
  chapter5: {
    title: 'SUMMARY, CONCLUSIONS AND RECOMMENDATIONS',
    subsections: [
      { key: 'summaryOfFindings',     title: 'Summary of Findings' },
      { key: 'conclusions',           title: 'Conclusions' },
      { key: 'recommendations',       title: 'Recommendations' },
    ],
  },
}

// Fragment that held a whole chapter before the sub-topic format. Its text is still shown (as
// "Earlier draft") until the students move it into the sub-topics and clear it.
export const LEGACY_FIELD = 'default'

export function templateFor(sectionKey) {
  return CHAPTER_TEMPLATES[sectionKey] ?? null
}

export function chapterNumber(sectionKey) {
  return sectionKey.replace('chapter', '')
}

// ── Saved-HTML composition ───────────────────────────────────────────────────

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * The single HTML document saved for a chapter: centred chapter title, any earlier-draft text,
 * then each sub-topic heading (with the markers the server counts) followed by its content.
 * `htmlByField` maps a fragment name to that editor's HTML.
 */
export function composeChapterHtml(sectionKey, htmlByField) {
  const tpl = templateFor(sectionKey)
  if (!tpl) return htmlByField[LEGACY_FIELD] ?? ''

  const parts = [`<h1>${escapeHtml(tpl.title)}</h1>`]
  const legacy = htmlByField[LEGACY_FIELD]
  if (legacy && !isEmptyHtml(legacy)) parts.push(legacy)

  for (const sub of tpl.subsections) {
    parts.push(
      `<h2 data-subsection="${sub.key}" data-required="${sub.optional ? 'false' : 'true'}">` +
      `${escapeHtml(sub.title)}${sub.optional ? ' (optional)' : ''}</h2>`
    )
    parts.push(htmlByField[sub.key] ?? '')
  }
  return parts.join('')
}

export function isEmptyHtml(html) {
  if (!html) return true
  if (/<img\b/i.test(html)) return false
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim()
  return text.length === 0
}

/**
 * { filled, total, percent } for a saved chapter — mirrors ManuscriptCompletion on the server,
 * so the sidebar can show completion for chapters that are not open.
 */
export function completionFromHtml(sectionKey, html) {
  const tpl = templateFor(sectionKey)
  if (!tpl) return null
  const required = tpl.subsections.filter(s => !s.optional)
  if (!html) return { filled: 0, total: required.length, percent: 0 }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const headings = [...doc.querySelectorAll('h2[data-subsection]')]
  const filledKeys = new Set()
  headings.forEach(h => {
    let body = ''
    for (let el = h.nextElementSibling; el && !el.matches('h2[data-subsection]'); el = el.nextElementSibling)
      body += el.outerHTML
    if (!isEmptyHtml(body)) filledKeys.add(h.getAttribute('data-subsection'))
  })
  const filled = required.filter(s => filledKeys.has(s.key)).length
  return { filled, total: required.length, percent: Math.round((filled / Math.max(required.length, 1)) * 100) }
}

// ── Reference citation check ────────────────────────────────────────────────
// Every entry in References must actually be cited in Chapters 1–5. Each entry's key
// identifier is the first author's last name plus the year (APA: "Dela Cruz, J. M., &
// Mendoza, R. (2024). …" → "Dela Cruz" + "2024"); an in-text citation matches when the last
// name appears with the same year shortly after it, e.g. "(Dela Cruz & Mendoza, 2024)" or
// "Dela Cruz and Mendoza (2024)".

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Reference entries (list items, or paragraphs with real text) from the References HTML. */
export function extractReferences(html) {
  if (!html) return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const lis = [...doc.querySelectorAll('li')]
  const nodes = lis.length > 0 ? lis : [...doc.querySelectorAll('p')]
  return nodes.map(n => n.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.length > 10)
}

/** { author, year } key identifier for one reference entry, or null if none can be read. */
export function referenceKey(entry) {
  const text = entry.replace(/^\s*(\[\d+\]|\d+[.)])\s*/, '').trim()   // drop "1." / "[1]" numbering
  const yearMatch = text.match(/\((\d{4}[a-z]?|n\.\s?d\.)/i) ?? text.match(/\b(1[89]\d{2}|20\d{2})[a-z]?\b/)
  const year = yearMatch ? yearMatch[1].replace(/\s/g, '').toLowerCase() : null

  // The author block ends at the first comma (person: "Last, F.") or, for an organisation
  // author, at the year / first period.
  let author = text.split(',')[0]
  if (author.length > 60 || /\(/.test(author)) author = text.split(/\s*\(|\.\s/)[0]
  author = author.replace(/\bet al\.?/i, '').trim()
  if (!author) return null
  return { author, year }
}

/**
 * Checks each reference against the chapter text. Returns one row per reference:
 *   { entry, key, status: 'cited' | 'name-only' | 'not-cited', chapters: ['1','3'] }
 * `name-only` means the last name appears but never with the reference's year.
 */
export function checkCitations(referencesHtml, chapterTexts) {
  const texts = Object.entries(chapterTexts).map(([k, t]) => [chapterNumber(k), normalize(t ?? '')])

  return extractReferences(referencesHtml).map(entry => {
    const key = referenceKey(entry)
    if (!key) return { entry, key: null, status: 'not-cited', chapters: [] }

    const name = escapeRegex(normalize(key.author))
    const withYear = key.year && !key.year.startsWith('n')
      ? new RegExp(`\\b${name}\\b[^()]{0,80}?\\(?[^()]{0,40}?${escapeRegex(key.year)}`, 'i')
      : null
    const nameOnly = new RegExp(`\\b${name}\\b`, 'i')

    const cited = [], named = []
    for (const [num, text] of texts) {
      if (withYear ? withYear.test(text) : nameOnly.test(text)) cited.push(num)
      else if (nameOnly.test(text)) named.push(num)
    }
    return {
      entry, key,
      status: cited.length ? 'cited' : named.length ? 'name-only' : 'not-cited',
      chapters: cited.length ? cited : named,
    }
  })
}

export function htmlToText(html) {
  if (!html) return ''
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''
}

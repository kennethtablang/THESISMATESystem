// Reviewer highlights over a rendered document (docx-preview output).
//
// A highlight is stored with its comment as { quote, prefix }: the selected text and up to
// PREFIX_LEN characters before it, both measured over the container's text nodes joined
// together. The prefix picks the right occurrence when the same words appear more than once.
// Marks are plain <mark data-hl> wrappers, removed and redrawn whenever the list changes.

const PREFIX_LEN = 40
const MAX_QUOTE = 2000

function buildIndex(root) {
  const nodes = []
  const starts = []
  let text = ''
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    // docx-preview injects its stylesheet into the container; its text is not document text.
    acceptNode: n => (n.parentElement?.closest('style,script') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
  let n
  while ((n = walker.nextNode())) {
    nodes.push(n)
    starts.push(text.length)
    text += n.nodeValue
  }
  return { nodes, starts, text }
}

// Offset in idx.text of a DOM boundary point (container may be a text node or an element).
function offsetOf(idx, container, offset) {
  if (container.nodeType === Node.TEXT_NODE) {
    const i = idx.nodes.indexOf(container)
    if (i >= 0) return idx.starts[i] + offset
  }
  const point = document.createRange()
  point.setStart(container, offset)
  for (let i = 0; i < idx.nodes.length; i++) {
    if (point.comparePoint(idx.nodes[i], 0) >= 0) return idx.starts[i]
  }
  return idx.text.length
}

// The current text selection inside root as an anchor, or null.
export function anchorFromSelection(root) {
  const sel = window.getSelection()
  if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null

  const idx = buildIndex(root)
  let start = offsetOf(idx, range.startContainer, range.startOffset)
  let end = offsetOf(idx, range.endContainer, range.endOffset)
  while (start < end && /\s/.test(idx.text[start])) start++
  while (end > start && /\s/.test(idx.text[end - 1])) end--
  if (end <= start) return null
  end = Math.min(end, start + MAX_QUOTE)

  return {
    quote: idx.text.slice(start, end),
    prefix: idx.text.slice(Math.max(0, start - PREFIX_LEN), start),
    rect: range.getBoundingClientRect(),
  }
}

function locate(text, quote, prefix) {
  let best = -1
  let bestScore = -1
  for (let pos = text.indexOf(quote); pos !== -1; pos = text.indexOf(quote, pos + 1)) {
    // Score = how many characters of the stored prefix match right before this occurrence.
    let score = 0
    const p = prefix ?? ''
    while (score < p.length && pos - score - 1 >= 0 && text[pos - score - 1] === p[p.length - score - 1]) score++
    if (score > bestScore) { best = pos; bestScore = score }
    if (score === p.length) break
  }
  return best
}

function hexToRgba(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return `rgba(161,98,7,${alpha})`
  const v = parseInt(m[1], 16)
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`
}

export function clearHighlights(root) {
  if (!root) return
  root.querySelectorAll('mark[data-hl]').forEach(mark => {
    const parent = mark.parentNode
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
  })
  root.normalize()
}

// highlights: [{ id, quote, prefix, color }]. activeId gets a stronger fill.
// Returns the ids that could not be found in this rendering (e.g. text since changed).
export function applyHighlights(root, highlights, activeId = null) {
  if (!root) return []
  clearHighlights(root)
  const missing = []

  for (const h of highlights) {
    if (!h.quote) continue
    const idx = buildIndex(root)
    const start = locate(idx.text, h.quote, h.prefix)
    if (start < 0) { missing.push(h.id); continue }
    const end = start + h.quote.length

    // Collect first: wrapping splits nodes and would shift the index under us.
    const targets = []
    for (let i = 0; i < idx.nodes.length; i++) {
      const ns = idx.starts[i]
      const ne = ns + idx.nodes[i].nodeValue.length
      if (ne <= start || ns >= end) continue
      targets.push({ node: idx.nodes[i], from: Math.max(start - ns, 0), to: Math.min(end - ns, ne - ns) })
    }

    const active = h.id === activeId
    for (const { node, from, to } of targets) {
      let piece = node
      if (from > 0) piece = piece.splitText(from)
      if (to - from < piece.nodeValue.length) piece.splitText(to - from)
      const mark = document.createElement('mark')
      mark.dataset.hl = String(h.id)
      mark.title = h.title ?? ''
      mark.style.background = hexToRgba(h.color, active ? 0.45 : 0.22)
      mark.style.borderBottom = `2px solid ${h.color ?? '#a16207'}`
      mark.style.color = 'inherit'
      mark.style.cursor = 'pointer'
      mark.style.padding = '0'
      piece.parentNode.insertBefore(mark, piece)
      mark.appendChild(piece)
    }
  }
  return missing
}

export function scrollToHighlight(root, id) {
  const mark = root?.querySelector(`mark[data-hl="${id}"]`)
  mark?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return !!mark
}

// Comments → highlight list, coloured by the reviewer who wrote them.
export function highlightsFromComments(comments, reviews) {
  const colorOf = id => reviews?.find(r => r.reviewerId === id)?.color ?? '#a16207'
  return (comments ?? [])
    .filter(c => c.quote)
    .map(c => ({ id: c.id, quote: c.quote, prefix: c.prefix, color: colorOf(c.author?.id), title: c.author?.fullName }))
}

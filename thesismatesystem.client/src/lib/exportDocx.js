import {
  Document, Paragraph, TextRun, AlignmentType, Packer,
  Table, TableRow, TableCell, WidthType, LineRuleType,
  Footer, PageNumber, convertInchesToTwip,
} from 'docx'

const FONT = 'Courier New'
const FONT_SIZE = 24 // 12pt in half-points
const DBL = { line: 480, lineRule: LineRuleType.AUTO }
const MARGINS = {
  top: convertInchesToTwip(1),
  right: convertInchesToTwip(1),
  bottom: convertInchesToTwip(1),
  left: convertInchesToTwip(1.5),
}

function buildDocxChildren(sections) {
  const children = []

  sections.forEach(({ label, html }, idx) => {
    children.push(new Paragraph({
      spacing: DBL,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: label, font: FONT, size: FONT_SIZE, bold: true })],
    }))

    const elements = htmlToDocxElements(html || '')
    children.push(...elements)

    if (idx < sections.length - 1) {
      children.push(new Paragraph({
        children: [new TextRun({ text: '', break: 1 })],
        pageBreakBefore: true,
      }))
    }
  })

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: FONT_SIZE })] }))
  }

  return children
}

function buildDocxDocument(children, title) {
  return new Document({
    title,
    sections: [{
      properties: {
        page: {
          margin: MARGINS,
          size: {
            width: convertInchesToTwip(8.5),
            height: convertInchesToTwip(11),
          },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      },
      children,
    }],
  })
}

export async function generateDocxBlob({ sections, title = 'Thesis Manuscript' }) {
  const children = buildDocxChildren(sections)
  const doc = buildDocxDocument(children, title)
  return Packer.toBlob(doc)
}

export async function downloadDocx({ sections, filename = 'manuscript.docx', title = 'Thesis Manuscript' }) {
  const blob = await generateDocxBlob({ sections, title })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── HTML → docx elements ──────────────────────────────────────────────────────

function htmlToDocxElements(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return Array.from(doc.body.childNodes).flatMap(nodeToElements)
}

function nodeToElements(node) {
  if (node.nodeType === Node.TEXT_NODE) return []
  if (node.nodeType !== Node.ELEMENT_NODE) return []

  const tag = node.tagName.toLowerCase()

  // Headings — bold paragraphs (avoid Word heading styles that override font)
  if (/^h[1-6]$/.test(tag)) {
    const level = parseInt(tag[1])
    const alignment = level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT
    return [new Paragraph({
      spacing: DBL,
      alignment,
      children: inlineNodes(node, { bold: true, italic: level >= 3 }),
    })]
  }

  if (tag === 'p') {
    const align = extractAlign(node)
    return [new Paragraph({
      spacing: DBL,
      alignment: align,
      children: inlineNodes(node, {}),
    })]
  }

  if (tag === 'ul') {
    return Array.from(node.children)
      .filter(c => c.tagName.toLowerCase() === 'li')
      .map(li => new Paragraph({
        spacing: DBL,
        indent: { left: convertInchesToTwip(0.5) },
        children: [
          new TextRun({ text: '• ', font: FONT, size: FONT_SIZE }),
          ...inlineNodes(li, {}),
        ],
      }))
  }

  if (tag === 'ol') {
    return Array.from(node.children)
      .filter(c => c.tagName.toLowerCase() === 'li')
      .map((li, i) => new Paragraph({
        spacing: DBL,
        indent: { left: convertInchesToTwip(0.5) },
        children: [
          new TextRun({ text: `${i + 1}. `, font: FONT, size: FONT_SIZE }),
          ...inlineNodes(li, {}),
        ],
      }))
  }

  if (tag === 'table') return [buildTable(node)]

  if (tag === 'br') {
    return [new Paragraph({ spacing: DBL, children: [new TextRun({ text: '', font: FONT, size: FONT_SIZE })] })]
  }

  // Fallback: treat as paragraph
  const children = inlineNodes(node, {})
  if (children.length === 0) return []
  return [new Paragraph({ spacing: DBL, children })]
}

function extractAlign(node) {
  const style = node.getAttribute('style') ?? ''
  const match = style.match(/text-align\s*:\s*(left|center|right|justify)/i)
  if (!match) return AlignmentType.LEFT
  switch (match[1].toLowerCase()) {
    case 'center': return AlignmentType.CENTER
    case 'right': return AlignmentType.RIGHT
    case 'justify': return AlignmentType.JUSTIFIED
    default: return AlignmentType.LEFT
  }
}

// Walk inline nodes recursively, accumulating marks at leaf text nodes
function inlineNodes(node, marks) {
  const runs = []
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      if (text) {
        runs.push(new TextRun({
          text,
          font: FONT,
          size: FONT_SIZE,
          bold: marks.bold,
          italics: marks.italic,
          underline: marks.underline ? {} : undefined,
          strike: marks.strike,
          color: marks.color,
        }))
      }
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const tag = child.tagName.toLowerCase()

    if (tag === 'br') {
      runs.push(new TextRun({ break: 1, font: FONT, size: FONT_SIZE }))
      continue
    }

    if (tag === 'img') {
      runs.push(new TextRun({ text: '[Image]', font: FONT, size: FONT_SIZE, italics: true }))
      continue
    }

    const style = child.getAttribute('style') ?? ''
    const newMarks = {
      bold: marks.bold || tag === 'strong' || tag === 'b',
      italic: marks.italic || tag === 'em' || tag === 'i',
      underline: marks.underline || tag === 'u',
      strike: marks.strike || tag === 's' || tag === 'del' || tag === 'strike',
      color: marks.color || extractColor(style),
    }

    runs.push(...inlineNodes(child, newMarks))
  }
  return runs
}

function extractColor(style) {
  const match = style.match(/(?:^|;|\s)color\s*:\s*(#[0-9a-fA-F]{3,8})/i)
  if (!match) return undefined
  // docx wants hex without #
  return match[1].replace('#', '')
}

function buildTable(tableNode) {
  const rowEls = Array.from(tableNode.querySelectorAll('tr'))
  const rows = rowEls.map(rowEl => {
    const cellEls = Array.from(rowEl.querySelectorAll('td, th'))
    const cells = cellEls.map(cellEl => {
      const isHeader = cellEl.tagName.toLowerCase() === 'th'
      return new TableCell({
        children: [new Paragraph({
          spacing: { line: 240, lineRule: LineRuleType.AUTO }, // single space inside cells
          children: inlineNodes(cellEl, { bold: isHeader }),
        })],
      })
    })
    return new TableRow({ children: cells })
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

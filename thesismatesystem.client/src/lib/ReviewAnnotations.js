import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// Adviser/panel highlights are stored on the server (not in the students' document), so a
// reviewer can mark text without being able to change it and the students cannot erase a
// reviewer's highlight. Each one is anchored by its quoted text plus the text just before it,
// and drawn here as a decoration in the reviewer's colour.

export const reviewAnnotationsKey = new PluginKey('review-annotations')

// Plain text of the doc with a map back to ProseMirror positions. Blocks are separated by "\n"
// so a quote never silently runs across two paragraphs.
export function docText(doc) {
  let text = ''
  const segs = [] // { start, length, pos }
  doc.descendants((node, pos) => {
    if (node.isText) {
      segs.push({ start: text.length, length: node.text.length, pos })
      text += node.text
    } else if (node.isBlock && text.length > 0 && !text.endsWith('\n')) {
      text += '\n'
    }
  })
  return { text, segs }
}

function offsetToPos(offset, segs, isEnd) {
  for (const s of segs) {
    if (offset >= s.start && (isEnd ? offset <= s.start + s.length : offset < s.start + s.length))
      return s.pos + (offset - s.start)
  }
  return null
}

function posToOffset(pos, segs) {
  for (const s of segs) {
    if (pos >= s.pos && pos <= s.pos + s.length) return s.start + (pos - s.pos)
  }
  return null
}

/** { quote, prefix } for the range from..to — what a new highlight is anchored by. */
export function anchorForRange(doc, from, to) {
  if (from === to) return null
  const { text, segs } = docText(doc)
  const a = posToOffset(from, segs)
  const b = posToOffset(to, segs)
  if (a == null || b == null || b <= a) return null
  return { quote: text.slice(a, b), prefix: text.slice(Math.max(0, a - 40), a) }
}

function locate(text, { quote, prefix }) {
  if (!quote) return -1
  if (prefix) {
    const i = text.indexOf(prefix + quote)
    if (i >= 0) return i + prefix.length
  }
  return text.indexOf(quote)
}

function build(doc, annotations, activeId) {
  if (!annotations?.length) return DecorationSet.empty
  const { text, segs } = docText(doc)
  const decos = []
  for (const a of annotations) {
    const start = locate(text, a)
    if (start < 0) continue
    const from = offsetToPos(start, segs, false)
    const to = offsetToPos(start + a.quote.length, segs, true)
    if (from == null || to == null || to <= from) continue
    const active = a.id === activeId
    decos.push(Decoration.inline(from, to, {
      class: 'ms-review-mark',
      'data-annot-id': String(a.id),
      style: `background:${a.color}${active ? '55' : '33'};border-bottom:2px solid ${a.color};`,
    }))
  }
  return DecorationSet.create(doc, decos)
}

export const ReviewAnnotations = Extension.create({
  name: 'reviewAnnotations',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: reviewAnnotationsKey,
        state: {
          init: () => ({ annotations: [], activeId: null, decos: DecorationSet.empty }),
          apply(tr, value, _old, newState) {
            const meta = tr.getMeta(reviewAnnotationsKey)
            if (meta) {
              const next = { ...value, ...meta }
              return { ...next, decos: build(newState.doc, next.annotations, next.activeId) }
            }
            if (tr.docChanged) return { ...value, decos: build(newState.doc, value.annotations, value.activeId) }
            return value
          },
        },
        props: {
          decorations(state) {
            return reviewAnnotationsKey.getState(state)?.decos
          },
        },
      }),
    ]
  },
})

/** Push the latest highlights (and which one is selected) into an editor. */
export function setReviewAnnotations(editor, annotations, activeId) {
  if (!editor || editor.isDestroyed) return
  try {
    editor.view.dispatch(editor.state.tr.setMeta(reviewAnnotationsKey, { annotations, activeId }))
  } catch {
    // view not mounted yet — the next render pushes the highlights again
  }
}

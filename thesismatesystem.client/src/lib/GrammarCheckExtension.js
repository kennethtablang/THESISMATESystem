import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const DEBOUNCE_MS = 2000
const MAX_CHARS = 20_000
const LT_URL = 'https://api.languagetool.org/v2/check'

const grammarCheckKey = new PluginKey('grammarCheck')

// Walk the ProseMirror doc, collecting text segments with their PM positions.
// Block boundaries become "\n\n" so LanguageTool sees paragraph structure.
function extractText(doc) {
  let text = ''
  const map = [] // { start: textOffset, length, pmFrom: pmPos }

  doc.descendants((node, pos) => {
    if (node.isText) {
      map.push({ start: text.length, length: node.text.length, pmFrom: pos })
      text += node.text
    } else if (node.isBlock && text.length > 0) {
      text += '\n\n'
    }
  })

  return { text, map }
}

// Convert a plain-text character offset to a ProseMirror position.
function offsetToPm(offset, map) {
  for (const seg of map) {
    if (offset >= seg.start && offset < seg.start + seg.length) {
      return seg.pmFrom + (offset - seg.start)
    }
  }
  return null
}

async function fetchMatches(text, language) {
  const body = new URLSearchParams({ text, language, enabledOnly: 'false' })
  const resp = await fetch(LT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!resp.ok) return []
  const data = await resp.json()
  return data.matches ?? []
}

function buildDecorations(doc, map, matches) {
  const decos = []
  const docSize = doc.content.size

  for (const match of matches) {
    const from = offsetToPm(match.offset, map)
    const to   = offsetToPm(match.offset + match.length, map)
    if (from == null || to == null || from >= to) continue
    if (from < 0 || to > docSize) continue

    const isSpelling = match.rule?.issueType === 'misspelling'
    const suggestions = (match.replacements ?? [])
      .slice(0, 5)
      .map(r => r.value)
      .join(', ')

    const title = suggestions
      ? `${match.message}\nSuggestions: ${suggestions}`
      : match.message

    decos.push(
      Decoration.inline(from, to, {
        class: isSpelling ? 'lt-spelling' : 'lt-grammar',
        title,
      })
    )
  }

  try {
    return DecorationSet.create(doc, decos)
  } catch {
    return DecorationSet.empty
  }
}

export const GrammarCheck = Extension.create({
  name: 'grammarCheck',

  addOptions() {
    return { language: 'en-US' }
  },

  addProseMirrorPlugins() {
    const opts = this.options
    let timer = null
    let lastText = ''

    return [
      new Plugin({
        key: grammarCheckKey,

        state: {
          init: () => DecorationSet.empty,
          apply(tr, decos) {
            const meta = tr.getMeta(grammarCheckKey)
            if (meta !== undefined) return meta
            if (tr.docChanged) return decos.map(tr.mapping, tr.doc)
            return decos
          },
        },

        props: {
          decorations(state) {
            return grammarCheckKey.getState(state)
          },
        },

        view(editorView) {
          function schedule() {
            clearTimeout(timer)
            timer = setTimeout(async () => {
              const { text, map } = extractText(editorView.state.doc)
              if (!text.trim() || text === lastText) return
              lastText = text

              try {
                const matches = await fetchMatches(
                  text.slice(0, MAX_CHARS),
                  opts.language
                )
                // Use map against current doc — minor position drift is acceptable
                // when the user typed during the API round-trip; next debounce corrects it.
                const currentDoc = editorView.state.doc
                const decos = buildDecorations(currentDoc, map, matches)
                editorView.dispatch(
                  editorView.state.tr.setMeta(grammarCheckKey, decos)
                )
              } catch {
                // Silently ignore network / rate-limit errors
              }
            }, DEBOUNCE_MS)
          }

          return {
            update(view, prevState) {
              if (view.state.doc !== prevState.doc) schedule()
            },
            destroy() {
              clearTimeout(timer)
            },
          }
        },
      }),
    ]
  },
})

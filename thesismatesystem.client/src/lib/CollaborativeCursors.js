import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const KEY = new PluginKey('collab-cursors')

export const CollaborativeCursors = Extension.create({
  name: 'collaborativeCursors',

  addOptions() {
    return { provider: null }
  },

  addProseMirrorPlugins() {
    const provider = this.options.provider
    if (!provider) return []
    const { awareness } = provider

    return [
      new Plugin({
        key: KEY,

        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, decos, _old, newState) {
            if (tr.getMeta(KEY) || tr.docChanged) {
              return buildDecos(newState, awareness)
            }
            // Map existing decorations through position changes (inserts/deletes)
            return decos.map(tr.mapping, tr.doc)
          },
        },

        view(editorView) {
          const broadcastCursor = () => {
            const { from, to } = editorView.state.selection
            awareness.setLocalStateField('cursor', { from, to })
          }

          const onAwarenessChange = () => {
            editorView.dispatch(editorView.state.tr.setMeta(KEY, true))
          }

          awareness.on('change', onAwarenessChange)
          broadcastCursor()

          return {
            update(view, prevState) {
              if (!view.state.selection.eq(prevState.selection)) {
                broadcastCursor()
              }
            },
            destroy() {
              awareness.off('change', onAwarenessChange)
              awareness.setLocalStateField('cursor', null)
            },
          }
        },

        props: {
          decorations(state) {
            return KEY.getState(state)
          },
        },
      }),
    ]
  },
})

function buildDecos(state, awareness) {
  const decos = []
  const docSize = state.doc.content.size

  awareness.getStates().forEach((s, clientId) => {
    if (clientId === awareness.clientID) return
    const { user, cursor } = s
    if (!user || !cursor) return

    const color = user.color ?? '#c9a84c'
    const name = user.name ?? 'User'
    const from = clamp(cursor.from, 0, docSize)
    const to = clamp(cursor.to, 0, docSize)

    if (from === to) {
      decos.push(
        Decoration.widget(from, () => makeCursorEl(name, color), {
          side: 1,
          key: `cur-${clientId}`,
        })
      )
    } else {
      const lo = Math.min(from, to)
      const hi = Math.max(from, to)
      decos.push(
        Decoration.inline(lo, hi, {
          style: `background-color:${color}30; border-bottom:1.5px solid ${color};`,
          class: 'collab-selection',
        }, { key: `sel-${clientId}` })
      )
      decos.push(
        Decoration.widget(hi, () => makeCursorEl(name, color), {
          side: 1,
          key: `cur-${clientId}`,
        })
      )
    }
  })

  return DecorationSet.create(state.doc, decos)
}

function makeCursorEl(name, color) {
  const wrap = document.createElement('span')
  wrap.style.cssText = 'position:relative;pointer-events:none;'

  const caret = document.createElement('span')
  caret.style.cssText = `position:absolute;left:-1px;top:0;height:1.3em;border-left:2px solid ${color};pointer-events:none;`

  const label = document.createElement('span')
  label.textContent = name
  label.style.cssText = [
    'position:absolute',
    'top:-1.6em',
    'left:-1px',
    `background:${color}`,
    'color:#fff',
    'font-size:10px',
    'font-weight:600',
    'font-family:ui-sans-serif,system-ui,sans-serif',
    'padding:1px 6px',
    'border-radius:3px 3px 3px 0',
    'white-space:nowrap',
    'user-select:none',
    'pointer-events:none',
    'line-height:1.6',
    'z-index:20',
  ].join(';')

  wrap.appendChild(caret)
  wrap.appendChild(label)
  return wrap
}

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi)

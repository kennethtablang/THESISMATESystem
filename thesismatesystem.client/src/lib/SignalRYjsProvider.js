import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness'

/**
 * Connects a Y.Doc to the ManuscriptHub SignalR connection.
 * Relays Yjs binary updates and awareness over WebSocket.
 */
export class SignalRYjsProvider {
  constructor(ydoc, groupId, sectionKey, connection) {
    this.ydoc = ydoc
    this.awareness = new Awareness(ydoc)
    this.groupId = groupId
    this.sectionKey = sectionKey
    this.connection = connection
    this._connected = false
    this._docUpdateHandler = null
    this._awarenessUpdateHandler = null
  }

  setUser(user) {
    this.awareness.setLocalStateField('user', {
      name: user.name,
      color: user.color,
    })
  }

  async connect() {
    this._connected = true

    // Forward local Y.Doc updates to the hub.
    // For large updates (paste operations) we send the full Yjs state instead of
    // the incremental delta, because incremental updates carry implicit dependencies:
    // if a receiver is missing any prior update, they can never apply subsequent
    // ones. A full-state update has no dependencies and always converges.
    const FULL_STATE_THRESHOLD = 10 * 1024 // 10 KB
    this._docUpdateHandler = (update, origin) => {
      if (origin === this || !this._connected) return
      const payload = update.byteLength > FULL_STATE_THRESHOLD
        ? Y.encodeStateAsUpdate(this.ydoc)
        : update
      const b64 = _toB64(payload)
      this.connection.invoke('SendDocUpdate', this.groupId, this.sectionKey, b64).catch(console.warn)
    }
    this.ydoc.on('update', this._docUpdateHandler)

    // Forward local awareness to the hub
    this._awarenessUpdateHandler = ({ added, updated, removed }) => {
      if (!this._connected) return
      const clients = [...added, ...updated, ...removed]
      const encoded = encodeAwarenessUpdate(this.awareness, clients)
      const b64 = _toB64(encoded)
      this.connection.invoke('SendAwareness', this.groupId, this.sectionKey, b64).catch(() => {})
    }
    this.awareness.on('update', this._awarenessUpdateHandler)

    // Handle incoming full state on join (from DB)
    this.connection.on('ReceiveFullState', (b64) => {
      if (!b64) return
      Y.applyUpdate(this.ydoc, _fromB64(b64), this)
    })

    // Handle incoming incremental updates from peers
    this.connection.on('ReceiveDocUpdate', (b64) => {
      Y.applyUpdate(this.ydoc, _fromB64(b64), this)
    })

    // Handle incoming awareness updates from peers
    this.connection.on('ReceiveAwareness', (b64) => {
      applyAwarenessUpdate(this.awareness, _fromB64(b64), this)
    })

    // Join the room
    await this.connection.invoke('JoinSection', this.groupId, this.sectionKey)
  }

  disconnect() {
    this._connected = false

    if (this._docUpdateHandler) this.ydoc.off('update', this._docUpdateHandler)
    if (this._awarenessUpdateHandler) this.awareness.off('update', this._awarenessUpdateHandler)

    removeAwarenessStates(this.awareness, [this.ydoc.clientID], 'disconnect')
    this.awareness.destroy()

    this.connection.off('ReceiveFullState')
    this.connection.off('ReceiveDocUpdate')
    this.connection.off('ReceiveAwareness')

    this.connection.invoke('LeaveSection', this.groupId, this.sectionKey).catch(() => {})
  }

  get synced() {
    return this._connected
  }
}

function _toB64(uint8) {
  let binary = ''
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
  return btoa(binary)
}

function _fromB64(b64) {
  const binary = atob(b64)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return arr
}

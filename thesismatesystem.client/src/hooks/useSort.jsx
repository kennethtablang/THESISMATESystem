import { useState, useMemo } from 'react'

export function useSort(data, defaultKey = null, defaultDir = 'asc') {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir)

  function toggle(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey || !data?.length) return data ?? []
    return [...data].sort((a, b) => {
      const av = resolve(a, sortKey)
      const bv = resolve(b, sortKey)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base', numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  return { sorted, sortKey, sortDir, toggle }
}

// Support dot-notation keys like "adviser.fullName"
function resolve(obj, key) {
  return key.split('.').reduce((o, k) => o?.[k], obj)
}

export function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) {
    return (
      <span style={{ opacity: 0.3, fontSize: 10, marginLeft: 4, userSelect: 'none' }}>↕</span>
    )
  }
  return (
    <span style={{ fontSize: 10, marginLeft: 4, color: '#c9a84c', userSelect: 'none' }}>
      {sortDir === 'asc' ? '↑' : '↓'}
    </span>
  )
}

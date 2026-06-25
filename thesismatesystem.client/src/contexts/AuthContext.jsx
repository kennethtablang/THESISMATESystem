import { createContext, useContext, useReducer, useEffect } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext(null)

const initialState = {
  user: null,
  token: null,
  loading: true,
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.user, token: action.token, loading: false }
    case 'LOGOUT':
      return { ...initialState, loading: false }
    case 'LOADED':
      return { ...state, loading: false }
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } }
    default:
      return state
  }
}

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = parseJwt(token)
  if (!payload?.exp) return true
  return Date.now() / 1000 > payload.exp
}

function clearSession() {
  sessionStorage.removeItem('tm_token')
  sessionStorage.removeItem('tm_user')
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Restore session only if the stored JWT is still valid
  useEffect(() => {
    const token = sessionStorage.getItem('tm_token')
    const stored = sessionStorage.getItem('tm_user')
    if (token && stored) {
      if (isTokenExpired(token)) {
        clearSession()
        dispatch({ type: 'LOADED' })
      } else {
        try {
          const user = JSON.parse(stored)
          dispatch({ type: 'LOGIN', user, token })
        } catch {
          clearSession()
          dispatch({ type: 'LOADED' })
        }
      }
    } else {
      dispatch({ type: 'LOADED' })
    }
  }, [])

  // Periodically check whether the active token has expired (handles long-idle tabs)
  useEffect(() => {
    if (!state.token) return
    const id = setInterval(() => {
      if (isTokenExpired(state.token)) {
        clearSession()
        dispatch({ type: 'LOGOUT' })
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [state.token])

  function normalizeUser(user) {
    const fallback = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
    return {
      ...user,
      fullName: user.fullName ?? fallback,
    }
  }

  async function login(email, password) {
    const res = await authService.login({ email, password })
    if (res.twoFactorRequired) {
      return { twoFactorRequired: true, tempUserId: res.tempUserId }
    }
    const user = normalizeUser(res.user)
    sessionStorage.setItem('tm_token', res.token)
    sessionStorage.setItem('tm_user', JSON.stringify(user))
    dispatch({ type: 'LOGIN', user, token: res.token })
    return user
  }

  async function register(data) {
    // Returns { message, email } — no token until email is verified
    return await authService.register(data)
  }

  function logout() {
    sessionStorage.removeItem('tm_token')
    sessionStorage.removeItem('tm_user')
    dispatch({ type: 'LOGOUT' })
  }

  function setAuth(token, user) {
    const normalized = normalizeUser(user)
    sessionStorage.setItem('tm_token', token)
    sessionStorage.setItem('tm_user', JSON.stringify(normalized))
    dispatch({ type: 'LOGIN', user: normalized, token })
  }

  function updateUser(payload) {
    const updated = { ...state.user, ...payload }
    sessionStorage.setItem('tm_user', JSON.stringify(updated))
    dispatch({ type: 'UPDATE_USER', payload })
  }

  const value = {
    user: state.user,
    token: state.token,
    loading: state.loading,
    login,
    register,
    logout,
    setAuth,
    updateUser,
    isRole: (role) => state.user?.role === role,
    hasRole: (...roles) => roles.includes(state.user?.role),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

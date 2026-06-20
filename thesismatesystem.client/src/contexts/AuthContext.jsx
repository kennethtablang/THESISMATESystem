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

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const token = localStorage.getItem('tm_token')
    const stored = localStorage.getItem('tm_user')
    if (token && stored) {
      try {
        const user = JSON.parse(stored)
        dispatch({ type: 'LOGIN', user, token })
      } catch {
        localStorage.removeItem('tm_token')
        localStorage.removeItem('tm_user')
        dispatch({ type: 'LOADED' })
      }
    } else {
      dispatch({ type: 'LOADED' })
    }
  }, [])

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
    localStorage.setItem('tm_token', res.token)
    localStorage.setItem('tm_user', JSON.stringify(user))
    dispatch({ type: 'LOGIN', user, token: res.token })
    return user
  }

  async function register(data) {
    // Returns { message, email } — no token until email is verified
    return await authService.register(data)
  }

  function logout() {
    localStorage.removeItem('tm_token')
    localStorage.removeItem('tm_user')
    dispatch({ type: 'LOGOUT' })
  }

  function setAuth(token, user) {
    const normalized = normalizeUser(user)
    localStorage.setItem('tm_token', token)
    localStorage.setItem('tm_user', JSON.stringify(normalized))
    dispatch({ type: 'LOGIN', user: normalized, token })
  }

  function updateUser(payload) {
    const updated = { ...state.user, ...payload }
    localStorage.setItem('tm_user', JSON.stringify(updated))
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

const AUTH_STORAGE_KEY = 'zenpoll.auth.user'

function readStoredUser() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawUser = window.localStorage.getItem(AUTH_STORAGE_KEY)

    if (!rawUser) {
      return null
    }

    return JSON.parse(rawUser)
  } catch {
    return null
  }
}

export function getAuthUser() {
  return readStoredUser()
}

export function isAuthenticated() {
  return Boolean(readStoredUser())
}

export function signInUser({ email, password }) {
  const safeEmail = String(email ?? '').trim().toLowerCase()
  const safePassword = String(password ?? '')

  if (!safeEmail || !safePassword) {
    throw new Error('Email and password are required.')
  }

  const user = {
    email: safeEmail,
    displayName: safeEmail.split('@')[0] || 'Creative User',
    signedInAt: new Date().toISOString(),
    mode: 'login',
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  return user
}

export function registerUser({ name, email, password }) {
  const safeName = String(name ?? '').trim()
  const safeEmail = String(email ?? '').trim().toLowerCase()
  const safePassword = String(password ?? '')

  if (!safeName || !safeEmail || !safePassword) {
    throw new Error('Name, email, and password are required.')
  }

  const user = {
    name: safeName,
    email: safeEmail,
    displayName: safeName,
    signedInAt: new Date().toISOString(),
    mode: 'register',
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  return user
}

export function signOutUser() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}
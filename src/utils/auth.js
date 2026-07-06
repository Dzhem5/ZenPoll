import { supabase } from './supabase.js'

export async function getAuthState() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return {
    authenticated: Boolean(data.session),
    session: data.session ?? null,
    user: data.session?.user ?? null,
  }
}

export async function signInUser({ email, password }) {
  const safeEmail = String(email ?? '').trim().toLowerCase()
  const safePassword = String(password ?? '')

  if (!safeEmail || !safePassword) {
    throw new Error('Email and password are required.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: safeEmail,
    password: safePassword,
  })

  if (error) {
    throw error
  }

  return data
}

export async function registerUser({ name, email, password }) {
  const safeName = String(name ?? '').trim()
  const safeEmail = String(email ?? '').trim().toLowerCase()
  const safePassword = String(password ?? '')

  if (!safeName || !safeEmail || !safePassword) {
    throw new Error('Name, email, and password are required.')
  }

  const { data, error } = await supabase.auth.signUp({
    email: safeEmail,
    password: safePassword,
    options: {
      data: {
        full_name: safeName,
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
import headerTemplate from './header.html?raw'
import './header.css'
import { interpolateTemplate } from '../../utils/template.js'

export function renderHeader(pathname = '/', authState = {}) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  const authenticated = Boolean(authState.authenticated)
  const user = authState.user ?? null

  const guestNavMarkup = `
    <a class="btn btn-vintage btn-sm ms-lg-2 mt-2 mt-lg-0" href="/login" data-link>
      <i class="bi bi-person-circle me-2"></i>Login / Register
    </a>
  `

  const authedNavMarkup = `
    <a class="nav-link ${normalizedPath === '/dashboard' ? 'active' : ''}" href="/dashboard" data-link>Dashboard</a>
    <a class="btn btn-outline-vintage btn-sm ms-lg-2 mt-2 mt-lg-0" href="/" data-auth-logout="true">
      <i class="bi bi-box-arrow-right me-2"></i>${user?.user_metadata?.full_name ? `Logout ${user.user_metadata.full_name}` : 'Logout'}
    </a>
  `

  return interpolateTemplate(headerTemplate, {
    navigationMarkup: authenticated ? authedNavMarkup : guestNavMarkup,
  })
}

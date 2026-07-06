import headerTemplate from './header.html?raw'
import './header.css'
import { interpolateTemplate } from '../../utils/template.js'
import { getAuthUser, isAuthenticated } from '../../utils/auth.js'

export function renderHeader(pathname = '/') {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  const authenticated = isAuthenticated()
  const user = getAuthUser()

  return interpolateTemplate(headerTemplate, {
    homeActive: normalizedPath === '/' ? 'active' : '',
    dashboardActive: normalizedPath === '/dashboard' ? 'active' : '',
    loginActive: normalizedPath === '/login' ? 'active' : '',
    pollsActive: normalizedPath.startsWith('/polls') ? 'active' : '',
    authActionHref: authenticated ? '/' : '/login',
    authActionClass: authenticated ? 'btn btn-outline-vintage btn-sm ms-lg-2 mt-2 mt-lg-0' : 'btn btn-vintage btn-sm ms-lg-2 mt-2 mt-lg-0',
    authActionIcon: authenticated ? 'bi-box-arrow-right' : 'bi-person-circle',
    authActionLabel: authenticated ? (user?.displayName ? `Logout ${user.displayName}` : 'Logout') : 'Login / Register',
    authActionData: authenticated ? 'data-auth-logout="true"' : 'data-link',
  })
}

import headerTemplate from './header.html?raw'
import './header.css'
import { interpolateTemplate } from '../../utils/template.js'

export function renderHeader(pathname = '/') {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'

  return interpolateTemplate(headerTemplate, {
    homeActive: normalizedPath === '/' ? 'active' : '',
    dashboardActive: normalizedPath === '/dashboard' ? 'active' : '',
    loginActive: normalizedPath === '/login' ? 'active' : '',
    pollsActive: normalizedPath.startsWith('/polls') ? 'active' : '',
  })
}

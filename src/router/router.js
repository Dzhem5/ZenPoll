import { renderHeader } from '../components/header/header.js'
import { renderFooter } from '../components/footer/footer.js'
import { routes } from './routes.js'

function normalizePath(pathname) {
  return pathname.replace(/\/+$/, '') || '/'
}

function matchRoute(pathname) {
  const normalizedPath = normalizePath(pathname)

  for (const route of routes) {
    const match = normalizedPath.match(route.pattern)

    if (match) {
      return {
        load: route.load,
        params: match.groups ?? {},
      }
    }
  }

  return null
}

export function createRouter(appRoot) {
  async function render() {
    const pathname = normalizePath(window.location.pathname)
    const route = matchRoute(pathname)

    if (!route) {
      window.history.replaceState({}, '', '/')
      return render()
    }

    const pageModule = await route.load()
    const renderPage = pageModule.renderPage ?? (() => '<div class="p-4">Page not implemented.</div>')

    document.title = route.params.id ? `ZenPoll | Poll ${route.params.id}` : 'ZenPoll'

    appRoot.innerHTML = `
      ${renderHeader(pathname)}
      <main class="page-shell">
        <div class="container">
          <div id="page-root" class="page-frame"></div>
        </div>
      </main>
      ${renderFooter()}
    `

    const pageRoot = appRoot.querySelector('#page-root')
    pageRoot.innerHTML = renderPage(route.params)

    if (typeof pageModule.mount === 'function') {
      pageModule.mount(pageRoot, route.params)
    }
  }

  function handleClick(event) {
    const anchor = event.target.closest('a[data-link]')

    if (!anchor || anchor.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    const targetUrl = new URL(anchor.href, window.location.origin)

    if (targetUrl.origin !== window.location.origin) {
      return
    }

    event.preventDefault()

    if (normalizePath(targetUrl.pathname) === normalizePath(window.location.pathname)) {
      return
    }

    window.history.pushState({}, '', targetUrl.pathname)
    render()
  }

  function start() {
    document.addEventListener('click', handleClick)
    window.addEventListener('popstate', render)
    render()
  }

  return {
    start,
  }
}

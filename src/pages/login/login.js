import loginTemplate from './login.html?raw'
import './login.css'

export function renderPage() {
  return loginTemplate
}

export function mount(pageRoot) {
  const form = pageRoot.querySelector('[data-login-form]')
  const status = pageRoot.querySelector('[data-login-status]')

  if (!form || !status) {
    return
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    status.textContent = 'This login screen is wired for routing and component testing.'
  })
}

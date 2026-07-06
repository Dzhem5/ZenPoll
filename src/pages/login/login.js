import loginTemplate from './login.html?raw'
import './login.css'
import { registerUser, signInUser } from '../../utils/auth.js'

export function renderPage() {
  return loginTemplate
}

export function mount(pageRoot, _params = {}, context = {}) {
  const status = pageRoot.querySelector('[data-auth-status]')
  const tabs = Array.from(pageRoot.querySelectorAll('[data-auth-tab]'))
  const forms = Array.from(pageRoot.querySelectorAll('[data-auth-form]'))

  if (!status || tabs.length === 0 || forms.length === 0) {
    return
  }

  const { navigate } = context

  function setActivePanel(panelName) {
    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.authTab === panelName)
    })

    forms.forEach((form) => {
      form.classList.toggle('active', form.dataset.authForm === panelName)
    })

    status.textContent = panelName === 'register' ? 'Create a new account to continue.' : 'Login to continue to the dashboard.'
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActivePanel(tab.dataset.authTab))
  })

  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault()

      const formData = new FormData(form)
      const payload = Object.fromEntries(formData.entries())

      try {
        if (form.dataset.authForm === 'register') {
          const user = registerUser(payload)
          status.textContent = `Welcome, ${user.displayName}. Your account is ready.`
        } else {
          const user = signInUser(payload)
          status.textContent = `Welcome back, ${user.displayName}.`
        }

        if (typeof navigate === 'function') {
          navigate('/dashboard', { replace: true })
        }
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Authentication failed.'
      }
    })
  })

  setActivePanel('login')
}

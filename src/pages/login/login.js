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
    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      const formData = new FormData(form)
      const payload = Object.fromEntries(formData.entries())

      try {
        if (form.dataset.authForm === 'register') {
          const result = await registerUser(payload)
          const fullName = result.user?.user_metadata?.full_name ?? payload.name ?? 'your account'

          if (result.session) {
            status.textContent = `Welcome, ${fullName}. Sending you to the dashboard.`
            if (typeof navigate === 'function') {
              navigate('/dashboard', { replace: true })
            }
          } else {
            status.textContent = 'Account created. Check your inbox to confirm your email before signing in.'
          }
        } else {
          const result = await signInUser(payload)
          const displayName = result.user?.user_metadata?.full_name ?? result.user?.email ?? 'there'
          status.textContent = `Welcome back, ${displayName}. Redirecting to the dashboard.`

          if (typeof navigate === 'function') {
            navigate('/dashboard', { replace: true })
          }
        }
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Authentication failed.'
      }
    })
  })

  setActivePanel('login')
}

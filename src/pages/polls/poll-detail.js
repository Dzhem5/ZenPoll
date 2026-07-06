import pollDetailTemplate from './poll-detail.html?raw'
import './poll-detail.css'
import { interpolateTemplate } from '../../utils/template.js'

export function renderPage(params = {}) {
  return interpolateTemplate(pollDetailTemplate, {
    pollId: params.id ?? 'unknown',
  })
}

export function mount(pageRoot) {
  const result = pageRoot.querySelector('[data-poll-result]')
  const options = Array.from(pageRoot.querySelectorAll('[data-option]'))

  if (!result || options.length === 0) {
    return
  }

  options.forEach((option) => {
    option.addEventListener('click', () => {
      result.textContent = `Preview updated for: ${option.dataset.option}`
    })
  })
}

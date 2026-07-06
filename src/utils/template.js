export function interpolateTemplate(template, values = {}) {
  return Object.entries(values).reduce((result, [token, value]) => {
    const pattern = new RegExp(`{{\\s*${token}\\s*}}`, 'g')
    return result.replace(pattern, String(value))
  }, template)
}

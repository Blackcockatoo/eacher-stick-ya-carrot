import { renderChecklist } from './checklist'

// Render checklist when running in browser context.
if (typeof document !== 'undefined') {
  const root = document.getElementById('root') || document.body
  renderChecklist(root)
}

export {}

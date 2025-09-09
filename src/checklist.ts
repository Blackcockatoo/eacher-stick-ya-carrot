export interface ChecklistTask {
  id: number
  text: string
  points: number
}

export interface ChecklistGroup {
  title: string
  tasks: ChecklistTask[]
}

const defaultGroups: ChecklistGroup[] = [
  {
    title: 'Readiness',
    tasks: [
      { id: 1, text: 'Safe hands & feet', points: 2 },
      { id: 2, text: 'Ask for help', points: 2 },
    ],
  },
  {
    title: 'Self‑management',
    tasks: [
      { id: 3, text: 'Try the steps', points: 2 },
      { id: 4, text: 'Take breaks', points: 1 },
      { id: 5, text: 'Fix mistakes', points: 1 },
    ],
  },
]

interface StoredTask {
  completed: boolean
  completedAt?: string
}

const TASKS_KEY = 'gcc_tasks'
const NOTES_KEY = 'gcc_notes'

function loadTaskState(): Record<number, StoredTask> {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveTaskState(state: Record<number, StoredTask>) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(state))
  } catch {
    /* noop */
  }
}

function loadNotes(): string {
  try {
    return localStorage.getItem(NOTES_KEY) || ''
  } catch {
    return ''
  }
}

function saveNotes(text: string) {
  try {
    localStorage.setItem(NOTES_KEY, text)
  } catch {
    /* noop */
  }
}

function download(filename: string, text: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function exportCSV(groups: ChecklistGroup[], state: Record<number, StoredTask>, note: string) {
  const header = 'id,text,completed,timestamp,points,note'
  const rows = groups.flatMap((g) =>
    g.tasks.map((t) => {
      const s = state[t.id]
      return [
        t.id,
        t.text,
        s?.completed ? 'yes' : 'no',
        s?.completedAt ?? '',
        t.points,
        note.replace(/\n/g, ' '),
      ]
    }),
  )
  const csv = [
    header,
    ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  download('checklist.csv', csv)
}

function exportHTML(groups: ChecklistGroup[], state: Record<number, StoredTask>, note: string) {
  const total = groups
    .flatMap((g) => g.tasks)
    .filter((t) => state[t.id]?.completed)
    .reduce((sum, t) => sum + t.points, 0)

  const canvas = document.createElement('canvas')
  canvas.width = 300
  canvas.height = 150
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.font = '16px sans-serif'
  ctx.fillText('Carrot Summary', 10, 30)
  ctx.fillText(`Points: ${total}`, 10, 60)
  ctx.fillText(`Notes: ${note.slice(0, 20)}`, 10, 90)
  const data = canvas.toDataURL()

  const html = `<!DOCTYPE html><html><body><h1>Checklist Summary</h1><canvas id="c" width="300" height="150"></canvas><script>const img=new Image();img.onload=()=>document.getElementById('c').getContext('2d').drawImage(img,0,0);img.src='${data}';</script></body></html>`
  download('checklist.html', html)
}

function importJSON() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        if (!confirm('Importing will delete existing data. Continue?')) return
        if (data.tasks) saveTaskState(data.tasks)
        if (typeof data.notes === 'string') saveNotes(data.notes)
        location.reload()
      } catch {
        alert('Invalid JSON')
      }
    }
    reader.readAsText(file)
  })
  input.click()
}

/**
 * Render a grouped checklist with spacious layout.
 * Export and Settings actions sit inside a secondary menu.
 */
export function renderChecklist(container: HTMLElement, groups: ChecklistGroup[] = defaultGroups) {
  const state = loadTaskState()
  const note = loadNotes()

  const list = document.createElement('div')
  list.className = 'space-y-6'

  const noteBox = document.createElement('textarea')
  noteBox.value = note
  noteBox.placeholder = 'Notes...'
  noteBox.className = 'mt-6 w-full rounded border p-2'
  noteBox.addEventListener('input', () => saveNotes(noteBox.value))

  groups.forEach((g, idx) => {
    const section = document.createElement('section')
    section.className = 'space-y-3'

    const heading = document.createElement('h2')
    heading.textContent = g.title
    heading.className = 'text-sm font-semibold text-gray-600 uppercase tracking-wide'
    section.appendChild(heading)

    g.tasks.forEach((t) => {
      const item = document.createElement('label')
      item.className = 'flex items-center justify-between py-3'

      const span = document.createElement('span')
      span.textContent = t.text
      span.className = 'text-gray-800'

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'ml-4 h-4 w-4'
      checkbox.checked = !!state[t.id]?.completed
      checkbox.addEventListener('change', () => {
        const now = new Date().toISOString()
        state[t.id] = checkbox.checked
          ? { completed: true, completedAt: now }
          : { completed: false }
        saveTaskState(state)
      })

      item.appendChild(span)
      item.appendChild(checkbox)
      section.appendChild(item)
    })

    if (idx < groups.length - 1) {
      const divider = document.createElement('div')
      divider.className = 'border-b border-gray-200'
      section.appendChild(divider)
    }

    list.appendChild(section)
  })

  const toolbar = document.createElement('div')
  toolbar.className = 'pt-4 flex justify-end'

  const menu = document.createElement('details')
  menu.className = 'relative'

  const summary = document.createElement('summary')
  summary.textContent = 'More'
  summary.className = 'cursor-pointer text-sm text-gray-600'
  menu.appendChild(summary)

  const menuList = document.createElement('div')
  menuList.className =
    'absolute right-0 mt-2 w-44 rounded-md border border-gray-200 bg-white shadow'

  const exportHtmlBtn = document.createElement('button')
  exportHtmlBtn.textContent = 'Export HTML'
  exportHtmlBtn.className = 'block w-full px-3 py-2 text-left text-sm hover:bg-gray-50'
  exportHtmlBtn.addEventListener('click', () => exportHTML(groups, state, noteBox.value))

  const exportCsvBtn = document.createElement('button')
  exportCsvBtn.textContent = 'Export CSV'
  exportCsvBtn.className = 'block w-full px-3 py-2 text-left text-sm hover:bg-gray-50'
  exportCsvBtn.addEventListener('click', () => exportCSV(groups, state, noteBox.value))

  const importBtn = document.createElement('button')
  importBtn.textContent = 'Import JSON'
  importBtn.className = 'block w-full px-3 py-2 text-left text-sm hover:bg-gray-50'
  importBtn.addEventListener('click', importJSON)

  const settingsBtn = document.createElement('button')
  settingsBtn.textContent = 'Settings'
  settingsBtn.className = 'block w-full px-3 py-2 text-left text-sm hover:bg-gray-50'
  settingsBtn.addEventListener('click', () => alert('Settings coming soon'))

  menuList.appendChild(exportHtmlBtn)
  menuList.appendChild(exportCsvBtn)
  menuList.appendChild(importBtn)
  menuList.appendChild(settingsBtn)
  menu.appendChild(menuList)
  toolbar.appendChild(menu)

  container.appendChild(list)
  container.appendChild(noteBox)
  container.appendChild(toolbar)
}

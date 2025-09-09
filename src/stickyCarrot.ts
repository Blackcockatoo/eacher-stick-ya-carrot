// Sticky Carrot mini game triggered by feature flag.
// Provides a simple brush-based game where players reveal carrot shards.
// The implementation is intentionally lightweight and classroom safe.

interface GameState {
  overlay: HTMLDivElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  shards: boolean[][]
  collected: boolean[][]
  timerId?: number
  mute: boolean
  started: number
}

const ROUND_MS = 20000 // 20 second rounds
const GRID_W = 20
const GRID_H = 10
const CELL = 16

function createOverlay(): GameState {
  const overlay = document.createElement('div')
  overlay.id = 'sticky-carrot-overlay'
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: '#2b1b0f',
    imageRendering: 'pixelated',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '9999',
  })

  const canvas = document.createElement('canvas')
  canvas.width = GRID_W * CELL
  canvas.height = GRID_H * CELL
  canvas.style.border = '4px solid #fff'
  canvas.style.background = '#4a2e1b'

  overlay.appendChild(canvas)
  document.body.appendChild(overlay)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no ctx')

  const shards: boolean[][] = []
  const collected: boolean[][] = []
  for (let y = 0; y < GRID_H; y++) {
    shards[y] = []
    collected[y] = []
    for (let x = 0; x < GRID_W; x++) {
      // 30% chance of shard
      shards[y][x] = Math.random() < 0.3
      collected[y][x] = false
      ctx.fillStyle = '#4a2e1b'
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
    }
  }

  return {
    overlay,
    canvas,
    ctx,
    shards,
    collected,
    mute: false,
    started: Date.now(),
  }
}

function playBeep(state: GameState) {
  if (state.mute) return
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = 440
  osc.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.1)
}

function revealAt(state: GameState, px: number, py: number) {
  const x = Math.floor(px / CELL)
  const y = Math.floor(py / CELL)
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return
  if (state.collected[y][x]) return
  state.collected[y][x] = true
  if (state.shards[y][x]) {
    state.ctx.fillStyle = '#ff7f0e'
    state.ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
    playBeep(state)
  } else {
    state.ctx.clearRect(x * CELL, y * CELL, CELL, CELL)
  }
}

function startRound(state: GameState, onEnd: (score: number) => void) {
  let painting = false

  const handle = (e: PointerEvent) => {
    if (!painting) return
    const rect = state.canvas.getBoundingClientRect()
    revealAt(state, e.clientX - rect.left, e.clientY - rect.top)
  }

  state.canvas.addEventListener('pointerdown', (e) => {
    painting = true
    state.canvas.setPointerCapture(e.pointerId)
    handle(e)
  })
  state.canvas.addEventListener('pointermove', handle)
  state.canvas.addEventListener('pointerup', () => (painting = false))
  state.canvas.addEventListener('pointercancel', () => (painting = false))

  state.timerId = window.setTimeout(() => {
    const score = state.collected.flat().filter((v, i) => v && state.shards.flat()[i]).length
    onEnd(score)
  }, ROUND_MS)
}

export function initStickyCarrot() {
  const footerBtn = document.createElement('button')
  footerBtn.textContent = '🥕'
  Object.assign(footerBtn.style, {
    position: 'fixed',
    right: '8px',
    bottom: '8px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    opacity: '0.3',
  })
  document.body.appendChild(footerBtn)

  const launch = () => {
    const state = createOverlay()
    startRound(state, (score) => {
      alert(`Carrot shards collected: ${score}`) // placeholder reward
      document.body.removeChild(state.overlay)
    })
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') {
          if (state.timerId) window.clearTimeout(state.timerId)
          document.body.removeChild(state.overlay)
        }
      },
      { once: true },
    )
  }

  footerBtn.addEventListener('click', launch)
  window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key.toLowerCase() === 'g') {
      launch()
    }
  })
}

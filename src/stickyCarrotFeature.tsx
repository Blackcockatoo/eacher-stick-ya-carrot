import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
// Node's global `process` isn't available in browser builds, but we check it for env vars.
// Declare a loose type so TypeScript doesn't complain without `@types/node`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any;

interface Shard {
  x: number;
  y: number;
  collected: boolean;
}

const GRID_SIZE = 16;
const CANVAS_SIZE = 256;
const ROUND_MS = 25000; // 20-30s round

/**
 * Mini-game that allows the player to brush and reveal carrot shards.
 */
function StickyACarrotGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shards, setShards] = useState<Shard[]>(() => {
    const s: Shard[] = [];
    for (let i = 0; i < 20; i++) {
      s.push({
        x: Math.random() * CANVAS_SIZE,
        y: Math.random() * CANVAS_SIZE,
        collected: false,
      });
    }
    return s;
  });
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [meter, setMeter] = useState(0);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const pointer = useRef({ x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 });

  // Timer logic
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1000) {
          clearInterval(id);
          onClose();
          return 0;
        }
        return t - 1000;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, onClose]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaused((p) => !p);
      } else if (e.key === 'ArrowUp') {
        pointer.current.y = Math.max(0, pointer.current.y - 10);
        collect(pointer.current.x, pointer.current.y);
      } else if (e.key === 'ArrowDown') {
        pointer.current.y = Math.min(
          CANVAS_SIZE,
          pointer.current.y + 10,
        );
        collect(pointer.current.x, pointer.current.y);
      } else if (e.key === 'ArrowLeft') {
        pointer.current.x = Math.max(0, pointer.current.x - 10);
        collect(pointer.current.x, pointer.current.y);
      } else if (e.key === 'ArrowRight') {
        pointer.current.x = Math.min(
          CANVAS_SIZE,
          pointer.current.x + 10,
        );
        collect(pointer.current.x, pointer.current.y);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Draw canvas each frame
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.imageSmoothingEnabled = false;

    // grid
    ctx.strokeStyle = '#444';
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = (CANVAS_SIZE / GRID_SIZE) * i;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE);
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE, pos);
      ctx.stroke();
    }

    // shards
    shards.forEach((s) => {
      if (!s.collected) {
        ctx.fillStyle = 'orange';
        ctx.fillRect(s.x - 4, s.y - 4, 8, 8);
      }
    });

    // pointer
    ctx.fillStyle = 'white';
    ctx.fillRect(pointer.current.x - 2, pointer.current.y - 2, 4, 4);
  }, [shards]);

  const collect = (x: number, y: number) => {
    setShards((prev) => {
      let found = false;
      const next = prev.map((s) => {
        if (!s.collected && Math.hypot(s.x - x, s.y - y) < 10) {
          found = true;
          return { ...s, collected: true };
        }
        return s;
      });
      if (found) {
        if (!muted) beep();
        setMeter((m) => Math.min(100, m + 1));
      }
      return next;
    });
  };

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointer.current = { x, y };
    collect(x, y);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        color: '#fff',
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => setMuted((m) => !m)}>
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <span style={{ marginLeft: 16 }}>
          Time: {Math.ceil(timeLeft / 1000)}s
        </span>
        <span style={{ marginLeft: 16 }}>Meter: {meter}</span>
        {paused && (
          <button
            style={{ marginLeft: 16 }}
            onClick={() => setPaused(false)}
          >
            Resume
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onPointerMove={handlePointer}
        style={{ imageRendering: 'pixelated', cursor: 'crosshair' }}
      />
    </div>
  );
}

/** Simple oscillator beep */
function beep() {
  const Ctx =
    (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 880;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

/**
 * Setup entry points for the feature.
 */
export function setupStickyCarrotFeature() {
  const flag =
    (import.meta as any).env?.VITE_FEATURE_STICKYACARROT ??
    (typeof process !== 'undefined'
      ? (process as any).env?.VITE_FEATURE_STICKYACARROT
      : undefined);
  if (flag !== '1') return;

  const footer = document.createElement('div');
  footer.textContent = '🥕';
  footer.style.position = 'fixed';
  footer.style.bottom = '4px';
  footer.style.right = '4px';
  footer.style.opacity = '0.3';
  footer.style.cursor = 'pointer';
  footer.addEventListener('click', openGame);
  document.body.appendChild(footer);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'G' && e.shiftKey) openGame();
  });

  function openGame() {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const root = createRoot(mount);
    const handleClose = () => {
      root.unmount();
      mount.remove();
    };
    root.render(<StickyACarrotGame onClose={handleClose} />);
  }
}

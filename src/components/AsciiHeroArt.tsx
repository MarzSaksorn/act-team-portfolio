import { useEffect, useRef, useState, type ReactElement } from 'react';

const COLS = 72;
const ROWS = 32;
const CELL_WIDTH = 12;
const CELL_HEIGHT = 18;
const FRAME_INTERVAL = 1000 / 12;
const HIGHLIGHT_RADIUS = CELL_WIDTH * 8;
const BASE_COLOR = '#BF0D0D';
const ACCENT_COLOR = '#F35857';
const COLOR_CHANNELS = [1, 3, 5].map(index => ({
  base: Number.parseInt(BASE_COLOR.slice(index, index + 2), 16),
  accent: Number.parseInt(ACCENT_COLOR.slice(index, index + 2), 16),
}));
type PointerPoint = { x: number; y: number };
const LETTERS = [
  ['  ###  ', ' ## ## ', '##   ##', '##   ##', '#######', '##   ##', '##   ##', '##   ##', '##   ##'],
  [' ##### ', '##   ##', '##     ', '##     ', '##     ', '##     ', '##     ', '##   ##', ' ##### '],
  ['#######', '#######', '  ###  ', '  ###  ', '  ###  ', '  ###  ', '  ###  ', '  ###  ', '  ###  '],
];

// Time enters at this boundary. No random values, layout reads, or React updates
// occur in a frame; the same time always produces the same character grid.
function characterAt(x: number, y: number, time: number): string {
  for (let letter = 0; letter < LETTERS.length; letter++) {
    const localX = Math.floor((x - 10 - letter * 19) / 2);
    const localY = Math.floor((y - 7) / 2);
    if (LETTERS[letter]?.[localY]?.[localX] === '#') {
      return ((x + y + Math.floor(time / 500)) % 11 === 0) ? '+' : '#';
    }
  }
  const angle = time / 9000;
  const dx = (x - 35.5) / 31;
  const dy = (y - 15.5) / 13;
  const ellipse = dx * dx + dy * dy;
  if (Math.abs(ellipse - 1) < 0.075) {
    return Math.sin(Math.atan2(dy, dx) * 3 + angle) > 0.8 ? '+' : ':';
  }
  const tilted = ((dx * Math.cos(0.6) + dy * Math.sin(0.6)) ** 2)
    + ((-dx * Math.sin(0.6) + dy * Math.cos(0.6)) / 0.65) ** 2;
  if (Math.abs(tilted - 1) < 0.075) return '.';
  return ' ';
}

const STATIC_FRAME = Array.from({ length: ROWS }, (_, y) =>
  Array.from({ length: COLS }, (_, x) => characterAt(x, y, 0)).join(''),
).join('\n');

function drawFrame(context: CanvasRenderingContext2D, time: number, pointer: PointerPoint | null = null) {
  context.clearRect(0, 0, COLS * CELL_WIDTH, ROWS * CELL_HEIGHT);
  context.font = '14px monospace';
  context.textBaseline = 'top';
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const glyph = characterAt(x, y, time);
      if (glyph === ' ') continue;
      context.fillStyle = glyph === '#' ? BASE_COLOR : glyph === '+' ? ACCENT_COLOR : '#669BBC';
      if (pointer && glyph === '#') {
        const distance = Math.hypot((x + 0.5) * CELL_WIDTH - pointer.x, (y + 0.5) * CELL_HEIGHT - pointer.y);
        const strength = Math.max(0, Math.min(1, (HIGHLIGHT_RADIUS - distance) / (HIGHLIGHT_RADIUS - CELL_WIDTH)));
        if (strength > 0) {
          context.fillStyle = `#${COLOR_CHANNELS.map(({ base, accent }) =>
            Math.round(base + (accent - base) * strength).toString(16).padStart(2, '0'),
          ).join('').toUpperCase()}`;
        }
      }
      context.fillText(glyph, x * CELL_WIDTH, y * CELL_HEIGHT);
    }
  }
}

export default function AsciiHeroArt(): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<PointerPoint | null>(null);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let context: CanvasRenderingContext2D | null;
    try { context = canvas.getContext('2d'); } catch { return; }
    if (!context) return;
    const painter = context;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let motionReduced = media?.matches ?? true;
    let request: number | null = null;
    let previousPaint: number | null = null;
    let elapsed = 0;
    let disposed = false;
    const hero = canvas.closest('.hero');
    const clearPointer = () => { pointerRef.current = null; };
    const pointerMoved = (event: Event) => {
      if (!(event instanceof PointerEvent) || motionReduced || document.hidden) return;
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      if (event.target instanceof Element && event.target.closest('.hero-copy')) {
        clearPointer();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || event.clientX < rect.left || event.clientX >= rect.right
        || event.clientY < rect.top || event.clientY >= rect.bottom) {
        clearPointer();
        return;
      }
      pointerRef.current = {
        x: (event.clientX - rect.left) / rect.width * COLS * CELL_WIDTH,
        y: (event.clientY - rect.top) / rect.height * ROWS * CELL_HEIGHT,
      };
    };

    const stop = () => {
      if (request !== null) cancelAnimationFrame(request);
      request = null;
      previousPaint = null;
    };
    const tick = (now: number) => {
      request = null;
      if (disposed || motionReduced || document.hidden) return;
      if (previousPaint === null || now - previousPaint >= FRAME_INTERVAL) {
        elapsed += previousPaint === null ? FRAME_INTERVAL : Math.min(now - previousPaint, 200);
        previousPaint = now;
        drawFrame(painter, elapsed, pointerRef.current);
      }
      request = requestAnimationFrame(tick);
    };
    const sync = () => {
      stop();
      if (!disposed && !motionReduced && !document.hidden) {
        request = requestAnimationFrame(tick);
      }
    };
    const motionChanged = () => {
      motionReduced = media?.matches ?? true;
      setReduced(motionReduced);
      if (motionReduced) {
        clearPointer();
        drawFrame(painter, 0);
      }
      sync();
    };

    drawFrame(painter, 0);
    setReady(true);
    setReduced(motionReduced);
    media?.addEventListener('change', motionChanged);
    document.addEventListener('visibilitychange', sync);
    hero?.addEventListener('pointermove', pointerMoved);
    hero?.addEventListener('pointerleave', clearPointer);
    hero?.addEventListener('pointercancel', clearPointer);
    sync();
    return () => {
      disposed = true;
      stop();
      media?.removeEventListener('change', motionChanged);
      document.removeEventListener('visibilitychange', sync);
      hero?.removeEventListener('pointermove', pointerMoved);
      hero?.removeEventListener('pointerleave', clearPointer);
      hero?.removeEventListener('pointercancel', clearPointer);
      clearPointer();
    };
  }, []);

  return <div className="hero-art ascii-art" data-motion={!ready ? 'fallback' : reduced ? 'reduced' : 'running'}>
    <div className="ascii-surface" aria-hidden="true">
      <pre className="ascii-fallback" hidden={ready}>{STATIC_FRAME}</pre>
      <canvas className="ascii-canvas" ref={canvasRef} width={COLS * CELL_WIDTH} height={ROWS * CELL_HEIGHT} hidden={!ready} />
    </div>
  </div>;
}

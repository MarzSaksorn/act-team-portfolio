import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';

let frames: string[][];
let callbacks: Map<number, FrameRequestCallback>;
let nextId: number;
let reduced: boolean;
let motionListeners: Set<EventListenerOrEventListenerObject>;
let contextAvailable: boolean;

function mount() { return render(<MemoryRouter><App /></MemoryRouter>); }
function advance(time: number) {
  act(() => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach(callback => callback(time));
  });
}
function changeMotion(value: boolean) {
  reduced = value;
  act(() => {
    const event = new Event('change');
    motionListeners.forEach(listener => {
      if (typeof listener === 'function') listener(event);
      else listener.handleEvent(event);
    });
  });
}
function art() {
  const canvas = document.querySelector('canvas');
  if (!canvas) throw new Error('ASCII canvas was not rendered');
  return canvas;
}

beforeEach(() => {
  frames = []; callbacks = new Map(); nextId = 0;
  reduced = false; contextAvailable = true; motionListeners = new Set();
  // jsdom has no Canvas2D or browser frame clock. Record actual renderer output
  // at that boundary, while running the real HomePage and its effects.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => contextAvailable ? {
      clearRect: () => frames.push([]),
      fillText: (text: string, x: number, y: number) => frames.at(-1)?.push(`${text}:${x}:${y}`),
      setTransform: () => {},
      fillStyle: '', font: '', textBaseline: '',
    } : null,
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callbacks.set(++nextId, callback); return nextId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    get matches() { return reduced; }, media: query, onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => motionListeners.add(listener),
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => motionListeners.delete(listener),
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => true,
  }));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('server renders a character-built fallback before JavaScript runs', () => {
  const html = renderToString(<MemoryRouter><App /></MemoryRouter>);
  const host = document.createElement('div'); host.innerHTML = html;
  const fallback = host.querySelector('pre');
  expect(fallback?.textContent).toMatch(/[#@+]/);
  expect(fallback?.textContent?.split('\n').length).toBeGreaterThan(10);
  expect(fallback?.closest('[aria-hidden="true"]')).not.toBeNull();
});

it('retains the visible fallback without a context and offers no unusable animation control', () => {
  contextAvailable = false; mount();
  expect(document.querySelector('pre')).toBeVisible();
  expect(screen.queryByRole('button', { name: /animation/i })).not.toBeInTheDocument();
  advance(1000); expect(frames).toHaveLength(0);
});

it('draws changing deterministic character frames while capping redraws at twelve per second', () => {
  const firstMount = mount();
  const initial = frames[0];
  expect(initial?.length).toBeGreaterThan(100);
  for (let time = 10; time <= 1000; time += 10) advance(time);
  expect(frames.length).toBeGreaterThan(2);
  expect(frames.length).toBeLessThanOrEqual(13);
  expect(frames.at(-1)).not.toEqual(initial);
  firstMount.unmount(); frames = []; mount();
  expect(frames[0]).toEqual(initial);
});

it('keeps drawing beyond five seconds without rendering a pause control', () => {
  mount();
  expect(art().closest('.hero-art')?.querySelector('button')).toBeNull();
  advance(1000); advance(5000);
  const count = frames.length;
  advance(6000); advance(7000);
  expect(frames.length).toBeGreaterThan(count);
  expect(frames.at(-1)).not.toEqual(frames[count - 1]);
});

it('reduced motion starts static without rendering a motion control', () => {
  reduced = true; mount(); const count = frames.length;
  advance(1000); advance(2000); expect(frames).toHaveLength(count);
  expect(art().closest('.hero-art')?.querySelector('button')).toBeNull();
  expect(art().closest('.hero-art')).toHaveAttribute('data-motion', 'reduced');
});

it('live motion preference changes stop and restart the loop without a motion control', () => {
  mount();
  changeMotion(true); const staticCount = frames.length;
  advance(1000); expect(frames).toHaveLength(staticCount);
  changeMotion(false); advance(2000); advance(3000);
  expect(frames.length).toBeGreaterThan(staticCount);
  expect(art().closest('.hero-art')?.querySelector('button')).toBeNull();
  changeMotion(true); const stoppedCount = frames.length;
  advance(4000); expect(frames).toHaveLength(stoppedCount);
  changeMotion(false); advance(5000);
  expect(frames.length).toBeGreaterThan(stoppedCount);
});

it('hidden documents stop drawing and visibility resumes the loop', () => {
  mount();
  let hidden = true;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  const count = frames.length; advance(1000); expect(frames).toHaveLength(count);
  hidden = false; act(() => document.dispatchEvent(new Event('visibilitychange')));
  advance(2000); expect(frames.length).toBeGreaterThan(count);
  hidden = true; act(() => document.dispatchEvent(new Event('visibilitychange')));
  const hiddenCount = frames.length; advance(3000);
  expect(frames).toHaveLength(hiddenCount);
  hidden = false; act(() => document.dispatchEvent(new Event('visibilitychange')));
  advance(4000); expect(frames.length).toBeGreaterThan(hiddenCount);
});

it('locale switches keep the artwork running without adding a motion control', async () => {
  const user = userEvent.setup(); mount();
  await user.click(screen.getByRole('button', { name: 'ไทย' }));
  expect(art().closest('.hero-art')?.querySelector('button')).toBeNull();
  const thaiCount = frames.length; advance(1000);
  expect(frames.length).toBeGreaterThan(thaiCount);
  await user.click(screen.getByRole('button', { name: 'EN' }));
  expect(art().closest('.hero-art')?.querySelector('button')).toBeNull();
  const englishCount = frames.length; advance(2000);
  expect(frames.length).toBeGreaterThan(englishCount);
});

it('unmount cancels queued frames and detaches preference and visibility work', () => {
  const { unmount } = mount(); expect(callbacks.size).toBeGreaterThan(0);
  unmount(); const count = frames.length;
  advance(1000); changeMotion(true);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(frames).toHaveLength(count);
  expect(callbacks.size).toBe(0); expect(motionListeners.size).toBe(0);
});

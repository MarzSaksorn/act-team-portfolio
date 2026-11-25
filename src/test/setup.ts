import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  document.cookie = 'act-locale=; Max-Age=0; Path=/; SameSite=Lax';
});

afterEach(() => cleanup());

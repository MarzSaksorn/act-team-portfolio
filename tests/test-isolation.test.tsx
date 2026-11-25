import { expect, it } from 'vitest';

it('can persist a locale preference during one test', () => {
  document.cookie = 'act-locale=th; Path=/';
  expect(document.cookie).toContain('act-locale=th');
});

it('clears the locale preference before the next test', () => {
  expect(document.cookie.split(';').map((part) => part.trim())).not.toContain('act-locale=th');
});

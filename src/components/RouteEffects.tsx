import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
export default function RouteEffects() {
  const { pathname, hash } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const changed = previousPath.current !== pathname;
    previousPath.current = pathname;
    const frame = requestAnimationFrame(() => {
      if (hash) {
        const target = document.getElementById(hash.slice(1));
        if (target) window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - 28, behavior: 'auto' });
      } else if (changed) {
        window.scrollTo({ top: 0, behavior: 'auto' });
        document.getElementById('main')?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

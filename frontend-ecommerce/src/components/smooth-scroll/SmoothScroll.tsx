'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ReactLenis } from 'lenis/react';

// Exponential ease-out — Lenis's own reference easing. Fast at the start,
// settles smoothly; noticeably lighter than the default lerp-based feel,
// which is what "fast, not laggy" calls for here.
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

// Site-wide smooth scrolling for the customer storefront. Deliberately no
// `wrapper`/`content` refs — with `root` set and no ref target, Lenis just
// smooths the real window scroll in place and this component renders no
// extra DOM (see ReactLenis source: root mode returns `children` directly),
// so it can't touch layout, spacing, or any existing element.
//
// Touch is left at Lenis's default (native momentum, not synced/smoothed) —
// forcing synced touch is the most common way this kind of integration ends
// up feeling laggy on phones, and native touch scrolling already feels
// right on iOS/Android.
export function SmoothScroll({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setEnabled(!query.matches);

    const onChange = () => setEnabled(!query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  if (!enabled) {
    // Reduced-motion: skip Lenis entirely and fall back to plain native
    // scrolling rather than just shortening the animation.
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        duration: 1.1,
        easing: easeOutExpo,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}

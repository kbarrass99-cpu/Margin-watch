'use client';

import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { Pause, Play } from '@phosphor-icons/react';

// Smooth scrolling plus a faint 3D "price terrain" behind the marketing pages.
// Not used on the dashboard or forms, where scrolling should stay instant.
export default function MarketingMotion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    // respectReducedMotion (default true) turns smoothing off for those users.
    const lenis = new Lenis({ autoRaf: true, anchors: { offset: -16 } });

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => lenis.destroy();
    // Phones get a still frame that follows scroll: saves battery and needs no pause button over content.
    const still = window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 767px)').matches;
    let w = 0;
    let h = 0;
    let frame = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t: number) {
      const rows = 26;
      const cols = w < 640 ? 28 : 48;
      const travel = window.scrollY * 0.004; // scrolling flies the camera forward
      ctx!.clearRect(0, 0, w, h);
      for (let r = 0; r < rows; r++) {
        const z = 1.2 + r * 0.45 - (travel % 0.45);
        const depth = 1 - r / rows;
        ctx!.beginPath();
        for (let c = 0; c <= cols; c++) {
          const x = (c / cols - 0.5) * 14;
          const wz = z + travel;
          const y = 1.6 + Math.sin(x * 0.55 + wz * 0.8 + t * 0.35) * 0.35 + Math.cos(x * 0.3 - wz * 0.5 + t * 0.2) * 0.25;
          const sx = w / 2 + (x / z) * (w * 0.35);
          const sy = h * 0.42 + (y / z) * (h * 0.6);
          if (c === 0) ctx!.moveTo(sx, sy);
          else ctx!.lineTo(sx, sy);
        }
        // One row in the accent colour: the "price line" the canary watches.
        ctx!.strokeStyle = r === 3 ? `rgba(35,72,216,${0.32 * depth})` : `rgba(24,24,27,${0.13 * depth})`;
        ctx!.lineWidth = r === 3 ? 1.4 : 1;
        ctx!.stroke();
      }
    }

    function loop(now: number) {
      if (!pausedRef.current && !document.hidden) draw(now / 1000);
      frame = requestAnimationFrame(loop);
    }

    function onResize() {
      resize();
      draw(performance.now() / 1000);
    }

    resize();
    draw(0);
    if (!still) frame = requestAnimationFrame(loop);
    else lenis.on('scroll', () => draw(0)); // still follows scroll, but never moves on its own
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? 'Play background animation' : 'Pause background animation'}
        className="fixed bottom-4 left-4 z-20 hidden h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-600 shadow-sm backdrop-blur hover:text-zinc-900 md:motion-safe:flex"
      >
        {paused ? <Play size={14} weight="bold" /> : <Pause size={14} weight="bold" />}
      </button>
    </>
  );
}

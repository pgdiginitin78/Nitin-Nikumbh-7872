import React, { useEffect, useRef } from 'react';

export default function Snowfall() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let observer;
    let flakes = [];
    let disposed = false;
    let width = 0;
    let height = 0;

    const makeFlake = (randomY) => ({
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -10,
      r: Math.random() * 2.2 + 0.6,
      speed: Math.random() * 0.6 + 0.3,
      drift: Math.random() * 0.6 + 0.2,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.6 + 0.3,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(160, (width * height) / 9000));
      flakes = Array.from({ length: count }, () => makeFlake(true));
    };

    resize();
    observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let last = performance.now();
    const tick = (now) => {
      if (disposed) return;
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;

      ctx.clearRect(0, 0, width, height);
      for (const f of flakes) {
        f.phase += 0.01 * dt;
        f.y += f.speed * dt * (f.r * 0.6);
        f.x += Math.sin(f.phase) * f.drift * 0.5 * dt;

        if (f.y > height + 10) Object.assign(f, makeFlake(false));
        if (f.x > width + 10) f.x = -10;
        if (f.x < -10) f.x = width + 10;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${f.alpha})`;
        ctx.fill();
      }
    };

    frame = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" aria-hidden="true" />
    </div>
  );
}

import { Component, ElementRef, NgZone, OnDestroy, ViewChild, afterNextRender, inject } from '@angular/core';

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
}

@Component({
  selector: 'app-snowfall',
  standalone: true,
  template: `<canvas #canvas class="snow-canvas" aria-hidden="true"></canvas>`,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;
      }
      .snow-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
    `,
  ],
})
export class SnowfallComponent implements OnDestroy {
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  private zone = inject(NgZone);
  private frame = 0;
  private observer?: ResizeObserver;
  private flakes: Flake[] = [];
  private disposed = false;

  constructor() {
    afterNextRender(() => this.zone.runOutsideAngular(() => this.start()));
  }

  private start() {
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;

    const makeFlake = (randomY: boolean): Flake => ({
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -10,
      r: Math.random() * 2.2 + 0.6,
      speed: Math.random() * 0.6 + 0.3,
      drift: Math.random() * 0.6 + 0.2,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.6 + 0.3,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(160, (width * height) / 9000));
      this.flakes = Array.from({ length: count }, () => makeFlake(true));
    };

    resize();
    this.observer = new ResizeObserver(resize);
    this.observer.observe(canvas);

    let last = performance.now();
    const tick = (now: number) => {
      if (this.disposed) return;
      this.frame = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;

      ctx.clearRect(0, 0, width, height);
      for (const f of this.flakes) {
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

    if (reduced) {
      tick(performance.now());
      cancelAnimationFrame(this.frame);
    } else {
      this.frame = requestAnimationFrame(tick);
    }
  }

  ngOnDestroy() {
    this.disposed = true;
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }
}

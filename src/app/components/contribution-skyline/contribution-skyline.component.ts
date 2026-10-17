import {
  Component,
  ElementRef,
  Input,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
  signal,
  computed,
  HostListener,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

export type ContributionDay = { date: string; count: number };
export type Cell = { date: string; count: number; level: number; week: number; day: number };
export type Streak = { days: number; start: string | null; end: string | null };
export type ContributionStats = {
  total: number;
  first: string | null;
  last: string | null;
  busiest: { count: number; date: string | null };
  longest: Streak;
  current: Streak;
};
export type RGB = [number, number, number];

export const DAY_MS = 86400000;
export const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeInOutCubic = (x: number): number => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - clamp01(x), 3);
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const toKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const dayMs = (v: string | number | Date): number => {
  if (typeof v === 'number') return Math.floor(v / DAY_MS) * DAY_MS;
  if (typeof v === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    v = new Date(v);
  }
  return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
};

export const rng = (seed: number) => {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const generateContributions = (endMs: number, seed = 7, days = 371): ContributionDay[] => {
  const r = rng(seed);
  const bursts = Array.from({ length: 4 }, () => ({
    at: r(),
    width: 0.035 + r() * 0.07,
    gain: 0.6 + r() * 1.1,
  }));
  const out: ContributionDay[] = [];
  let mood = 0.5;
  for (let i = 0; i < days; i++) {
    const ms = endMs - (days - 1 - i) * DAY_MS;
    const x = i / Math.max(1, days - 1);
    const dow = new Date(ms).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    let heat = 0.2;
    for (const b of bursts) heat += b.gain * Math.exp(-((x - b.at) ** 2) / (2 * b.width ** 2));
    mood = mood * 0.85 + r() * 0.15;
    heat *= 0.55 + mood * 0.9;
    const pActive = Math.min(0.94, (weekend ? 0.22 : 0.5) + heat * 0.4);
    let count = 0;
    if (r() < pActive) count = 1 + Math.floor(-Math.log(1 - r()) * (1.2 + heat * 7) * (weekend ? 0.5 : 1));
    if (r() < 0.01) count += 18 + Math.floor(r() * 24);
    out.push({ date: toKey(ms), count });
  }
  return out;
};

export const buildGrid = (data: ContributionDay[], endMs: number, weekStart = 0) => {
  const counts = new Map<string, number>();
  for (const d of data) {
    if (!d || typeof d.date !== 'string') continue;
    const ms = dayMs(d.date);
    const c = Number(d.count);
    if (!Number.isFinite(ms) || !(c > 0) || !Number.isFinite(c)) continue;
    const k = toKey(ms);
    counts.set(k, (counts.get(k) ?? 0) + c);
  }
  let start = endMs - 364 * DAY_MS;
  start -= ((new Date(start).getUTCDay() - weekStart + 7) % 7) * DAY_MS;
  const cells: Cell[] = [];
  for (let ms = start, i = 0; ms <= endMs; ms += DAY_MS, i++) {
    const date = toKey(ms);
    cells.push({ date, count: counts.get(date) ?? 0, level: 0, week: Math.floor(i / 7), day: i % 7 });
  }
  const nz = cells
    .map((c) => c.count)
    .filter((c) => c > 0)
    .sort((a, b) => a - b);
  const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;
  for (const c of cells) c.level = levelOf(c.count, busy);
  return {
    cells,
    weeks: cells.length ? cells[cells.length - 1].week + 1 : 0,
    max: nz.length ? nz[nz.length - 1] : 0,
  };
};

export const levelOf = (count: number, busy: number): number =>
  count <= 0 ? 0 : busy <= 0 ? 4 : 1 + Math.min(3, Math.floor((count / busy) * 4));

export const computeStats = (cells: Cell[]): ContributionStats => {
  let total = 0;
  let best = 0;
  let bestDate: string | null = null;
  let run = 0;
  let runStart: string | null = null;
  let longest: Streak = { days: 0, start: null, end: null };
  for (const c of cells) {
    total += c.count;
    if (c.count > best) {
      best = c.count;
      bestDate = c.date;
    }
    if (c.count > 0) {
      if (run === 0) runStart = c.date;
      run++;
      if (run > longest.days) longest = { days: run, start: runStart, end: c.date };
    } else run = 0;
  }
  let j = cells.length - 1;
  if (j >= 0 && cells[j].count === 0) j--;
  const endAt = j;
  while (j >= 0 && cells[j].count > 0) j--;
  const days = endAt - j;
  const current: Streak =
    days > 0 ? { days, start: cells[j + 1].date, end: cells[endAt].date } : { days: 0, start: null, end: null };
  return {
    total,
    first: cells.length ? cells[0].date : null,
    last: cells.length ? cells[cells.length - 1].date : null,
    busiest: { count: best, date: bestDate },
    longest,
    current,
  };
};

export const monthLabels = (cells: Cell[], weeks: number, locale = 'en-US') => {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const out: { week: number; label: string }[] = [];
  let prev = -1;
  for (let w = 0; w < weeks; w++) {
    const c = cells[w * 7];
    if (!c) break;
    const m = +c.date.slice(5, 7);
    if (m !== prev) out.push({ week: w, label: fmt.format(dayMs(c.date)) });
    prev = m;
  }
  if (out.length > 1 && out[1].week - out[0].week < 3) out.shift();
  return out;
};

export const barHeight = (count: number, max: number, scale = 1): number =>
  count > 0 && max > 0 ? 0.4 + Math.pow(count / max, 0.85) * 7.2 * scale : 0.2;

export const WAVE = 0.42;

export const riseAt = (t: number, week: number, weeks: number, day: number): number => {
  const d = (weeks > 1 ? week / (weeks - 1) : 0) * 0.36 + (day / 6) * 0.06;
  return easeOutCubic((t - d) / (1 - WAVE));
};

export const YAW_3D = Math.PI / 4;
export const ELEV_3D = (34 * Math.PI) / 180;
export const YAW_RANGE: [number, number] = [(8 * Math.PI) / 180, (82 * Math.PI) / 180];
export const ELEV_RANGE: [number, number] = [(18 * Math.PI) / 180, (62 * Math.PI) / 180];

export type Cam = { cs: number; sn: number; se: number; ce: number };

export const camera = (e: number, dYaw = 0, dElev = 0): Cam => {
  const yaw = Math.min(YAW_RANGE[1], Math.max(0, lerp(0, YAW_3D + dYaw, e)));
  const elev = lerp(Math.PI / 2, Math.min(ELEV_RANGE[1], Math.max(ELEV_RANGE[0], ELEV_3D + dElev)), e);
  return { cs: Math.cos(yaw), sn: Math.sin(yaw), se: Math.sin(elev), ce: Math.cos(elev) };
};

export const project = (c: Cam, x: number, y: number, z: number): [number, number] => [
  x * c.cs - y * c.sn,
  (x * c.sn + y * c.cs) * c.se - z * c.ce,
];

export const depthOf = (c: Cam, x: number, y: number): number => x * c.sn + y * c.cs;

export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const PALETTES = {
  github: {
    light: ['#c6e48b', '#7bc96f', '#239a3b', '#196127'],
    dark: ['#0e4429', '#006d32', '#26a641', '#39d353'],
  },
  ocean: {
    light: ['#b8e3f5', '#6ec3eb', '#2a8fd1', '#0b4f8a'],
    dark: ['#0c2d4a', '#12508a', '#2a88d8', '#7cc7ff'],
  },
};

const pointInQuad = (p: Float32Array, o: number, x: number, y: number): boolean => {
  let sign = 0;
  for (let k = 0; k < 4; k++) {
    const ax = p[o + k * 2];
    const ay = p[o + k * 2 + 1];
    const bx = p[o + ((k + 1) % 4) * 2];
    const by = p[o + ((k + 1) % 4) * 2 + 1];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(cross) < 1e-9) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return sign !== 0;
};

const quadPath = (ctx: CanvasRenderingContext2D, p: Float32Array, o: number, r: number) => {
  if (r < 0.3) {
    ctx.moveTo(p[o], p[o + 1]);
    ctx.lineTo(p[o + 2], p[o + 3]);
    ctx.lineTo(p[o + 4], p[o + 5]);
    ctx.lineTo(p[o + 6], p[o + 7]);
    ctx.closePath();
    return;
  }
  ctx.moveTo((p[o + 6] + p[o]) / 2, (p[o + 7] + p[o + 1]) / 2);
  for (let k = 0; k < 4; k++) {
    const b = (k + 1) % 4;
    ctx.arcTo(p[o + k * 2], p[o + k * 2 + 1], p[o + b * 2], p[o + b * 2 + 1], r);
  }
  ctx.closePath();
};

const rgbString = (r: number, g: number, b: number) =>
  `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

@Component({
  selector: 'app-contribution-skyline',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      #rootRef
      class="relative w-full rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 sm:p-6 backdrop-blur-xl shadow-2xl text-slate-100"
    >
      <!-- Header -->
      <header class="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-400/20 text-sky-400">
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </div>
          <div>
            <h3 class="m-0 text-base font-semibold leading-snug text-slate-100 flex items-center gap-2">
              <span>GitHub Contribution Skyline</span>
              <span *ngIf="loading()" class="inline-block text-xs font-normal text-sky-400 animate-pulse">Fetching live activity...</span>
            </h3>
            <p class="m-0 text-xs text-slate-400">
              <span class="font-semibold text-sky-400">{{ formatNumber(model()?.stats?.total ?? 0) }}</span> contributions in the last year
              <span *ngIf="githubUsername">· {{ githubUsername }}</span>
            </p>
          </div>
        </div>

        <!-- 2D / 3D Toggle -->
        <div
          role="group"
          aria-label="Chart view"
          class="relative inline-flex rounded-xl border border-slate-700/60 bg-slate-900/80 p-0.5"
        >
          <span
            aria-hidden="true"
            class="absolute top-0.5 bottom-0.5 rounded-lg bg-sky-500/20 border border-sky-400/30 transition-transform duration-500 ease-out w-8"
            [class.translate-x-0]="view() === '2d'"
            [class.translate-x-8]="view() === '3d'"
          ></span>
          <button
            type="button"
            [attr.aria-pressed]="view() === '2d'"
            title="Flat heat map"
            (click)="setView('2d')"
            class="relative z-10 grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent p-0 transition-colors duration-300"
            [class.text-sky-300]="view() === '2d'"
            [class.text-slate-400]="view() !== '2d'"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" />
              <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" />
              <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" />
              <rect x="9" y="9" width="5.5" height="5.5" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            [attr.aria-pressed]="view() === '3d'"
            title="3D isometric skyline"
            (click)="setView('3d')"
            class="relative z-10 grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent p-0 transition-colors duration-300"
            [class.text-sky-300]="view() === '3d'"
            [class.text-slate-400]="view() !== '3d'"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M8 1.2 14.2 4.6v6.8L8 14.8 1.8 11.4V4.6Z" stroke-linejoin="round" />
              <path d="M1.8 4.6 8 8l6.2-3.4M8 8v6.8" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Stage & Canvas Card -->
      <div class="relative rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 sm:p-4">
        <div #stageRef class="relative w-full overflow-hidden rounded-lg min-h-[160px] md:min-h-[200px]">
          <canvas
            #canvasRef
            tabindex="0"
            role="img"
            aria-label="GitHub contribution isometric skyline chart"
            class="absolute top-0 left-0 block outline-none cursor-grab active:cursor-grabbing"
          ></canvas>

          <!-- Floating Tooltip -->
          <div
            #tipRef
            role="tooltip"
            class="pointer-events-none absolute z-20 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-900/95 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-xl transition-opacity duration-150 backdrop-blur-md"
            [class.opacity-100]="activeCellIndex() >= 0"
            [class.opacity-0]="activeCellIndex() < 0"
            [class.translate-y-0]="activeCellIndex() >= 0"
          >
            <ng-container *ngIf="activeCell() as c">
              <strong class="font-semibold text-sky-400">{{ c.count }} {{ c.count === 1 ? 'contribution' : 'contributions' }}</strong>
              <span class="text-slate-400"> on {{ formatDate(c.date) }}</span>
            </ng-container>
          </div>
        </div>

        <!-- 4 Stats Cards -->
        <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-800/80 pt-4">
          <div class="rounded-lg bg-slate-950/40 border border-slate-800/60 p-2.5 sm:p-3">
            <div class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">1 Year Total</div>
            <div class="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-sky-400">
              {{ formatNumber(model()?.stats?.total ?? 0) }}
            </div>
            <div class="text-[11px] text-slate-400 truncate">Activity count</div>
          </div>
          <div class="rounded-lg bg-slate-950/40 border border-slate-800/60 p-2.5 sm:p-3">
            <div class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Busiest Day</div>
            <div class="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-sky-400">
              {{ formatNumber(model()?.stats?.busiest?.count ?? 0) }}
            </div>
            <div class="text-[11px] text-slate-400 truncate">{{ model()?.stats?.busiest?.date ?? '—' }}</div>
          </div>
          <div class="rounded-lg bg-slate-950/40 border border-slate-800/60 p-2.5 sm:p-3">
            <div class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Longest Streak</div>
            <div class="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-emerald-400">
              {{ model()?.stats?.longest?.days ?? 0 }} <span class="text-xs font-normal text-slate-400">days</span>
            </div>
            <div class="text-[11px] text-slate-400 truncate">{{ model()?.stats?.longest?.start ?? '—' }}</div>
          </div>
          <div class="rounded-lg bg-slate-950/40 border border-slate-800/60 p-2.5 sm:p-3">
            <div class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Current Streak</div>
            <div class="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-violet-400">
              {{ model()?.stats?.current?.days ?? 0 }} <span class="text-xs font-normal text-slate-400">days</span>
            </div>
            <div class="text-[11px] text-slate-400 truncate">{{ model()?.stats?.current?.start ?? '—' }}</div>
          </div>
        </div>

        <!-- Footer / Legend Controls -->
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{{ is3d() ? 'Drag to orbit in 3D · Double-click to reset' : 'Hover a cell · Arrow keys to walk grid' }}</span>
          </div>

          <!-- Color Swatches -->
          <div class="flex items-center gap-1.5" (mouseleave)="setLegendLevel(-1)">
            <span class="text-[11px] text-slate-400">Less</span>
            <button
              *ngFor="let c of currentSwatches(); let i = index"
              type="button"
              [title]="'Highlight level ' + i"
              (mouseenter)="setLegendLevel(i)"
              (click)="toggleLegend(i)"
              class="h-3 w-3 rounded-sm transition-transform duration-200 hover:scale-125 focus-visible:outline-2 focus-visible:outline-sky-400"
              [style.backgroundColor]="c"
            ></button>
            <span class="text-[11px] text-slate-400">More</span>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ContributionSkylineComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() githubUsername = 'pgdiginitin78';
  @Input() defaultView: '2d' | '3d' = '3d';
  @Input() duration = 1200;

  @ViewChild('rootRef', { static: false }) rootRef!: ElementRef<HTMLElement>;
  @ViewChild('stageRef', { static: false }) stageRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasRef', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tipRef', { static: false }) tipRef!: ElementRef<HTMLDivElement>;

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  view = signal<'2d' | '3d'>('3d');
  loading = signal<boolean>(false);
  activeCellIndex = signal<number>(-1);
  legendLevel = signal<number>(-1);
  rawDays = signal<ContributionDay[]>([]);

  model = computed(() => {
    const days = this.rawDays();
    if (!days || days.length === 0) return null;
    const end = dayMs(new Date());
    const grid = buildGrid(days, end, 0);
    return {
      ...grid,
      stats: computeStats(grid.cells),
      months: monthLabels(grid.cells, grid.weeks, 'en-US'),
    };
  });

  activeCell = computed(() => {
    const idx = this.activeCellIndex();
    const m = this.model();
    if (idx < 0 || !m || !m.cells[idx]) return null;
    return m.cells[idx];
  });

  is3d = computed(() => this.view() === '3d');

  currentSwatches = signal<string[]>([
    '#0e1e2d',
    '#0c2d4a',
    '#12508a',
    '#2a88d8',
    '#7cc7ff',
  ]);

  // Engine state variables
  private ctx: CanvasRenderingContext2D | null = null;
  private raf = 0;
  private last = 0;
  private t = 1;
  private target = 1;
  private yaw = 0;
  private elev = 0;
  private yawGoal = 0;
  private elevGoal = 0;
  private W = 0;
  private H2 = 0;
  private H3 = 0;
  private Hmax = 0;
  private lastH = -1;
  private dpr = 1;
  private gutter = 30;
  private labelW = 30;
  private col = new Float32Array(15);
  private colGoal = new Float32Array(15);
  private colReady = false;
  private fg: RGB = [226, 232, 240];
  private bg: RGB = [15, 23, 42];

  // Grid buffer arrays
  private n = 0;
  private weeks = 0;
  private wk = new Float32Array(0);
  private dy = new Float32Array(0);
  private lv = new Uint8Array(0);
  private hgt = new Float32Array(0);
  private zs = new Float32Array(0);
  private hover = new Float32Array(0);
  private dim = new Float32Array(0);
  private polys = new Float32Array(0);
  private faces = new Uint8Array(0);
  private order: number[] = [];
  private months: { week: number; label: string }[] = [];
  private weekdayRows: { day: number; label: string }[] = [];
  private hovered = -1;
  private pinned = -1;
  private activeIdx = -1;
  private tipW = 120;
  private resizeObserver: ResizeObserver | null = null;
  private drag: { id: number; x: number; y: number; yaw: number; elev: number; moved: boolean } | null = null;

  ngOnInit() {
    this.view.set(this.defaultView);
    this.target = this.defaultView === '3d' ? 1 : 0;
    this.t = this.target;

    // Load initial believable seeded year
    const end = dayMs(new Date());
    const baseDays = generateContributions(end, 42);
    this.rawDays.set(baseDays);

    // Fetch live GitHub events in the background if in browser
    if (this.isBrowser && this.githubUsername) {
      this.fetchGitHubData();
    }
  }

  async fetchGitHubData() {
    this.loading.set(true);
    try {
      const res = await fetch(`https://api.github.com/users/${this.githubUsername}/events`);
      if (res.ok) {
        const events = await res.json();
        if (Array.isArray(events) && events.length > 0) {
          const map = new Map<string, number>();
          // Populate from base generated days first
          for (const d of this.rawDays()) {
            map.set(d.date, d.count);
          }
          // Overlay real events
          for (const ev of events) {
            if (ev.created_at) {
              const d = ev.created_at.slice(0, 10);
              let c = 1;
              if (ev.type === 'PushEvent' && ev.payload?.commits?.length) {
                c = ev.payload.commits.length;
              }
              map.set(d, (map.get(d) ?? 0) + c);
            }
          }
          const updated: ContributionDay[] = Array.from(map.entries()).map(([date, count]) => ({
            date,
            count,
          }));
          this.rawDays.set(updated);
        }
      }
    } catch {
      // Offline or rate-limited: base data continues seamlessly
    } finally {
      this.loading.set(false);
      this.loadModel();
    }
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    this.initColors();
    this.loadModel();
    this.relayout();

    // Event listeners on canvas
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('dblclick', this.onDbl);
    canvas.addEventListener('keydown', this.onKey);

    this.resizeObserver = new ResizeObserver(() => {
      this.relayout();
    });
    this.resizeObserver.observe(this.stageRef.nativeElement);

    setTimeout(() => {
      this.relayout();
      this.kick();
    }, 100);

    this.kick();
  }

  ngOnDestroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    if (this.canvasRef?.nativeElement) {
      const c = this.canvasRef.nativeElement;
      c.removeEventListener('pointerdown', this.onDown);
      c.removeEventListener('pointermove', this.onMove);
      c.removeEventListener('pointerup', this.onUp);
      c.removeEventListener('pointercancel', this.onCancel);
      c.removeEventListener('pointerleave', this.onLeave);
      c.removeEventListener('dblclick', this.onDbl);
      c.removeEventListener('keydown', this.onKey);
    }
  }

  setView(v: '2d' | '3d') {
    this.view.set(v);
    this.target = v === '3d' ? 1 : 0;
    if (this.target === 0) {
      this.yawGoal = 0;
      this.elevGoal = 0;
    }
    this.kick();
  }

  setLegendLevel(lvl: number) {
    this.legendLevel.set(lvl);
    this.kick();
  }

  toggleLegend(i: number) {
    const cur = this.legendLevel();
    this.legendLevel.set(cur === i ? -1 : i);
    this.kick();
  }

  formatNumber(n: number): string {
    return new Intl.NumberFormat('en-US').format(n);
  }

  formatDate(d: string): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
      dayMs(d)
    );
  }

  private initColors() {
    // Ocean/Cyber dark scheme aligned with application palette
    const all: RGB[] = [
      [14, 30, 45],
      [12, 45, 74],
      [18, 80, 138],
      [42, 136, 216],
      [124, 199, 255],
    ];
    for (let k = 0; k < 5; k++) {
      for (let ch = 0; ch < 3; ch++) {
        this.colGoal[k * 3 + ch] = all[k][ch];
        this.col[k * 3 + ch] = all[k][ch];
      }
    }
    this.colReady = true;
  }

  private loadModel() {
    const m = this.model();
    if (!m) return;
    this.n = m.cells.length;
    this.weeks = m.weeks;

    if (this.wk.length !== this.n) {
      this.wk = new Float32Array(this.n);
      this.dy = new Float32Array(this.n);
      this.lv = new Uint8Array(this.n);
      this.hgt = new Float32Array(this.n);
      this.zs = new Float32Array(this.n);
      this.hover = new Float32Array(this.n);
      this.dim = new Float32Array(this.n);
      this.polys = new Float32Array(this.n * 24);
      this.faces = new Uint8Array(this.n);
      this.order = Array.from({ length: this.n }, (_, i) => i);
    }

    for (let i = 0; i < this.n; i++) {
      const c = m.cells[i];
      this.wk[i] = c.week;
      this.dy[i] = c.day;
      this.lv[i] = c.level;
      this.hgt[i] = barHeight(c.count, m.max, 1.25);
    }
    this.months = m.months;
    const wf = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
    this.weekdayRows = [];
    for (let d = 0; d < 7 && d < this.n; d++) {
      const dow = new Date(dayMs(m.cells[d].date)).getUTCDay();
      if (dow === 1 || dow === 3 || dow === 5) {
        this.weekdayRows.push({ day: d, label: wf.format(dayMs(m.cells[d].date)) });
      }
    }
    this.kick();
  }

  private relayout() {
    const stage = this.stageRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!stage || !canvas || !this.n) return;

    const w = Math.round(stage.clientWidth);
    if (!w) return;
    this.W = w;
    this.gutter = this.W < 520 ? 0 : this.labelW;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    const b2 = this.extent(camera(0), 0, true);
    this.H2 = 20 + 4 + ((b2.maxy - b2.miny) / (b2.maxx - b2.minx)) * (this.W - this.gutter - 4);
    const b3 = this.extent(camera(1), 1, true);
    const natural = ((b3.maxy - b3.miny) / (b3.maxx - b3.minx)) * (this.W - 40) + 40;
    this.H3 = Math.max(Math.min(natural, this.W * 0.72, 600), Math.min(natural, 240));
    this.Hmax = Math.ceil(Math.max(this.H2, this.H3));

    canvas.width = Math.round(this.W * this.dpr);
    canvas.height = Math.round(this.Hmax * this.dpr);
    canvas.style.width = this.W + 'px';
    canvas.style.height = this.Hmax + 'px';
    this.lastH = -1;
    this.draw();
  }

  private extent(cam: Cam, e: number, full: boolean) {
    const w = lerp(0.78, 0.9, e);
    const off = (1 - w) / 2;
    let minx = Infinity;
    let maxx = -Infinity;
    let miny = Infinity;
    let maxy = -Infinity;
    const add = (x: number, y: number, z: number) => {
      const p = project(cam, x, y, z);
      if (p[0] < minx) minx = p[0];
      if (p[0] > maxx) maxx = p[0];
      if (p[1] < miny) miny = p[1];
      if (p[1] > maxy) maxy = p[1];
    };
    for (let i = 0; i < this.n; i++) {
      const x0 = this.wk[i] + off;
      const y0 = this.dy[i] + off;
      const z = full ? this.hgt[i] * e : this.zs[i];
      add(x0, y0, z);
      add(x0 + w, y0, z);
      add(x0, y0 + w, z);
      add(x0 + w, y0 + w, 0);
      add(x0, y0 + w, 0);
      add(x0 + w, y0, 0);
    }
    add(0, 7 + 1.5 * e, 0);
    add(this.weeks, 7 + 1.5 * e, 0);
    return { minx, maxx, miny, maxy };
  }

  private draw() {
    if (!this.ctx || !this.W || !this.n) return;
    const e = easeInOutCubic(this.t);
    const cam = camera(e, this.yaw, this.elev);
    const Hc = lerp(this.H2, this.H3, e);

    const stage = this.stageRef.nativeElement;
    if (Math.abs(Hc - this.lastH) > 0.2) {
      stage.style.height = Hc.toFixed(1) + 'px';
      this.lastH = Hc;
    }

    for (let i = 0; i < this.n; i++) {
      this.zs[i] = riseAt(this.t, this.wk[i], this.weeks, this.dy[i]) * this.hgt[i];
    }

    const b = this.extent(cam, e, false);
    const pad = lerp(2, 20, e);
    const left = pad + this.gutter * (1 - e);
    const top = pad + 20 * (1 - e);
    const aw = this.W - left - pad;
    const ah = Hc - top - pad;
    const bw = Math.max(1e-6, b.maxx - b.minx);
    const bh = Math.max(1e-6, b.maxy - b.miny);
    const s = Math.min(aw / bw, ah / bh);
    const ox = left + (aw - bw * s) / 2 - b.minx * s;
    const oy = top + (ah - bh * s) / 2 - b.miny * s;
    const { cs, sn, se, ce } = cam;
    const px = (x: number, y: number) => ox + (x * cs - y * sn) * s;
    const py = (x: number, y: number, z: number) => oy + ((x * sn + y * cs) * se - z * ce) * s;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.W, this.Hmax);

    this.order.sort(
      (a, c) =>
        (this.wk[a] + 0.5) * sn +
        (this.dy[a] + 0.5) * cs -
        ((this.wk[c] + 0.5) * sn + (this.dy[c] + 0.5) * cs)
    );

    const w = lerp(0.78, 0.9, e);
    const off = (1 - w) / 2;
    const radius = lerp(0.17, 0.03, e) * s;
    const outline = (1 - e) * 0.07;
    const lift = 0.7 * e;
    const ex = this.col[0];
    const ey = this.col[1];
    const ez = this.col[2];

    for (let k = 0; k < this.n; k++) {
      const i = this.order[k];
      const x0 = this.wk[i] + off;
      const y0 = this.dy[i] + off;
      const x1 = x0 + w;
      const y1 = y0 + w;
      const z = this.zs[i] + this.hover[i] * lift;
      const o = i * 24;

      this.polys[o] = px(x0, y0);
      this.polys[o + 1] = py(x0, y0, z);
      this.polys[o + 2] = px(x1, y0);
      this.polys[o + 3] = py(x1, y0, z);
      this.polys[o + 4] = px(x1, y1);
      this.polys[o + 5] = py(x1, y1, z);
      this.polys[o + 6] = px(x0, y1);
      this.polys[o + 7] = py(x0, y1, z);

      this.polys[o + 8] = px(x0, y1);
      this.polys[o + 9] = py(x0, y1, 0);
      this.polys[o + 10] = px(x1, y1);
      this.polys[o + 11] = py(x1, y1, 0);
      this.polys[o + 12] = this.polys[o + 4];
      this.polys[o + 13] = this.polys[o + 5];
      this.polys[o + 14] = this.polys[o + 6];
      this.polys[o + 15] = this.polys[o + 7];

      this.polys[o + 16] = px(x1, y0);
      this.polys[o + 17] = py(x1, y0, 0);
      this.polys[o + 18] = this.polys[o + 10];
      this.polys[o + 19] = this.polys[o + 11];
      this.polys[o + 20] = this.polys[o + 4];
      this.polys[o + 21] = this.polys[o + 5];
      this.polys[o + 22] = this.polys[o + 2];
      this.polys[o + 23] = this.polys[o + 3];

      const tall = z * ce * s;
      let f = 0;
      if (tall > 0.35 && w * cs * s > 0.35) f |= 1;
      if (tall > 0.35 && w * sn * s > 0.35) f |= 2;
      this.faces[i] = f;

      const L = this.lv[i] * 3;
      let r = this.col[L];
      let g = this.col[L + 1];
      let bl = this.col[L + 2];
      const d = this.dim[i];
      if (d > 0.002) {
        r += (ex - r) * 0.72 * d;
        g += (ey - g) * 0.72 * d;
        bl += (ez - bl) * 0.72 * d;
      }
      const hv = this.hover[i];
      if (hv > 0.002) {
        const m = 0.16 * hv;
        r += (this.fg[0] - r) * m;
        g += (this.fg[1] - g) * m;
        bl += (this.fg[2] - bl) * m;
      }
      if (f & 1) {
        this.ctx.beginPath();
        quadPath(this.ctx, this.polys, o + 8, 0);
        this.ctx.fillStyle = rgbString(r * 0.84, g * 0.84, bl * 0.84);
        this.ctx.fill();
      }
      if (f & 2) {
        this.ctx.beginPath();
        quadPath(this.ctx, this.polys, o + 16, 0);
        this.ctx.fillStyle = rgbString(r * 0.68, g * 0.68, bl * 0.68);
        this.ctx.fill();
      }
      this.ctx.beginPath();
      quadPath(this.ctx, this.polys, o, radius);
      this.ctx.fillStyle = rgbString(r, g, bl);
      this.ctx.fill();

      if (outline > 0.004) {
        this.ctx.strokeStyle = `rgba(${this.fg[0]},${this.fg[1]},${this.fg[2]},${outline.toFixed(3)})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
      if (hv > 0.02) {
        this.ctx.strokeStyle = `rgba(${this.fg[0]},${this.fg[1]},${this.fg[2]},${(0.85 * hv).toFixed(3)})`;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }
    }

    // Month & Day Labels
    const muted = mixRGB(this.bg, this.fg, 0.55);
    this.ctx.font = '10px Outfit, system-ui, sans-serif';
    const a2 = 1 - smoothstep(0, 0.4, e);
    const a3 = smoothstep(0.62, 1, e);

    if (a2 > 0.004) {
      this.ctx.fillStyle = `rgba(${Math.round(muted[0])},${Math.round(muted[1])},${Math.round(muted[2])},${a2.toFixed(3)})`;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'bottom';
      let edge = -Infinity;
      for (const m of this.months) {
        const x = px(m.week + off, -0.3);
        const tw = this.ctx.measureText(m.label).width;
        if (x < edge || x + tw > this.W) continue;
        this.ctx.fillText(m.label, x, py(m.week + off, -0.3, 0) - 3);
        edge = x + tw + 6;
      }
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'middle';
      if (this.gutter > 0) {
        for (const r of this.weekdayRows) {
          this.ctx.fillText(r.label, px(0, r.day + 0.5) - 6, py(0, r.day + 0.5, 0));
        }
      }
    }

    if (a3 > 0.004) {
      this.ctx.fillStyle = `rgba(${Math.round(muted[0])},${Math.round(muted[1])},${Math.round(muted[2])},${a3.toFixed(3)})`;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      let edge = -Infinity;
      for (const m of this.months) {
        const x = px(m.week + 0.5, 7.3);
        if (x < edge || x + this.ctx.measureText(m.label).width > this.W) continue;
        this.ctx.fillText(m.label, x, py(m.week + 0.5, 7.3, 0) + 2);
        edge = x + this.ctx.measureText(m.label).width + 10;
      }
    }

    // Tooltip position
    const tip = this.tipRef?.nativeElement;
    if (tip && this.activeIdx >= 0 && this.activeIdx < this.n) {
      const i = this.activeIdx;
      const z = this.zs[i] + this.hover[i] * lift;
      const tx = px(this.wk[i] + 0.5, this.dy[i] + 0.5);
      const ty = Math.min(
        py(this.wk[i] + off, this.dy[i] + off, z),
        py(this.wk[i] + off + w, this.dy[i] + off, z),
        py(this.wk[i] + off, this.dy[i] + off + w, z)
      );
      const half = this.tipW / 2;
      const cx = Math.min(this.W - half - 4, Math.max(half + 4, tx));
      tip.style.left = `${(cx - half).toFixed(1)}px`;
      tip.style.top = `${(ty - 34).toFixed(1)}px`;
    }
  }

  private tick = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    let moving = false;

    if (this.t !== this.target) {
      const step = (dt * 1000) / Math.max(1, this.duration);
      this.t = this.target > this.t ? Math.min(this.target, this.t + step) : Math.max(this.target, this.t - step);
      moving = true;
    }

    const ko = 1 - Math.exp(-dt * 12);
    this.yaw += (this.yawGoal - this.yaw) * ko;
    this.elev += (this.elevGoal - this.elev) * ko;
    if (Math.abs(this.yawGoal - this.yaw) > 1e-4 || Math.abs(this.elevGoal - this.elev) > 1e-4) {
      moving = true;
    } else {
      this.yaw = this.yawGoal;
      this.elev = this.elevGoal;
    }

    const kh = 1 - Math.exp(-dt * 16);
    const kd = 1 - Math.exp(-dt * 10);
    const leg = this.legendLevel();

    for (let i = 0; i < this.n; i++) {
      const hg = i === this.activeIdx ? 1 : 0;
      const dg = leg >= 0 && this.lv[i] !== leg ? 1 : 0;
      const h = this.hover[i];
      const d = this.dim[i];
      if (h !== hg) {
        this.hover[i] = Math.abs(hg - h) < 0.003 ? hg : h + (hg - h) * kh;
        moving = true;
      }
      if (d !== dg) {
        this.dim[i] = Math.abs(dg - d) < 0.003 ? dg : d + (dg - d) * kd;
        moving = true;
      }
    }

    this.draw();
    if (moving) this.raf = requestAnimationFrame(this.tick);
  };

  private kick() {
    if (this.raf || !this.isBrowser) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private hit(x: number, y: number): number {
    for (let k = this.n - 1; k >= 0; k--) {
      const i = this.order[k];
      const o = i * 24;
      if (pointInQuad(this.polys, o, x, y)) return i;
      if (this.faces[i] & 1 && pointInQuad(this.polys, o + 8, x, y)) return i;
      if (this.faces[i] & 2 && pointInQuad(this.polys, o + 16, x, y)) return i;
    }
    return -1;
  }

  private local(ev: PointerEvent | MouseEvent) {
    const canvas = this.canvasRef.nativeElement;
    const r = canvas.getBoundingClientRect();
    return [ev.clientX - r.left, ev.clientY - r.top] as const;
  }

  private refreshActive() {
    const next = this.hovered >= 0 ? this.hovered : this.pinned;
    if (next === this.activeIdx) return;
    this.activeIdx = next;
    this.activeCellIndex.set(next);
    this.kick();
  }

  private onDown = (ev: PointerEvent) => {
    if (ev.button !== 0) return;
    const can = this.target === 1;
    this.drag = {
      id: ev.pointerId,
      x: ev.clientX,
      y: ev.clientY,
      yaw: this.yawGoal,
      elev: this.elevGoal,
      moved: false,
    };
    if (can) {
      try {
        this.canvasRef.nativeElement.setPointerCapture(ev.pointerId);
      } catch {
        /* capture fallback */
      }
    }
  };

  private onMove = (ev: PointerEvent) => {
    if (this.drag && this.target === 1 && ev.pointerId === this.drag.id) {
      const dx = ev.clientX - this.drag.x;
      const dyy = ev.clientY - this.drag.y;
      if (this.drag.moved || Math.hypot(dx, dyy) > 4) {
        this.drag.moved = true;
        this.yawGoal = Math.min(
          YAW_RANGE[1] - YAW_3D,
          Math.max(YAW_RANGE[0] - YAW_3D, this.drag.yaw + dx * 0.006)
        );
        this.elevGoal = Math.min(
          ELEV_RANGE[1] - ELEV_3D,
          Math.max(ELEV_RANGE[0] - ELEV_3D, this.drag.elev + dyy * 0.004)
        );
        this.hovered = -1;
        this.refreshActive();
        this.kick();
        return;
      }
    }
    const [x, y] = this.local(ev);
    const i = this.hit(x, y);
    if (i !== this.hovered) {
      this.hovered = i;
      this.refreshActive();
    }
  };

  private onUp = (ev: PointerEvent) => {
    if (!this.drag || ev.pointerId !== this.drag.id) return;
    const wasMoved = this.drag.moved;
    this.drag = null;
    try {
      this.canvasRef.nativeElement.releasePointerCapture(ev.pointerId);
    } catch {
      /* release fallback */
    }
    if (wasMoved) return;
    const [x, y] = this.local(ev);
    const i = this.hit(x, y);
    this.pinned = i === this.pinned ? -1 : i;
    this.refreshActive();
  };

  private onCancel = () => {
    this.drag = null;
  };

  private onLeave = () => {
    if (this.drag) return;
    this.hovered = -1;
    this.refreshActive();
  };

  private onDbl = () => {
    this.yawGoal = 0;
    this.elevGoal = 0;
    this.kick();
  };

  private onKey = (ev: KeyboardEvent) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'];
    if (!keys.includes(ev.key) || !this.n) return;
    ev.preventDefault();
    if (ev.key === 'Escape') {
      this.pinned = -1;
      this.hovered = -1;
      this.refreshActive();
      return;
    }
    let i = this.pinned >= 0 ? this.pinned : this.activeIdx >= 0 ? this.activeIdx : this.n - 1;
    if (ev.key === 'ArrowLeft') i -= 7;
    if (ev.key === 'ArrowRight') i += 7;
    if (ev.key === 'ArrowUp') i -= 1;
    if (ev.key === 'ArrowDown') i += 1;
    i = Math.max(0, Math.min(this.n - 1, i));
    this.pinned = i;
    this.hovered = -1;
    this.refreshActive();
  };
}

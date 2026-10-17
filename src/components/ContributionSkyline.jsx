import React, { useState, useEffect, useRef, useMemo } from 'react';

export const DAY_MS = 86400000;
export const clamp01 = (v) => (v > 0 ? (v < 1 ? v : 1) : 0);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOutCubic = (x) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOutCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const toKey = (ms) => new Date(ms).toISOString().slice(0, 10);

export const dayMs = (v) => {
  if (typeof v === 'number') return Math.floor(v / DAY_MS) * DAY_MS;
  if (typeof v === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    v = new Date(v);
  }
  return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
};

export const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const generateContributions = (endMs, seed = 7, days = 371) => {
  const r = rng(seed);
  const bursts = Array.from({ length: 4 }, () => ({
    at: r(),
    width: 0.035 + r() * 0.07,
    gain: 0.6 + r() * 1.1,
  }));
  const out = [];
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

export const buildGrid = (data, endMs, weekStart = 0) => {
  const counts = new Map();
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
  const cells = [];
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

export const levelOf = (count, busy) =>
  count <= 0 ? 0 : busy <= 0 ? 4 : 1 + Math.min(3, Math.floor((count / busy) * 4));

export const computeStats = (cells) => {
  let total = 0;
  let best = 0;
  let bestDate = null;
  let run = 0;
  let runStart = null;
  let longest = { days: 0, start: null, end: null };
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
  const current =
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

export const monthLabels = (cells, weeks, locale = 'en-US') => {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const out = [];
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

export const barHeight = (count, max, scale = 1) =>
  count > 0 && max > 0 ? 0.4 + Math.pow(count / max, 0.85) * 7.2 * scale : 0.2;

export const WAVE = 0.42;

export const riseAt = (t, week, weeks, day) => {
  const d = (weeks > 1 ? week / (weeks - 1) : 0) * 0.36 + (day / 6) * 0.06;
  return easeOutCubic((t - d) / (1 - WAVE));
};

export const YAW_3D = Math.PI / 4;
export const ELEV_3D = (34 * Math.PI) / 180;
export const YAW_RANGE = [(8 * Math.PI) / 180, (82 * Math.PI) / 180];
export const ELEV_RANGE = [(18 * Math.PI) / 180, (62 * Math.PI) / 180];

export const camera = (e, dYaw = 0, dElev = 0) => {
  const yaw = Math.min(YAW_RANGE[1], Math.max(0, lerp(0, YAW_3D + dYaw, e)));
  const elev = lerp(Math.PI / 2, Math.min(ELEV_RANGE[1], Math.max(ELEV_RANGE[0], ELEV_3D + dElev)), e);
  return { cs: Math.cos(yaw), sn: Math.sin(yaw), se: Math.sin(elev), ce: Math.cos(elev) };
};

export const project = (c, x, y, z) => [
  x * c.cs - y * c.sn,
  (x * c.sn + y * c.cs) * c.se - z * c.ce,
];

export const mixRGB = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const pointInQuad = (p, o, x, y) => {
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

const quadPath = (ctx, p, o, r) => {
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

const rgbString = (r, g, b) =>
  `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

export default function ContributionSkyline({ githubUsername = 'pgdiginitin78', defaultView = '2d' }) {
  const [view, setView] = useState(defaultView);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [legendLevel, setLegendLevel] = useState(-1);
  const [rawDays, setRawDays] = useState(() => generateContributions(dayMs(new Date()), 42));

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const tipRef = useRef(null);

  const model = useMemo(() => {
    const end = dayMs(new Date());
    const grid = buildGrid(rawDays, end, 0);
    return {
      ...grid,
      stats: computeStats(grid.cells),
      months: monthLabels(grid.cells, grid.weeks, 'en-US'),
    };
  }, [rawDays]);

  const swatches = useMemo(() => [
    '#0e1e2d',
    '#0c2d4a',
    '#12508a',
    '#2a88d8',
    '#7cc7ff',
  ], []);

  useEffect(() => {
    if (!githubUsername) return;
    setLoading(true);
    fetch(`https://api.github.com/users/${githubUsername}/events`)
      .then((res) => (res.ok ? res.json() : []))
      .then((events) => {
        if (Array.isArray(events) && events.length > 0) {
          const map = new Map();
          rawDays.forEach((d) => map.set(d.date, d.count));
          events.forEach((ev) => {
            if (ev.created_at) {
              const d = ev.created_at.slice(0, 10);
              let c = 1;
              if (ev.type === 'PushEvent' && ev.payload?.commits?.length) {
                c = ev.payload.commits.length;
              }
              map.set(d, (map.get(d) ?? 0) + c);
            }
          });
          setRawDays(Array.from(map.entries()).map(([date, count]) => ({ date, count })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [githubUsername]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let t = view === '3d' ? 1 : 0;
    let target = view === '3d' ? 1 : 0;
    let yaw = 0;
    let elev = 0;
    let yawGoal = 0;
    let elevGoal = 0;
    let W = 0;
    let H2 = 0;
    let H3 = 0;
    let Hmax = 0;
    let lastH = -1;
    let dpr = 1;
    let gutter = 30;
    const labelW = 30;

    const col = new Float32Array(15);
    const colGoal = new Float32Array(15);
    const all = [
      [14, 30, 45],
      [12, 45, 74],
      [18, 80, 138],
      [42, 136, 216],
      [124, 199, 255],
    ];
    for (let k = 0; k < 5; k++) {
      for (let ch = 0; ch < 3; ch++) {
        colGoal[k * 3 + ch] = all[k][ch];
        col[k * 3 + ch] = all[k][ch];
      }
    }

    const n = model.cells.length;
    const weeks = model.weeks;
    const wk = new Float32Array(n);
    const dy = new Float32Array(n);
    const lv = new Uint8Array(n);
    const hgt = new Float32Array(n);
    const zs = new Float32Array(n);
    const hover = new Float32Array(n);
    const dim = new Float32Array(n);
    const polys = new Float32Array(n * 24);
    const faces = new Uint8Array(n);
    const order = Array.from({ length: n }, (_, i) => i);

    for (let i = 0; i < n; i++) {
      const c = model.cells[i];
      wk[i] = c.week;
      dy[i] = c.day;
      lv[i] = c.level;
      hgt[i] = barHeight(c.count, model.max, 1.25);
    }

    const wf = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
    const weekdayRows = [];
    for (let d = 0; d < 7 && d < n; d++) {
      const dow = new Date(dayMs(model.cells[d].date)).getUTCDay();
      if (dow === 1 || dow === 3 || dow === 5) {
        weekdayRows.push({ day: d, label: wf.format(dayMs(model.cells[d].date)) });
      }
    }

    let hovered = -1;
    let pinned = -1;
    let active = -1;
    let drag = null;

    target = view === '3d' ? 1 : 0;
    if (target === 0) {
      yawGoal = 0;
      elevGoal = 0;
    }

    const extent = (cam, e, full) => {
      const w = lerp(0.78, 0.9, e);
      const off = (1 - w) / 2;
      let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
      const add = (x, y, z) => {
        const p = project(cam, x, y, z);
        if (p[0] < minx) minx = p[0];
        if (p[0] > maxx) maxx = p[0];
        if (p[1] < miny) miny = p[1];
        if (p[1] > maxy) maxy = p[1];
      };
      for (let i = 0; i < n; i++) {
        const x0 = wk[i] + off;
        const y0 = dy[i] + off;
        const z = full ? hgt[i] * e : zs[i];
        add(x0, y0, z);
        add(x0 + w, y0, z);
        add(x0, y0 + w, z);
        add(x0 + w, y0 + w, 0);
        add(x0, y0 + w, 0);
        add(x0 + w, y0, 0);
      }
      add(0, 7 + 1.5 * e, 0);
      add(weeks, 7 + 1.5 * e, 0);
      return { minx, maxx, miny, maxy };
    };

    const draw = () => {
      if (!ctx || !W || !n) return;
      const e = easeInOutCubic(t);
      const cam = camera(e, yaw, elev);
      const Hc = lerp(H2, H3, e);

      if (Math.abs(Hc - lastH) > 0.2) {
        stage.style.height = `${Hc.toFixed(1)}px`;
        lastH = Hc;
      }

      for (let i = 0; i < n; i++) {
        zs[i] = riseAt(t, wk[i], weeks, dy[i]) * hgt[i];
      }

      const b = extent(cam, e, false);
      const pad = lerp(2, 20, e);
      const left = pad + gutter * (1 - e);
      const top = pad + 20 * (1 - e);
      const aw = W - left - pad;
      const ah = Hc - top - pad;
      const bw = Math.max(1e-6, b.maxx - b.minx);
      const bh = Math.max(1e-6, b.maxy - b.miny);
      const s = Math.min(aw / bw, ah / bh);
      const ox = left + (aw - bw * s) / 2 - b.minx * s;
      const oy = top + (ah - bh * s) / 2 - b.miny * s;
      const { cs, sn, se, ce } = cam;
      const px = (x, y) => ox + (x * cs - y * sn) * s;
      const py = (x, y, z) => oy + ((x * sn + y * cs) * se - z * ce) * s;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, Hmax);

      order.sort(
        (a, c) =>
          (wk[a] + 0.5) * sn +
          (dy[a] + 0.5) * cs -
          ((wk[c] + 0.5) * sn + (dy[c] + 0.5) * cs)
      );

      const w = lerp(0.78, 0.9, e);
      const off = (1 - w) / 2;
      const radius = lerp(0.17, 0.03, e) * s;
      const outline = (1 - e) * 0.07;
      const lift = 0.7 * e;
      const ex = col[0], ey = col[1], ez = col[2];

      for (let k = 0; k < n; k++) {
        const i = order[k];
        const x0 = wk[i] + off;
        const y0 = dy[i] + off;
        const x1 = x0 + w;
        const y1 = y0 + w;
        const z = zs[i] + hover[i] * lift;
        const o = i * 24;

        polys[o] = px(x0, y0); polys[o + 1] = py(x0, y0, z);
        polys[o + 2] = px(x1, y0); polys[o + 3] = py(x1, y0, z);
        polys[o + 4] = px(x1, y1); polys[o + 5] = py(x1, y1, z);
        polys[o + 6] = px(x0, y1); polys[o + 7] = py(x0, y1, z);

        polys[o + 8] = px(x0, y1); polys[o + 9] = py(x0, y1, 0);
        polys[o + 10] = px(x1, y1); polys[o + 11] = py(x1, y1, 0);
        polys[o + 12] = polys[o + 4]; polys[o + 13] = polys[o + 5];
        polys[o + 14] = polys[o + 6]; polys[o + 15] = polys[o + 7];

        polys[o + 16] = px(x1, y0); polys[o + 17] = py(x1, y0, 0);
        polys[o + 18] = polys[o + 10]; polys[o + 19] = polys[o + 11];
        polys[o + 20] = polys[o + 4]; polys[o + 21] = polys[o + 5];
        polys[o + 22] = polys[o + 2]; polys[o + 23] = polys[o + 3];

        const tall = z * ce * s;
        let f = 0;
        if (tall > 0.35 && w * cs * s > 0.35) f |= 1;
        if (tall > 0.35 && w * sn * s > 0.35) f |= 2;
        faces[i] = f;

        const L = lv[i] * 3;
        let r = col[L], g = col[L + 1], bl = col[L + 2];
        const d = dim[i];
        if (d > 0.002) {
          r += (ex - r) * 0.72 * d;
          g += (ey - g) * 0.72 * d;
          bl += (ez - bl) * 0.72 * d;
        }
        const hv = hover[i];
        if (hv > 0.002) {
          const m = 0.16 * hv;
          r += (226 - r) * m;
          g += (232 - g) * m;
          bl += (240 - bl) * m;
        }
        if (f & 1) {
          ctx.beginPath();
          quadPath(ctx, polys, o + 8, 0);
          ctx.fillStyle = rgbString(r * 0.84, g * 0.84, bl * 0.84);
          ctx.fill();
        }
        if (f & 2) {
          ctx.beginPath();
          quadPath(ctx, polys, o + 16, 0);
          ctx.fillStyle = rgbString(r * 0.68, g * 0.68, bl * 0.68);
          ctx.fill();
        }
        ctx.beginPath();
        quadPath(ctx, polys, o, radius);
        ctx.fillStyle = rgbString(r, g, bl);
        ctx.fill();

        if (outline > 0.004) {
          ctx.strokeStyle = `rgba(226,232,240,${outline.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (hv > 0.02) {
          ctx.strokeStyle = `rgba(226,232,240,${(0.85 * hv).toFixed(3)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      ctx.font = '10px Outfit, system-ui, sans-serif';
      const a2 = 1 - smoothstep(0, 0.4, e);
      const a3 = smoothstep(0.62, 1, e);

      if (a2 > 0.004) {
        ctx.fillStyle = `rgba(148,163,184,${a2.toFixed(3)})`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        let edge = -Infinity;
        for (const m of model.months) {
          const x = px(m.week + off, -0.3);
          const tw = ctx.measureText(m.label).width;
          if (x < edge || x + tw > W) continue;
          ctx.fillText(m.label, x, py(m.week + off, -0.3, 0) - 3);
          edge = x + tw + 6;
        }
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        if (gutter > 0) {
          for (const r of weekdayRows) {
            ctx.fillText(r.label, px(0, r.day + 0.5) - 6, py(0, r.day + 0.5, 0));
          }
        }
      }

      if (a3 > 0.004) {
        ctx.fillStyle = `rgba(148,163,184,${a3.toFixed(3)})`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        let edge = -Infinity;
        for (const m of model.months) {
          const x = px(m.week + 0.5, 7.3);
          if (x < edge || x + ctx.measureText(m.label).width > W) continue;
          ctx.fillText(m.label, x, py(m.week + 0.5, 7.3, 0) + 2);
          edge = x + ctx.measureText(m.label).width + 10;
        }
      }

      const tip = tipRef.current;
      if (tip && active >= 0 && active < n) {
        const i = active;
        const z = zs[i] + hover[i] * lift;
        const tx = px(wk[i] + 0.5, dy[i] + 0.5);
        const ty = Math.min(
          py(wk[i] + off, dy[i] + off, z),
          py(wk[i] + off + w, dy[i] + off, z),
          py(wk[i] + off, dy[i] + off + w, z)
        );
        const half = 60;
        const cx = Math.min(W - half - 4, Math.max(half + 4, tx));
        tip.style.left = `${(cx - half).toFixed(1)}px`;
        tip.style.top = `${(ty - 34).toFixed(1)}px`;
      }
    };

    const relayout = () => {
      const w = Math.round(stage.clientWidth);
      if (!w || !n) return;
      W = w;
      gutter = W < 520 ? 0 : labelW;
      dpr = Math.min(2, window.devicePixelRatio || 1);

      const b2 = extent(camera(0), 0, true);
      H2 = 20 + 4 + ((b2.maxy - b2.miny) / (b2.maxx - b2.minx)) * (W - gutter - 4);
      const b3 = extent(camera(1), 1, true);
      const natural = ((b3.maxy - b3.miny) / (b3.maxx - b3.minx)) * (W - 40) + 40;
      H3 = Math.max(Math.min(natural, W * 0.72, 600), Math.min(natural, 240));
      Hmax = Math.ceil(Math.max(H2, H3));

      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(Hmax * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${Hmax}px`;
      lastH = -1;
      draw();
    };

    relayout();
    const observer = new ResizeObserver(relayout);
    observer.observe(stage);

    const tick = (now) => {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      let moving = false;

      if (t !== target) {
        const step = (dt * 1000) / 1200;
        t = target > t ? Math.min(target, t + step) : Math.max(target, t - step);
        moving = true;
      }

      const ko = 1 - Math.exp(-dt * 12);
      yaw += (yawGoal - yaw) * ko;
      elev += (elevGoal - elev) * ko;
      if (Math.abs(yawGoal - yaw) > 1e-4 || Math.abs(elevGoal - elev) > 1e-4) {
        moving = true;
      } else {
        yaw = yawGoal;
        elev = elevGoal;
      }

      const kh = 1 - Math.exp(-dt * 16);
      const kd = 1 - Math.exp(-dt * 10);
      for (let i = 0; i < n; i++) {
        const hg = i === active ? 1 : 0;
        const dg = legendLevel >= 0 && lv[i] !== legendLevel ? 1 : 0;
        const h = hover[i];
        const d = dim[i];
        if (h !== hg) {
          hover[i] = Math.abs(hg - h) < 0.003 ? hg : h + (hg - h) * kh;
          moving = true;
        }
        if (d !== dg) {
          dim[i] = Math.abs(dg - d) < 0.003 ? dg : d + (dg - d) * kd;
          moving = true;
        }
      }

      draw();
      if (moving) raf = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const refreshActive = () => {
      const next = hovered >= 0 ? hovered : pinned;
      if (next === active) return;
      active = next;
      setActiveIdx(next);
      kick();
    };

    const hit = (x, y) => {
      for (let k = n - 1; k >= 0; k--) {
        const i = order[k];
        const o = i * 24;
        if (pointInQuad(polys, o, x, y)) return i;
        if (faces[i] & 1 && pointInQuad(polys, o + 8, x, y)) return i;
        if (faces[i] & 2 && pointInQuad(polys, o + 16, x, y)) return i;
      }
      return -1;
    };

    const onDown = (ev) => {
      if (ev.button !== 0) return;
      drag = {
        id: ev.pointerId,
        x: ev.clientX,
        y: ev.clientY,
        yaw: yawGoal,
        elev: elevGoal,
        moved: false,
      };
      try {
        canvas.setPointerCapture(ev.pointerId);
      } catch {}
    };

    const onMove = (ev) => {
      if (drag && target === 1 && ev.pointerId === drag.id) {
        const dx = ev.clientX - drag.x;
        const dyy = ev.clientY - drag.y;
        if (drag.moved || Math.hypot(dx, dyy) > 4) {
          drag.moved = true;
          yawGoal = Math.min(YAW_RANGE[1] - YAW_3D, Math.max(YAW_RANGE[0] - YAW_3D, drag.yaw + dx * 0.006));
          elevGoal = Math.min(ELEV_RANGE[1] - ELEV_3D, Math.max(ELEV_RANGE[0] - ELEV_3D, drag.elev + dyy * 0.004));
          hovered = -1;
          refreshActive();
          kick();
          return;
        }
      }
      const r = canvas.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      const i = hit(x, y);
      if (i !== hovered) {
        hovered = i;
        refreshActive();
      }
    };

    const onUp = (ev) => {
      if (!drag || ev.pointerId !== drag.id) return;
      const wasMoved = drag.moved;
      drag = null;
      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch {}
      if (wasMoved) return;
      const r = canvas.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      const i = hit(x, y);
      pinned = i === pinned ? -1 : i;
      refreshActive();
    };

    const onLeave = () => {
      if (drag) return;
      hovered = -1;
      refreshActive();
    };

    const onDbl = () => {
      yawGoal = 0;
      elevGoal = 0;
      kick();
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('dblclick', onDbl);

    kick();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('dblclick', onDbl);
    };
  }, [view, model, legendLevel]);

  const activeCell = activeIdx >= 0 && model.cells[activeIdx] ? model.cells[activeIdx] : null;

  return (
    <section className="relative w-full rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 sm:p-6 backdrop-blur-xl shadow-2xl text-slate-100">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-400/20 text-sky-400">
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </div>
          <div>
            <h3 className="m-0 text-base font-semibold leading-snug text-slate-100 flex items-center gap-2">
              <span>GitHub Contribution Skyline</span>
              {loading && <span className="inline-block text-xs font-normal text-sky-400 animate-pulse">Fetching live activity...</span>}
            </h3>
            <p className="m-0 text-xs text-slate-400">
              <span className="font-semibold text-sky-400">{new Intl.NumberFormat('en-US').format(model.stats.total)}</span> contributions in the last year
              {githubUsername && <span> · {githubUsername}</span>}
            </p>
          </div>
        </div>

        <div role="group" aria-label="Chart view" className="relative inline-flex rounded-xl border border-slate-700/60 bg-slate-900/80 p-0.5">
          <span
            aria-hidden="true"
            className={`absolute top-0.5 bottom-0.5 rounded-lg bg-sky-500/20 border border-sky-400/30 transition-transform duration-500 ease-out w-8 ${
              view === '3d' ? 'translate-x-8' : 'translate-x-0'
            }`}
          />
          <button
            type="button"
            title="Flat heat map"
            onClick={() => setView('2d')}
            className={`relative z-10 grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent p-0 transition-colors duration-300 ${
              view === '2d' ? 'text-sky-300' : 'text-slate-400'
            }`}
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
            title="3D isometric skyline"
            onClick={() => setView('3d')}
            className={`relative z-10 grid h-8 w-8 place-items-center rounded-lg border-0 bg-transparent p-0 transition-colors duration-300 ${
              view === '3d' ? 'text-sky-300' : 'text-slate-400'
            }`}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 1.2 14.2 4.6v6.8L8 14.8 1.8 11.4V4.6Z" strokeLinejoin="round" />
              <path d="M1.8 4.6 8 8l6.2-3.4M8 8v6.8" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 sm:p-4">
        <div ref={stageRef} className="relative w-full overflow-hidden rounded-lg min-h-[160px] md:min-h-[200px]">
          <canvas ref={canvasRef} tabIndex={0} role="img" className="absolute top-0 left-0 block outline-none cursor-grab active:cursor-grabbing" />
          <div
            ref={tipRef}
            role="tooltip"
            className={`pointer-events-none absolute z-20 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-900/95 px-3 py-1.5 text-xs font-medium text-slate-100 shadow-xl transition-opacity duration-150 backdrop-blur-md ${
              activeCell ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {activeCell && (
              <>
                <strong className="font-semibold text-sky-400">{activeCell.count} {activeCell.count === 1 ? 'contribution' : 'contributions'}</strong>
                <span className="text-slate-400"> on {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(dayMs(activeCell.date))}</span>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-800/80 pt-4">
          <div className="rounded-lg bg-slate-950/40 border border-slate-800/60 p-2.5 sm:p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">1 Year Total</div>
            <div className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-sky-400">{new Intl.NumberFormat('en-US').format(model.stats.total)}</div>
            <div className="text-[11px] text-slate-400 truncate">Activity count</div>
          </div>
          <div className="rounded-lg bg-slate-950/40 border border-slate-800/60 p-2.5 sm:p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Busiest Day</div>
            <div className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-sky-400">{new Intl.NumberFormat('en-US').format(model.stats.busiest.count)}</div>
            <div className="text-[11px] text-slate-400 truncate">{model.stats.busiest.date ?? '—'}</div>
          </div>
          <div className="rounded-lg bg-slate-950/40 border border-slate-800/60 p-2.5 sm:p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Longest Streak</div>
            <div className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-emerald-400">{model.stats.longest.days} <span className="text-xs font-normal text-slate-400">days</span></div>
            <div className="text-[11px] text-slate-400 truncate">{model.stats.longest.start ?? '—'}</div>
          </div>
          <div className="rounded-lg bg-slate-950/40 border border-slate-800/60 p-2.5 sm:p-3">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Current Streak</div>
            <div className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-violet-400">{model.stats.current.days} <span className="text-xs font-normal text-slate-400">days</span></div>
            <div className="text-[11px] text-slate-400 truncate">{model.stats.current.start ?? '—'}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{view === '3d' ? 'Drag to orbit in 3D · Double-click to reset' : 'Hover a cell · Arrow keys to walk grid'}</span>
          </div>

          <div className="flex items-center gap-1.5" onMouseLeave={() => setLegendLevel(-1)}>
            <span className="text-[11px] text-slate-400">Less</span>
            {swatches.map((c, i) => (
              <button
                key={i}
                type="button"
                title={`Highlight level ${i}`}
                onMouseEnter={() => setLegendLevel(i)}
                onClick={() => setLegendLevel((prev) => (prev === i ? -1 : i))}
                className="h-3 w-3 rounded-sm transition-transform duration-200 hover:scale-125 focus-visible:outline-2 focus-visible:outline-sky-400"
                style={{ backgroundColor: c }}
              />
            ))}
            <span className="text-[11px] text-slate-400">More</span>
          </div>
        </div>
      </div>
    </section>
  );
}

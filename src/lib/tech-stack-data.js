import * as THREE from 'three';

const rawHomes = [
  [-1.1, 1.62, -1.7, 0.76],
  [0.65, 1.7, -1.7, 0.8],
  [2.17, 0.85, -1.7, 0.76],
  [-2.48, 0.65, -1.7, 0.77],
  [-0.85, -0.1, -1.7, 0.8],
  [0.85, -0.05, -1.7, 0.78],
  [-1.85, -1.38, -1.7, 0.75],
  [0.1, -1.72, -1.7, 0.78],
  [1.93, -1.22, -1.7, 0.76],
  [-1.72, 1.15, 0, 0.79],
  [0.05, 1.38, 0, 0.82],
  [1.82, 1.1, 0, 0.78],
  [-3.02, -0.05, 0, 0.76],
  [-1.35, -0.6, 0, 0.78],
  [0.42, -0.42, 0, 0.81],
  [2.98, -0.18, 0, 0.75],
  [1.86, -1.45, 0, 0.77],
  [-0.75, -2.13, 0, 0.74],
  [-1.9, 0.55, 1.7, 0.82],
  [0.02, 1.04, 1.7, 0.83],
  [1.87, -0.04, 1.7, 0.8],
  [-1.18, -1.28, 1.7, 0.83],
  [0.63, -1.22, 1.7, 0.82],
];

export const sphereHomes = rawHomes.map(([x, y, z, r]) => [
  x * 0.72,
  y * 0.7 - 0.1,
  z,
  r,
]);

export const smoothAlpha = (rate, dt) => 1 - Math.exp(-rate * dt);

export function cursorForce(dx, dy, speed) {
  const distance = Math.hypot(dx, dy);
  const reach = 1.85;
  if (distance >= reach || distance < 0.001) return { x: 0, y: 0 };

  const strength = Math.pow(1 - distance / reach, 2) * (Math.min(speed, 5) * 1.8 + 1.2);
  return {
    x: (dx / distance) * strength,
    y: (dy / distance) * strength,
  };
}

export function logoPatch() {
  const geometry = new THREE.PlaneGeometry(1.28, 1.28, 24, 24);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    positions.setZ(i, Math.sqrt(Math.max(0.01, 1 - x * x - y * y)) + 0.008);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export const techList = [
  'docker',
  'mongodb',
  'php',
  'react',
  'git',
  'redux',
  'html5',
  'linux',
  'figma',
  'typescript',
  'vite',
  'gsap',
  'mysql',
  'nodejs',
  'python',
  'css',
  'postgresql',
  'tailwind',
  'threejs',
  'javascript',
  'react',
  'nextjs',
  'angular',
];

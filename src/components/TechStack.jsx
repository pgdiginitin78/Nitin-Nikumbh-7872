import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { sphereHomes, smoothAlpha, cursorForce, logoPatch, techList } from '../lib/tech-stack-data.js';
import { SVG_ICONS } from '../lib/svg-bundle.js';

export default function TechStack() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let isDisposed = false;
    let renderer;
    let scene;
    let camera;
    let world;
    let balls = [];
    let animationFrameId = null;
    let observer;

    const ndc = new THREE.Vector2(-999, -999);
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const target = new THREE.Vector3();
    const pointer = new THREE.Vector3();
    const previous = new THREE.Vector3();
    let inside = false;
    let started = false;
    let lastTime = performance.now();
    let accumulator = 0;

    const init = async () => {
      await RAPIER.init();
      if (isDisposed) return;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);

      scene = new THREE.Scene();

      const aspect = width / height;
      const halfW = Math.max(4.6, 3.1 * aspect);
      const halfH = halfW / aspect;

      camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 50);
      camera.position.set(0, -0.15, 15);

      const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x111827, 1.6);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xf8fafc, 2.0);
      keyLight.position.set(-3, 5, 7);
      scene.add(keyLight);

      const pinkLight = new THREE.DirectionalLight(0xffd1dc, 3.0);
      pinkLight.position.set(-4, 3, -1);
      scene.add(pinkLight);

      const blueLight = new THREE.DirectionalLight(0xa6c8ff, 1.5);
      blueLight.position.set(4, -1, 3);
      scene.add(blueLight);

      world = new RAPIER.World({ x: 0, y: 0, z: 0 });
      world.timestep = 1 / 60;

      const geometry = new THREE.SphereGeometry(1, 48, 32);
      const patch = logoPatch();
      const pearlMat = new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        roughness: 0.18,
        metalness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.12,
      });

      balls = [];

      sphereHomes.forEach(([x, y, z, r], i) => {
        const scaledR = r * 0.55;
        const mesh = new THREE.Mesh(geometry, pearlMat);
        mesh.scale.setScalar(scaledR);
        scene.add(mesh);

        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(x, y, z)
          .setLinearDamping(4)
          .setAngularDamping(6);

        const body = world.createRigidBody(bodyDesc);
        const colliderDesc = RAPIER.ColliderDesc.ball(scaledR).setRestitution(0.08).setFriction(0.35);
        world.createCollider(colliderDesc, body);

        const techId = techList[i % techList.length];
        const dataUrl = SVG_ICONS[techId];

        if (dataUrl) {
          const c = document.createElement('canvas');
          c.width = 512;
          c.height = 512;
          const texture = new THREE.CanvasTexture(c);
          texture.colorSpace = THREE.SRGBColorSpace;

          const mat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            toneMapped: false,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
          });

          mesh.add(new THREE.Mesh(patch, mat));

          const img = new Image();
          img.onload = () => {
            if (isDisposed) return;
            const ctx = c.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, 512, 512);
              ctx.drawImage(img, 48, 48, 416, 416);
              texture.needsUpdate = true;
            }
          };
          img.src = dataUrl;
        }

        balls.push({
          mesh,
          body,
          home: new THREE.Vector3(x, y, z),
        });
      });

      lastTime = performance.now();
      animate(performance.now());
    };

    const onResize = () => {
      if (!camera || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;

      renderer.setSize(width, height);
      const aspect = width / height;
      const halfW = Math.max(7.5, 5.0 * aspect);
      const halfH = halfW / aspect;

      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
    };

    observer = new ResizeObserver(onResize);
    observer.observe(container);

    const onPointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      if (camera) {
        raycaster.setFromCamera(ndc, camera);
        raycaster.ray.intersectPlane(plane, target);
      }
      inside = true;

      if (!started) {
        pointer.copy(target);
        previous.copy(target);
        started = true;
      }
    };

    const onPointerLeave = () => {
      inside = false;
      started = false;
      ndc.set(0, 0);
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);

    const animate = (now) => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      previous.copy(pointer);
      pointer.lerp(target, smoothAlpha(10, dt));

      const speed = dt > 0 ? Math.min(pointer.distanceTo(previous) / dt, 5) : 0;
      accumulator += dt;

      while (accumulator >= 1 / 60) {
        balls.forEach(({ body, home }) => {
          const pos = body.translation();
          const vel = body.linvel();
          const force = inside
            ? cursorForce(pos.x - pointer.x, pos.y - pointer.y, speed)
            : { x: 0, y: 0 };

          if (Math.abs(pos.x) > 3.2) {
            body.setTranslation({ x: Math.sign(pos.x) * 3.2, y: pos.y, z: pos.z }, true);
            body.setLinvel({ x: -vel.x * 0.5, y: vel.y, z: vel.z }, true);
          }
          if (Math.abs(pos.y) > 2.0) {
            body.setTranslation({ x: pos.x, y: Math.sign(pos.y) * 2.0, z: pos.z }, true);
            body.setLinvel({ x: vel.x, y: -vel.y * 0.5, z: vel.z }, true);
          }

          body.resetForces(false);
          body.addForce(
            {
              x: (home.x - pos.x) * 7.5 - vel.x * 0.8 + force.x,
              y: (home.y - pos.y) * 7.5 - vel.y * 0.8 + force.y,
              z: (home.z - pos.z) * 9.5 - vel.z * 0.8,
            },
            true
          );

          const q = body.rotation();
          const angular = body.angvel();
          body.resetTorques(false);

          body.addTorque(
            {
              x: -q.x * 6.0 - angular.x * 0.4 - force.y * 0.08,
              y: -q.y * 6.0 - angular.y * 0.4 + force.x * 0.08,
              z: -q.z * 6.0 - angular.z * 0.4,
            },
            true
          );
        });

        world?.step();
        accumulator -= 1 / 60;
      }

      balls.forEach(({ mesh, body }) => {
        const p = body.translation();
        const q = body.rotation();
        mesh.position.set(p.x, p.y, p.z);
        mesh.quaternion.set(q.x, q.y, q.z, q.w);
      });

      if (camera && renderer && scene) {
        camera.position.x +=
          (inside ? ndc.x * 0.18 - camera.position.x : -camera.position.x) *
          smoothAlpha(4, dt);
        camera.lookAt(0, -0.15, 0);
        renderer.render(scene, camera);
      }
    };

    init();

    return () => {
      isDisposed = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      observer?.disconnect();
      if (world) {
        world.free();
        world = null;
      }
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
      balls.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      });
      balls = [];
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[580px] md:h-[650px] overflow-hidden rounded-3xl bg-slate-950/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl touch-none"
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-500 uppercase tracking-widest">
        Interactive 3D Physics · Move Cursor Over Spheres
      </div>
    </div>
  );
}

import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { sphereHomes, smoothAlpha, cursorForce, logoPatch, techList } from './tech-stack-data';
import { SVG_ICONS } from './svg-bundle';

interface BallItem {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
  home: THREE.Vector3;
}

@Injectable({
  providedIn: 'root',
})
export class TechStackSceneService {
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private world: RAPIER.World | null = null;
  private balls: BallItem[] = [];
  private animationFrameId: number | null = null;
  private isDisposed = false;

  // Pointer & Raycasting
  private ndc = new THREE.Vector2(-999, -999);
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private target = new THREE.Vector3();
  private pointer = new THREE.Vector3();
  private previous = new THREE.Vector3();
  private inside = false;
  private started = false;

  private lastTime = 0;
  private accumulator = 0;

  constructor(private ngZone: NgZone) {}

  setScrollProgress(_progress: number) {}

  async initialize(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.isDisposed = false;
    await RAPIER.init();
    if (this.isDisposed) return;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const width = container.clientWidth;
    const height = container.clientHeight;
    this.renderer.setSize(width, height);

    this.scene = new THREE.Scene();

    const aspect = width / height;
    const halfW = Math.max(4.6, 3.1 * aspect);
    const halfH = halfW / aspect;

    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 50);
    this.camera.position.set(0, -0.15, 15);

    // Lighting setup exactly matching reference
    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x111827, 1.6);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 2.0);
    keyLight.position.set(-3, 5, 7);
    this.scene.add(keyLight);

    const pinkLight = new THREE.DirectionalLight(0xffd1dc, 3.0);
    pinkLight.position.set(-4, 3, -1);
    this.scene.add(pinkLight);

    const blueLight = new THREE.DirectionalLight(0xa6c8ff, 1.5);
    blueLight.position.set(4, -1, 3);
    this.scene.add(blueLight);

    // Physics World
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.world.timestep = 1 / 60;

    const geometry = new THREE.SphereGeometry(1, 48, 32);
    const patch = logoPatch();
    const pearlMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.18,
      metalness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
    });

    this.balls = [];

    sphereHomes.forEach(([x, y, z, r], i) => {
      const scaledR = r * 0.55;
      const mesh = new THREE.Mesh(geometry, pearlMat);
      mesh.scale.setScalar(scaledR);
      this.scene.add(mesh);

      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setLinearDamping(4)
        .setAngularDamping(6);

      const body = this.world!.createRigidBody(bodyDesc);

      const colliderDesc = RAPIER.ColliderDesc.ball(scaledR).setRestitution(0.08).setFriction(0.35);

      this.world!.createCollider(colliderDesc, body);

      const techId = techList[i % techList.length];
      const dataUrl = SVG_ICONS[techId];

      if (dataUrl) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const texture = new THREE.CanvasTexture(canvas);
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
          if (this.isDisposed) return;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, 512, 512);
            ctx.drawImage(img, 48, 48, 416, 416);
            texture.needsUpdate = true;
          }
        };
        img.src = dataUrl;
      }

      this.balls.push({
        mesh,
        body,
        home: new THREE.Vector3(x, y, z),
      });
    });

    this.lastTime = performance.now();
    this.ngZone.runOutsideAngular(() => {
      this.animate(performance.now());
    });
  }

  onPointerMove(event: PointerEvent, container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    this.ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    this.raycaster.setFromCamera(this.ndc, this.camera);
    this.raycaster.ray.intersectPlane(this.plane, this.target);
    this.inside = true;

    if (!this.started) {
      this.pointer.copy(this.target);
      this.previous.copy(this.target);
      this.started = true;
    }
  }

  onPointerLeave() {
    this.inside = false;
    this.started = false;
    this.ndc.set(0, 0);
  }

  onResize(container: HTMLElement) {
    if (!this.camera || !this.renderer) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;

    this.renderer.setSize(width, height);
    const aspect = width / height;
    const halfW = Math.max(7.5, 5.0 * aspect);
    const halfH = halfW / aspect;

    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }

  private animate = (now: number) => {
    if (this.isDisposed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.previous.copy(this.pointer);
    this.pointer.lerp(this.target, smoothAlpha(10, dt));

    const speed = dt > 0 ? Math.min(this.pointer.distanceTo(this.previous) / dt, 5) : 0;

    this.accumulator += dt;

    while (this.accumulator >= 1 / 60) {
      this.balls.forEach(({ body, home }) => {
        const pos = body.translation();
        const vel = body.linvel();
        const force = this.inside
          ? cursorForce(pos.x - this.pointer.x, pos.y - this.pointer.y, speed)
          : { x: 0, y: 0 };

        // Containment bounds: keep balls safely within central section area
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
          true,
        );

        const q = body.rotation();
        const angular = body.angvel();
        body.resetTorques(false);

        // Strong self-righting spring torque keeps all logos upright
        body.addTorque(
          {
            x: -q.x * 6.0 - angular.x * 0.4 - force.y * 0.08,
            y: -q.y * 6.0 - angular.y * 0.4 + force.x * 0.08,
            z: -q.z * 6.0 - angular.z * 0.4,
          },
          true,
        );
      });

      this.world?.step();
      this.accumulator -= 1 / 60;
    }

    // Sync mesh transforms
    this.balls.forEach(({ mesh, body }) => {
      const p = body.translation();
      const q = body.rotation();
      mesh.position.set(p.x, p.y, p.z);
      mesh.quaternion.set(q.x, q.y, q.z, q.w);
    });

    // Camera parallax
    this.camera.position.x +=
      (this.inside ? this.ndc.x * 0.18 - this.camera.position.x : -this.camera.position.x) *
      smoothAlpha(4, dt);
    this.camera.lookAt(0, -0.15, 0);

    this.renderer.render(this.scene, this.camera);
  };

  destroy() {
    this.isDisposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
    this.balls.forEach(({ mesh }) => {
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    this.balls = [];
  }
}

import {
  Component,
  ElementRef,
  ViewChild,
  afterNextRender,
  OnDestroy,
  signal,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { typingClip, eyebrowClip, damp, pointerTarget } from '../../lib/character-animation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-character-scene',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #host class="character-stage" aria-label="Animated 3D developer working at a computer">
      <p *ngIf="failed()" class="scene-fallback">Nitin Nikumbh</p>
    </div>
  `,
  styles: [
    `
      .character-stage {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }
      .scene-fallback {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #e2e8f0;
      }
      :host {
        display: block;
        position: absolute;
        inset: 0;
      }
    `,
  ],
})
export class CharacterSceneComponent implements OnDestroy {
  @Input() secondary = false;
  @Output() ready = new EventEmitter<void>();

  @ViewChild('host') host!: ElementRef<HTMLDivElement>;
  failed = signal(false);

  private disposed = false;
  private frame = 0;
  private heroOffset = { x: 0, y: 0 };
  private aboutOffset = { x: 0, y: 0 };
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private observer?: ResizeObserver;
  private draco?: DRACOLoader;
  private mixer?: THREE.AnimationMixer;
  private moveHandler?: (e: PointerEvent) => void;
  private lenis?: Lenis;

  constructor() {
    afterNextRender(() => {
      this.initLenis();
      this.initScene();
    });
  }

  private initLenis() {
    if (this.disposed || typeof window === 'undefined') return;
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    this.lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      this.lenis?.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  private initScene() {
    const container = this.host.nativeElement;
    if (!container) return;

    try {
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      this.failed.set(true);
      this.ready.emit();
      return;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(14.5, 1, 0.1, 1000);
    camera.position.set(0.5, 18.5, 24.05);
    camera.lookAt(0, 13.0, 0);

    const camState = {
      x: 0.5,
      y: 18.5,
      z: 24.05,
      lookX: 0,
      lookY: 13.0,
      lookZ: 0,
      zoom: window.innerWidth < 1200 ? 0.75 : 0.9,
      fov: 14.5,
      progress: 0,
      offsetX: 0,
      offsetY: 0,
      scaleX: 1.0,
      scaleY: 1.0,
    };
    camera.zoom = camState.zoom;
    camera.updateProjectionMatrix();

    const light = new THREE.DirectionalLight(0x5eead4, 1.4);
    light.position.set(-0.42, -0.32, -1);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const point = new THREE.PointLight(0x22d3ee, 10, 100, 3);
    point.position.set(3, 12, 4);
    this.scene.add(point);

    let model: THREE.Group | undefined;
    let head: THREE.Object3D | undefined;
    let intro: THREE.AnimationAction | undefined,
      blink: THREE.AnimationAction | undefined,
      brows: THREE.AnimationAction | undefined;
    let hovered = false,
      blinking = false,
      started = false,
      elapsed = 0,
      scrollProgress = 0;

    const mouse = { x: 0, y: 0 },
      follow = { x: 0, y: 0 };

    const updateViewOffset = (width: number, height: number) => {
      if (typeof document === 'undefined') return;

      const heroWrapper = document.getElementById('hero-character-target');
      const homeSection = document.getElementById('home');
      if (heroWrapper && homeSection) {
        const hRect = heroWrapper.getBoundingClientRect();
        const sRect = homeSection.getBoundingClientRect();
        const centerX = hRect.left + hRect.width / 2;
        const centerY = hRect.top - sRect.top + hRect.height / 2;
        this.heroOffset = { x: width / 2 - centerX, y: height / 2 - centerY };
      }

      const aboutWrapper = document.getElementById('about-character-target');
      const aboutSection = document.getElementById('about');
      if (aboutWrapper && aboutSection) {
        const aRect = aboutWrapper.getBoundingClientRect();
        const sRect = aboutSection.getBoundingClientRect();
        const isLg = window.innerWidth >= 1024;
        const canvasHeight = isLg ? 700 : 600;
        const canvasTop = isLg ? -180 : -100;

        const centerX = aRect.left + aRect.width / 2;
        const centerY = aRect.top - sRect.top + canvasTop + canvasHeight / 2;
        this.aboutOffset = { x: width / 2 - centerX, y: height / 2 - centerY };
      }

      camState.offsetX = gsap.utils.interpolate(
        this.heroOffset.x,
        this.aboutOffset.x,
        scrollProgress,
      );
      camState.offsetY = gsap.utils.interpolate(
        this.heroOffset.y,
        this.aboutOffset.y,
        scrollProgress,
      );
    };

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height || !this.renderer) return;
      this.renderer.setSize(width, height);
      camera.aspect = width / height;

      // Calculate original canvas heights to scale the global camera correctly
      const isLg = window.innerWidth >= 1024;
      const heroCanvasHeight = isLg ? 720 : 550;
      const aboutCanvasHeight = isLg ? 600 : 600;

      const baseZoomHero = width < 1200 ? 0.75 : 0.9;
      const baseZoomAbout = width < 1200 ? 0.75 : 0.85;

      const heroZoom = baseZoomHero * (heroCanvasHeight / height);
      const aboutZoom = baseZoomAbout * (aboutCanvasHeight / height);

      camState.zoom = gsap.utils.interpolate(heroZoom, aboutZoom, scrollProgress);
      camera.zoom = camState.zoom;
      camera.updateProjectionMatrix();
    };

    resize();
    this.observer = new ResizeObserver(resize);
    this.observer.observe(container);

    this.draco = new DRACOLoader();
    this.draco.setDecoderPath('/draco/');
    this.draco.setWorkerLimit(2);
    this.draco.preload();

    const loader = new GLTFLoader();
    loader.setDRACOLoader(this.draco);

    new RGBELoader().load('/environment.hdr', (texture) => {
      if (this.disposed) {
        texture.dispose();
        return;
      }
      texture.mapping = THREE.EquirectangularReflectionMapping;
      if (this.scene) {
        this.scene.environment = texture;
        this.scene.environmentIntensity = 0.64;
        this.scene.environmentRotation.set(5.76, 85.85, 1);
      }
    });

    loader.load(
      '/character.glb',
      (gltf) => {
        if (this.disposed) return;
        model = gltf.scene;

        model.children.forEach((object) => {
          if (
            object.name === 'Plane004' ||
            object.name === 'screenlight' ||
            object.name === 'Keyboard' ||
            object.name.startsWith('KEYS') ||
            object.name.startsWith('Plane') ||
            object.name === 'Cube.002'
          ) {
            object.visible = true;
          }
        });

        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
              if (material instanceof THREE.MeshStandardMaterial) {
                if (object.name === 'Pant') material.color.set(0x000000);

                if (
                  object.name === 'Plane004' ||
                  object.name === 'screenlight' ||
                  object.name === 'Keyboard' ||
                  object.name.startsWith('KEYS') ||
                  object.name.startsWith('Plane') ||
                  object.name === 'Cube.002'
                ) {
                  material.transparent = true;
                  material.opacity = 0;
                }
              }
            });
          }
        });
        this.scene!.add(model);
        this.mixer = new THREE.AnimationMixer(model);

        const entrance = gltf.animations.find((a) => a.name === 'introAnimation');
        if (entrance) {
          intro = this.mixer.clipAction(entrance);
          intro.setLoop(THREE.LoopOnce, 1);
          intro.clampWhenFinished = true;
          intro.play();
          this.mixer.update(entrance.duration);
          started = true;
        }

        const typing = gltf.animations.find((a) => a.name === 'typing');
        if (typing) {
          this.mixer.clipAction(typingClip(typing)).setEffectiveTimeScale(1.2).play();
        }

        for (const name of ['key1', 'key2', 'key5', 'key6']) {
          const clip = gltf.animations.find((a) => a.name === name);
          if (clip) this.mixer!.clipAction(clip).setEffectiveTimeScale(1.2).play();
        }

        const blinkClip = gltf.animations.find((a) => a.name === 'Blink');
        if (blinkClip) blink = this.mixer!.clipAction(blinkClip);

        const browClip = gltf.animations.find((a) => a.name === 'browup');
        if (browClip) {
          brows = this.mixer!.clipAction(eyebrowClip(browClip));
          brows.setLoop(THREE.LoopOnce, 1);
          brows.clampWhenFinished = true;
        }

        head = model.getObjectByName('spine006') ?? model.getObjectByName('spine.006');
        this.mixer.update(0);

        setTimeout(
          () =>
            this.setupScrollAnimation(model!, camera, camState, () => {
              scrollProgress = camState.progress;
            }),
          100,
        );

        this.ready.emit();
      },
      undefined,
      (error) => {
        console.error('Failed to load character model:', error);
        this.failed.set(true);
        this.ready.emit();
      },
    );

    const expression = (value: boolean) => {
      if (hovered === value || !brows || reduced || !started) return;
      hovered = value;
      if (value) brows.reset().setEffectiveWeight(4).fadeIn(0.5).play();
      else brows.fadeOut(0.6);
    };

    this.moveHandler = (event: PointerEvent) => {
      Object.assign(
        mouse,
        pointerTarget(event.clientX, event.clientY, window.innerWidth, window.innerHeight),
      );
      const bounds = container.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width,
        y = (event.clientY - bounds.top) / bounds.height;
      expression(
        x > 0.3 &&
          x < 0.7 &&
          y > 0.18 &&
          y < 0.6 &&
          bounds.top < window.innerHeight &&
          bounds.bottom > 0,
      );
    };
    window.addEventListener('pointermove', this.moveHandler);

    const clock = new THREE.Clock();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = () => {
      if (this.disposed) return;
      this.frame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);

      if (started && !reduced) {
        elapsed += delta;
        this.mixer?.update(delta);

        if (elapsed > 2.5 && !blinking) {
          blink?.reset().fadeIn(0.5).play();
          blinking = true;
        }

        if (head && elapsed > 2.5) {
          const idleX = (mouse.x * Math.PI) / 6;
          const idleY = THREE.MathUtils.clamp(mouse.y, -0.4, 0.3) - Math.PI / 12;

          follow.x = damp(follow.x, gsap.utils.interpolate(idleX, -0.3, scrollProgress), delta);
          follow.y = damp(follow.y, gsap.utils.interpolate(idleY, -0.4, scrollProgress), delta);

          head.rotation.y = follow.x;
          head.rotation.x = follow.y;
        }
        point.intensity = 10 + 2 * Math.sin(elapsed * 5) + Math.sin(elapsed * 11);
      } else if (reduced) {
        this.mixer?.update(delta);
      }

      if (this.scene && this.renderer) {
        camera.position.set(camState.x, camState.y, camState.z);
        camera.lookAt(camState.lookX, camState.lookY, camState.lookZ);
        camera.fov = camState.fov;
        camera.zoom = camState.zoom;

        if (model) {
          model.scale.set(camState.scaleX, camState.scaleY, 1);
        }

        if (typeof window !== 'undefined') {
          camera.setViewOffset(
            window.innerWidth,
            window.innerHeight,
            camState.offsetX,
            camState.offsetY,
            window.innerWidth,
            window.innerHeight,
          );
        }
        camera.updateProjectionMatrix();

        this.renderer.render(this.scene, camera);
      }
    };
    animate();
  }

  private setupScrollAnimation(
    model: THREE.Group,
    camera: THREE.PerspectiveCamera,
    camState: any,
    onUpdate: () => void,
  ) {
    if (this.disposed) return;
    if (typeof window === 'undefined') return;

    camState.progress = 0;

    // We pin the canvas to the screen during the transition
    // and then it unpins and scrolls away naturally
    const isLg = window.innerWidth >= 1024;
    const aboutCanvasHeight = isLg ? 650 : 500;
    
    ScrollTrigger.create({
      trigger: '#home',
      start: 'top top',
      endTrigger: '#about',
      end: 'top top',
      pin: this.host.nativeElement.parentElement,
      pinSpacing: false,
      scrub: true,
      onRefresh: () => {
        const heroWrapper = document.getElementById('hero-character-target');
        const homeSection = document.getElementById('home');
        if (heroWrapper && homeSection) {
          const hRect = heroWrapper.getBoundingClientRect();
          const homeRect = homeSection.getBoundingClientRect();
          const heroScreenX = hRect.left + hRect.width / 2;
          const heroScreenY = hRect.top - homeRect.top + hRect.height / 2;
          this.heroOffset = { x: window.innerWidth / 2 - heroScreenX, y: window.innerHeight / 2 - heroScreenY };
        }

        const aboutWrapper = document.getElementById('about-character-target');
        const aboutSection = document.getElementById('about');
        
        if (aboutWrapper && aboutSection) {
          const aRect = aboutWrapper.getBoundingClientRect();
          const aboutRect = aboutSection.getBoundingClientRect();
          const visualRightShift = isLg ? 80 : 0; 
          const aboutScreenX = aRect.left + aRect.width / 2 + visualRightShift;
          const aboutScreenY = aRect.top - aboutRect.top + aRect.height / 2;
          this.aboutOffset = { x: window.innerWidth / 2 - aboutScreenX, y: window.innerHeight / 2 - aboutScreenY };
        }
      },
      onUpdate: (self) => {
        const p = self.progress;
        camState.progress = p;
        onUpdate();

        // Original Hero State (from original file)
        // camera.position.set(0.5, 18.5, 24.05);
        // camera.lookAt(0, 13.0, 0);
        // FOV: 14.5

        // Original About State (from original file)
        // camera.position.set(20, 18, 32);
        // camera.lookAt(0, 7.0, 0);
        // FOV: 25

        camState.x = gsap.utils.interpolate(0.5, 20, p);
        camState.y = gsap.utils.interpolate(18.5, 18, p);
        camState.z = gsap.utils.interpolate(24.05, 32, p);

        camState.lookX = 0;
        camState.lookY = gsap.utils.interpolate(13.0, 7.0, p);
        camState.lookZ = 0;

        camState.fov = gsap.utils.interpolate(14.5, 25, p);

        // Caching the offsets to prevent layout thrashing on every scroll frame!
        camState.offsetX = gsap.utils.interpolate(this.heroOffset.x, this.aboutOffset.x, p);
        camState.offsetY = gsap.utils.interpolate(this.heroOffset.y, this.aboutOffset.y, p);

        const heroCanvasHeight = isLg ? 720 : 550;

        const baseZoomHero = window.innerWidth < 1200 ? 0.75 : 0.9;
        const baseZoomAbout = window.innerWidth < 1200 ? 0.75 : 0.85;

        const heroZoom = baseZoomHero * (heroCanvasHeight / window.innerHeight);
        const aboutZoom = baseZoomAbout * (aboutCanvasHeight / window.innerHeight);

        camState.zoom = gsap.utils.interpolate(heroZoom, aboutZoom, p);

        camState.scaleX = gsap.utils.interpolate(1.0, 1.0, p);
        camState.scaleY = gsap.utils.interpolate(1.0, 1.0, p);

        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
              if (
                object.name === 'Plane004' ||
                object.name === 'screenlight' ||
                object.name === 'Keyboard' ||
                object.name.startsWith('KEYS') ||
                object.name.startsWith('Plane') ||
                object.name === 'Cube.002'
              ) {
                if (material instanceof THREE.MeshStandardMaterial) {
                  material.opacity = p;
                }
              }
            });
          }
        });
      },
    });

    // Force a recalculation of the cached coordinates after the 1.2s Hero entrance animations finish
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 1500);
  }

  ngOnDestroy() {
    this.disposed = true;
    if (this.lenis) {
      this.lenis.destroy();
      gsap.ticker.remove(this.lenis.raf);
    }
    ScrollTrigger.getAll().forEach((t) => t.kill());
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.frame);
    }
    if (this.observer) this.observer.disconnect();
    if (this.moveHandler && typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this.moveHandler);
    }
    if (this.draco) this.draco.dispose();
    if (this.mixer) this.mixer.stopAllAction();
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((m) => m.dispose());
        }
      });
      this.scene.environment?.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }
}

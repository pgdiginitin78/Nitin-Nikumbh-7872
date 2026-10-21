import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { typingClip, eyebrowClip, damp, pointerTarget } from '../lib/character-animation.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function CharacterScene({ onReady }) {
  const hostRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    let disposed = false;
    let frame = 0;
    let heroOffset = { x: 0, y: 0 };
    let aboutOffset = { x: 0, y: 0 };
    let renderer;
    let scene;
    let observer;
    let draco;
    let mixer;
    let moveHandler;
    let characterScrollTrigger;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setFailed(true);
      onReady?.();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(14.5, 1, 0.1, 1000);
    camera.position.set(0.5, 18.5, 24.05);
    camera.lookAt(0, 13.0, 0);

    const camState = {
      x: 0.5,
      y: 17.5,
      z: 24.05,
      lookX: 0,
      lookY: 12.0,
      lookZ: 0,
      zoom: window.innerWidth < 1200 ? 0.75 : 0.9,
      fov: 14.5,
      progress: 0,
      offsetX: 0,
      offsetY: 0,
      scaleX: 1.0,
      scaleY: 1.0,
    };
    camera.position.set(0.5, 17.5, 24.05);
    camera.lookAt(0, 12.0, 0);
    camera.zoom = camState.zoom;
    camera.updateProjectionMatrix();

    const light = new THREE.DirectionalLight(0x5eead4, 1.4);
    light.position.set(-0.42, -0.32, -1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const point = new THREE.PointLight(0x22d3ee, 10, 100, 3);
    point.position.set(3, 12, 4);
    scene.add(point);

    let model;
    let head;
    let intro, blink, brows;
    let hovered = false,
      blinking = false,
      started = false,
      elapsed = 0,
      scrollProgress = 0;

    const mouse = { x: 0, y: 0 };
    const follow = { x: 0, y: 0 };

    const updateHeroOffset = () => {
      const isLg = window.innerWidth >= 1024;
      const heroWrapper = document.getElementById('hero-character-target');
      const homeSection = document.getElementById('home');
      if (heroWrapper && homeSection) {
        const hRect = heroWrapper.getBoundingClientRect();
        const homeRect = homeSection.getBoundingClientRect();
        const heroScreenX = hRect.left + hRect.width / 2;
        const heroScreenY = hRect.top - homeRect.top + hRect.height / 2;
        heroOffset = {
          x: window.innerWidth / 2 - heroScreenX,
          y: window.innerHeight / 2 - heroScreenY,
        };
      }

      const aboutWrapper = document.getElementById('about-character-target');
      const aboutSection = document.getElementById('about');
      if (aboutWrapper && aboutSection) {
        const aRect = aboutWrapper.getBoundingClientRect();
        const aboutRect = aboutSection.getBoundingClientRect();
        const targetCenterX = aRect.left + aRect.width / 2;
        const targetCenterY = aRect.top - aboutRect.top + aRect.height / 2;
        const visualRightShift = window.innerWidth >= 1440 ? 30 : window.innerWidth >= 1200 ? 15 : 0;
        const rawYOffset = window.innerHeight / 2 - targetCenterY;

        aboutOffset = {
          x: window.innerWidth / 2 - (targetCenterX + visualRightShift),
          y: Math.max(-100, Math.min(25, rawYOffset)),
        };
      }

      if (scrollProgress === 0) {
        camState.offsetX = heroOffset.x;
        camState.offsetY = heroOffset.y;
      }
    };

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height || !renderer) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;

      const isLg = window.innerWidth >= 1024;
      const heightFactor = Math.min(1, Math.max(0.65, height / 850));

      const baseZoomHero = width < 768 ? 0.62 : width < 1024 ? 0.78 : width < 1200 ? 0.82 : 0.9;
      const baseZoomAbout = width < 768 ? 0.65 : width < 1024 ? 0.72 : width < 1200 ? 0.76 : 0.82;

      const heroZoom = baseZoomHero * heightFactor;
      const aboutZoom = baseZoomAbout * heightFactor;

      camState.zoom = gsap.utils.interpolate(heroZoom, aboutZoom, scrollProgress);
      camera.zoom = camState.zoom;
      camera.updateProjectionMatrix();

      updateHeroOffset();
    };

    resize();
    observer = new ResizeObserver(resize);
    observer.observe(container);

    draco = new DRACOLoader();
    draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    draco.setWorkerLimit(2);
    draco.preload();

    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    new RGBELoader().load(`${import.meta.env.BASE_URL}environment.hdr`, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.mapping = THREE.EquirectangularReflectionMapping;
      if (scene) {
        scene.environment = texture;
        scene.environmentIntensity = 0.64;
        scene.environmentRotation.set(5.76, 85.85, 1);
      }
    });

    const setupScrollAnimation = (characterModel) => {
      if (disposed) return;
      camState.progress = 0;
      const isLg = window.innerWidth >= 1024;
      const aboutCanvasHeight = isLg ? 650 : 500;

      const opacityMaterials = [];
      characterModel.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (
            object.name === 'Plane004' ||
            object.name === 'screenlight' ||
            object.name === 'Keyboard' ||
            object.name.startsWith('KEYS') ||
            object.name.startsWith('Plane') ||
            object.name === 'Cube.002'
          ) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
              if (material instanceof THREE.MeshStandardMaterial) {
                opacityMaterials.push(material);
              }
            });
          }
        }
      });

      characterScrollTrigger = ScrollTrigger.create({
        trigger: '#home',
        start: 'top top',
        endTrigger: '#about',
        end: 'top top',
        pin: container.parentElement,
        pinSpacing: false,
        scrub: true,
        onRefresh: () => {
          updateHeroOffset();
        },
        onUpdate: (self) => {
          const p = self.progress;
          camState.progress = p;
          scrollProgress = p;

          camState.x = gsap.utils.interpolate(0.5, 20, p);
          camState.y = gsap.utils.interpolate(17.5, 18, p);
          camState.z = gsap.utils.interpolate(24.05, 32, p);

          camState.lookX = 0;
          camState.lookY = gsap.utils.interpolate(12.0, isLg ? 7.0 : 9.5, p);
          camState.lookZ = 0;

          camState.fov = gsap.utils.interpolate(14.5, 25, p);
          camState.offsetX = gsap.utils.interpolate(heroOffset.x, aboutOffset.x, p);
          camState.offsetY = gsap.utils.interpolate(heroOffset.y, aboutOffset.y, p);

          const heightFactor = Math.min(1, Math.max(0.65, window.innerHeight / 850));
          const baseZoomHero =
            window.innerWidth < 1024 ? 0.78 : window.innerWidth < 1200 ? 0.82 : 0.9;
          const baseZoomAbout =
            window.innerWidth < 1024 ? 0.72 : window.innerWidth < 1200 ? 0.76 : 0.82;

          const heroZoom = baseZoomHero * heightFactor;
          const aboutZoom = baseZoomAbout * heightFactor;

          camState.zoom = gsap.utils.interpolate(heroZoom, aboutZoom, p);

          for (let i = 0; i < opacityMaterials.length; i++) {
            opacityMaterials[i].opacity = p;
          }
        },
      });

      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 1500);
    };

    loader.load(
      `${import.meta.env.BASE_URL}character.glb`,
      (gltf) => {
        if (disposed) return;
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

        scene.add(model);
        mixer = new THREE.AnimationMixer(model);

        const entrance = gltf.animations.find((a) => a.name === 'introAnimation');
        if (entrance) {
          intro = mixer.clipAction(entrance);
          intro.setLoop(THREE.LoopOnce, 1);
          intro.clampWhenFinished = true;
          intro.play();
          mixer.update(entrance.duration);
          started = true;
        }

        const typing = gltf.animations.find((a) => a.name === 'typing');
        if (typing) {
          mixer.clipAction(typingClip(typing)).setEffectiveTimeScale(1.2).play();
        }

        for (const name of ['key1', 'key2', 'key5', 'key6']) {
          const clip = gltf.animations.find((a) => a.name === name);
          if (clip) mixer.clipAction(clip).setEffectiveTimeScale(1.2).play();
        }

        const blinkClip = gltf.animations.find((a) => a.name === 'Blink');
        if (blinkClip) blink = mixer.clipAction(blinkClip);

        const browClip = gltf.animations.find((a) => a.name === 'browup');
        if (browClip) {
          brows = mixer.clipAction(eyebrowClip(browClip));
          brows.setLoop(THREE.LoopOnce, 1);
          brows.clampWhenFinished = true;
        }

        head = model.getObjectByName('spine006') ?? model.getObjectByName('spine.006');
        mixer.update(0);

        setTimeout(() => {
          setupScrollAnimation(model);
          updateHeroOffset();
          ScrollTrigger.refresh();
        }, 80);
        onReady?.();
      },
      undefined,
      () => {
        setFailed(true);
        onReady?.();
      },
    );

    const expression = (value) => {
      if (hovered === value || !brows || reduced || !started) return;
      hovered = value;
      if (value) brows.reset().setEffectiveWeight(4).fadeIn(0.5).play();
      else brows.fadeOut(0.6);
    };

    moveHandler = (event) => {
      Object.assign(
        mouse,
        pointerTarget(event.clientX, event.clientY, window.innerWidth, window.innerHeight),
      );
      const bounds = container.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      expression(
        x > 0.3 &&
          x < 0.7 &&
          y > 0.18 &&
          y < 0.6 &&
          bounds.top < window.innerHeight &&
          bounds.bottom > 0,
      );
    };
    window.addEventListener('pointermove', moveHandler);

    const clock = new THREE.Clock();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      if (window.innerWidth < 768) return;
      const delta = Math.min(clock.getDelta(), 0.05);

      if (started && !reduced) {
        elapsed += delta;
        mixer?.update(delta);

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
        mixer?.update(delta);
      }

      if (scene && renderer) {
        camera.position.set(camState.x, camState.y, camState.z);
        camera.lookAt(camState.lookX, camState.lookY, camState.lookZ);
        camera.fov = camState.fov;
        camera.zoom = camState.zoom;

        if (model) {
          model.scale.set(camState.scaleX, camState.scaleY, 1);
        }

        camera.setViewOffset(
          window.innerWidth,
          window.innerHeight,
          camState.offsetX,
          camState.offsetY,
          window.innerWidth,
          window.innerHeight,
        );
        camera.updateProjectionMatrix();

        renderer.render(scene, camera);
      }
    };
    animate();

    return () => {
      disposed = true;
      characterScrollTrigger?.kill();
      cancelAnimationFrame(frame);
      observer?.disconnect();
      if (moveHandler) window.removeEventListener('pointermove', moveHandler);
      draco?.dispose();
      mixer?.stopAllAction();
      if (scene) {
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((m) => m.dispose());
          }
        });
        scene.environment?.dispose();
      }
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [onReady]);

  return (
    <div
      className="hidden md:block absolute top-0 left-0 w-full h-[100dvh] z-20 pointer-events-none"
      data-lenis-prevent="true"
    >
      <div
        ref={hostRef}
        className="absolute inset-0 overflow-hidden"
        aria-label="Animated 3D developer working at a computer"
      >
        {failed && (
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-200">
            Nitin Nikumbh
          </p>
        )}
      </div>
    </div>
  );
}

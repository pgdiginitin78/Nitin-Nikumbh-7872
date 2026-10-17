import React, { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      autoRaf: false,
    });

    const originalOnVirtualScroll = lenis.onVirtualScroll;
    lenis.onVirtualScroll = (data) => {
      const origHas = HTMLElement.prototype.hasAttribute;
      try {
        HTMLElement.prototype.hasAttribute = function (name) {
          if (name === 'data-lenis-prevent') {
            const overflow = window.getComputedStyle(this).overflowY;
            return (overflow === 'auto' || overflow === 'scroll') && this.scrollHeight > this.clientHeight;
          }
          return origHas.call(this, name);
        };
        originalOnVirtualScroll(data);
      } finally {
        HTMLElement.prototype.hasAttribute = origHas;
      }
    };

    window.lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      window.lenis = null;
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050816] text-slate-100 selection:bg-sky-500/30 selection:text-sky-200">
      <Navbar />
      <main data-lenis-prevent="true">
        <Home />
      </main>
    </div>
  );
}

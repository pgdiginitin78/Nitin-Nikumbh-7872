import React, { useState, useEffect, useRef } from 'react';
import { animate, stagger } from 'motion';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navContainerRef = useRef(null);

  useEffect(() => {
    if (!navContainerRef.current) return;

    animate(
      navContainerRef.current,
      { y: [-100, 0], opacity: [0, 1] },
      {
        duration: 1,
        type: 'spring',
        stiffness: 100,
        damping: 14,
        mass: 1,
      }
    );

    animate(
      '.nav-link',
      { y: [-20, 0], opacity: [0, 1] },
      {
        delay: stagger(0.1, { startDelay: 0.3 }),
        duration: 0.8,
        type: 'spring',
        stiffness: 150,
        damping: 12,
      }
    );
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Experience', href: '#experience' },
    { label: 'Projects', href: '#projects' },
    { label: 'Activity', href: '#activity' },
    { label: 'Education', href: '#education' },
  ];

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    setIsMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      if (window.lenis) {
        window.lenis.scrollTo(target, { offset: -60 });
      } else {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav ref={navContainerRef} className="fixed top-0 left-0 right-0 z-50 px-4 pt-3">
      <div className="max-w-7xl w-full mx-auto rounded-2xl bg-white/5 backdrop-blur-xl backdrop-saturate-150 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <div className="flex justify-between h-16 items-center px-5">
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={(e) => handleLinkClick(e, '#home')}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="My Logo" className="h-16 w-auto" />
          </div>
          <div className="hidden md:flex space-x-8">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className="nav-link text-slate-300 hover:text-sky-400 px-3 py-2 rounded-md font-medium transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-300 hover:text-sky-400 focus:outline-none p-2"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden mt-2 max-w-7xl mx-auto rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-lg">
          <div className="px-3 pt-2 pb-3 space-y-1">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className="block text-slate-300 hover:bg-white/5 hover:text-sky-400 px-3 py-2 rounded-md text-base font-medium"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

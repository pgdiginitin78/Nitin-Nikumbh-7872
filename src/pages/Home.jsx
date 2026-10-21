import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { LampContainer } from '@/components/ui/lamp';
import Snowfall from '../components/Snowfall.jsx';
import CharacterScene from '../components/CharacterScene.jsx';
import ContributionSkyline from '../components/ContributionSkyline.jsx';
import SkillChips from '../components/SkillChips.jsx';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  useEffect(() => {
    const scrollTriggerInstance = ScrollTrigger.create({
      trigger: '#experience-container',
      start: 'top center',
      end: 'bottom center',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        const line = document.getElementById('experience-line');
        const dot = document.getElementById('experience-dot');
        if (line && dot) {
          line.style.height = `${p * 100}%`;
          dot.style.top = `${p * 100}%`;
          dot.style.opacity = p > 0 ? '1' : '0';
        }
      },
    });

    const rowTriggers = [];
    const rows = document.querySelectorAll('.experience-row');
    rows.forEach((row) => {
      const tween = gsap.to(row, {
        scrollTrigger: {
          trigger: row,
          start: 'top 80%',
          end: 'top 50%',
          scrub: true,
        },
        opacity: 1,
        y: 0,
        ease: 'power2.out',
      });
      if (tween.scrollTrigger) rowTriggers.push(tween.scrollTrigger);
    });

    return () => {
      scrollTriggerInstance.kill();
      rowTriggers.forEach((t) => t.kill());
    };
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      if (window.lenis) {
        window.lenis.scrollTo(el, { offset: -40 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const projects = [
    {
      title: 'Swagrama',
      description:
        'Digital wellness and community platform combining Ayurveda services, therapy/OPD booking, memberships, community activities and wellness experiences.',
      tags: ['ReactJS', 'Vite', 'MUI', 'GSAP', 'Redux Toolkit', 'React Hook Form', 'Tailwind CSS'],
    },
    {
      title: 'Shika Arts',
      description:
        'Custom React storefront around WooCommerce, product discovery, category hierarchies, cart flows, dynamic pricing and responsive presentation.',
      tags: ['ReactJS', 'WooCommerce', 'REST APIs', 'Redux Toolkit', 'Tailwind CSS'],
    },
    {
      title: 'LucidMind',
      description:
        'AI and business transformation platform focused on leadership, digital transformation and modern business solutions.',
      tags: ['ReactJS', 'Vite', 'Redux Toolkit', 'React Hook Form', 'Tailwind CSS', 'PHP & MySQL'],
    },
    {
      title: 'DocItHealth (HIMS)',
      description:
        'Developed key modules (ICU, OPD, IPD, Pharmacy). Created real-time ICU Monitor Graph with Canvas API and live HL7 data.',
      tags: [
        'ReactJS',
        'Redux Toolkit',
        'React Hook Form',
        'Material UI',
        'Tailwind CSS',
        'Canvas API',
      ],
    },
    {
      title: 'Feedback & Training Modules',
      description:
        'Built role-based feedback dashboards with charts and sequential video-based training modules with assessments using React Hook Form.',
      tags: ['ReactJS', 'Redux Toolkit', 'React Hook Form', 'Material UI', 'Tailwind CSS'],
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#050816] text-slate-200" data-lenis-prevent="true">
      <section
        className="relative min-h-[100dvh] overflow-hidden bg-[radial-gradient(ellipse_at_20%_20%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(ellipse_at_85%_70%,rgba(139,92,246,0.16),transparent_55%),linear-gradient(135deg,#050816_0%,#0b1026_40%,#141238_75%,#1a0f2e_100%)] text-slate-200 flex items-center justify-center"
        id="home"
        data-lenis-prevent="true"
      >
        <div
          className="absolute rounded-full blur-[90px] opacity-45 z-0 animate-[float_12s_ease-in-out_infinite] w-[420px] h-[420px] bg-sky-500 top-[-100px] left-[-100px]"
          aria-hidden="true"
        />
        <div
          className="absolute rounded-full blur-[90px] opacity-45 z-0 animate-[float_12s_ease-in-out_infinite] w-[480px] h-[480px] bg-violet-600 bottom-[-160px] right-[-120px] [animation-delay:-6s]"
          aria-hidden="true"
        />

        <Snowfall />

        <div className="relative z-10 max-w-[1280px] w-full mx-auto px-4 sm:px-6 pt-24 pb-8 md:pt-24 md:pb-8 lg:pt-28 lg:pb-12 min-h-[100dvh] flex flex-col md:grid md:grid-cols-2 items-center justify-center gap-4 lg:gap-12 text-center md:text-left">
          <div className="flex flex-col justify-center animate-[fadeUp_0.9s_ease-out_both] w-full max-w-xl mx-auto md:max-w-none md:pt-4">
            <p className="mt-0 text-[1.1rem] md:text-[1.15rem] text-slate-400 tracking-wider">
              Hi, I'm
            </p>
            <h1 className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-extrabold leading-[1.1] text-slate-50 tracking-tight mt-1">
              Nitin{' '}
              <span className="bg-[linear-gradient(90deg,#38bdf8,#818cf8,#c084fc,#38bdf8)] bg-[length:300%_100%] bg-clip-text text-transparent animate-[shimmer_6s_linear_infinite]">
                Nikumbh
              </span>
            </h1>
            <h2 className="mt-2 md:mt-3 text-[clamp(1.1rem,2vw,1.45rem)] font-semibold text-slate-300 flex flex-wrap items-center justify-center md:justify-start gap-2">
              Frontend Developer
            </h2>

            <p className="mt-3 md:mt-4 max-w-[34rem] mx-auto md:ml-0 md:mr-auto text-[0.92rem] md:text-[0.96rem] lg:text-[1.02rem] leading-relaxed text-slate-400">
              I craft fast, responsive and pixel-perfect web experiences — turning ideas into clean,
              interactive interfaces with modern frameworks, smooth animations and a sharp eye for
              design.
            </p>

            <div className="my-5 md:my-7 flex flex-wrap justify-center md:justify-start items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => scrollTo('activity')}
                className="inline-flex items-center justify-center px-6 sm:px-7 py-3 rounded-full font-semibold text-[0.95rem] transition-all duration-250 ease-in-out cursor-pointer hover:-translate-y-[3px] text-white bg-[linear-gradient(135deg,#0ea5e9,#7c3aed)] shadow-[0_10px_30px_-10px_rgba(124,58,237,0.7)] hover:shadow-[0_16px_40px_-10px_rgba(14,165,233,0.8)]"
              >
                Hire Me
              </button>
              <button
                type="button"
                onClick={() => scrollTo('projects')}
                className="inline-flex items-center justify-center px-6 sm:px-7 py-3 rounded-full font-semibold text-[0.95rem] transition-all duration-250 ease-in-out cursor-pointer hover:-translate-y-[3px] text-slate-200 border border-slate-200/20 bg-white/5 backdrop-blur-md hover:border-sky-400 hover:text-sky-400"
              >
                View My Work
              </button>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/pgdiginitin78?tab=repositories"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center w-[44px] h-[44px] rounded-full text-slate-200 border border-slate-200/20 bg-white/5 backdrop-blur-md transition-all duration-250 ease-in-out cursor-pointer hover:-translate-y-[3px] hover:border-sky-400 hover:text-sky-400"
                  title="GitHub"
                  aria-label="GitHub"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/in/nitin-nikumbh-b84077200/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center w-[44px] h-[44px] rounded-full text-slate-200 border border-slate-200/20 bg-white/5 backdrop-blur-md transition-all duration-250 ease-in-out cursor-pointer hover:-translate-y-[3px] hover:border-sky-400 hover:text-sky-400"
                  title="LinkedIn"
                  aria-label="LinkedIn"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>

            <ul className="grid grid-cols-3 max-w-md mx-auto md:mx-0 lg:max-w-none lg:flex lg:flex-wrap justify-center md:justify-start w-full gap-2 sm:gap-4 md:gap-3 lg:gap-8 pt-2">
              <li className="flex flex-col items-center md:items-start text-center md:text-left">
                <strong className="text-[1.35rem] sm:text-[1.55rem] md:text-[1.55rem] lg:text-[1.75rem] font-extrabold text-slate-50">
                  5+
                </strong>
                <span className="text-[0.7rem] sm:text-[0.75rem] md:text-[0.72rem] lg:text-[0.78rem] text-slate-300 font-medium uppercase tracking-[0.05em] sm:tracking-[0.08em]">
                  Years Experience
                </span>
              </li>
              <li className="flex flex-col items-center md:items-start text-center md:text-left">
                <strong className="text-[1.35rem] sm:text-[1.55rem] md:text-[1.55rem] lg:text-[1.75rem] font-extrabold text-slate-50">
                  12+
                </strong>
                <span className="text-[0.7rem] sm:text-[0.75rem] md:text-[0.72rem] lg:text-[0.78rem] text-slate-300 font-medium uppercase tracking-[0.05em] sm:tracking-[0.08em]">
                  Projects Built
                </span>
              </li>
              <li className="flex flex-col items-center md:items-start text-center md:text-left">
                <strong className="text-[1.35rem] sm:text-[1.55rem] md:text-[1.55rem] lg:text-[1.75rem] font-extrabold text-slate-50">
                  100%
                </strong>
                <span className="text-[0.7rem] sm:text-[0.75rem] md:text-[0.72rem] lg:text-[0.78rem] text-slate-300 font-medium uppercase tracking-[0.05em] sm:tracking-[0.08em]">
                  Responsive
                </span>
              </li>
            </ul>
          </div>

          <div
            id="hero-character-target"
            className="relative w-full h-[320px] sm:h-[400px] md:h-[500px] lg:h-[580px] hidden md:flex items-center justify-center animate-[fadeIn_1.2s_ease-out_0.2s_both] pointer-events-none"
          />
        </div>
      </section>

      <section className="relative z-10 overflow-hidden" id="about" data-lenis-prevent="true">
        <LampContainer className="pb-2 hidden md:block">
          <motion.h2
            initial={{ opacity: 0.5, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.2,
              duration: 0.6,
              ease: 'easeInOut',
            }}
            className="mt-6 bg-gradient-to-br from-slate-200 to-slate-400 py-2 bg-clip-text text-center text-4xl font-bold tracking-tight text-transparent md:text-6xl"
          >
            About Me
          </motion.h2>
          <motion.p
            initial={{ opacity: 0.5, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.6,
              ease: 'easeInOut',
            }}
            className="text-slate-400 text-center text-base md:text-lg max-w-md mx-auto mt-1"
          >
            Building digital products, brands, and experiences
          </motion.p>
        </LampContainer>
        <div className="pb-2 md:hidden">
          <motion.h2
            initial={{ opacity: 0.5, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.2,
              duration: 0.6,
              ease: 'easeInOut',
            }}
            className="mt-6 bg-gradient-to-br from-slate-200 to-slate-400 py-2 bg-clip-text text-center text-4xl font-bold tracking-tight text-transparent md:text-6xl"
          >
            About Me
          </motion.h2>
          <motion.p
            initial={{ opacity: 0.5, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.6,
              ease: 'easeInOut',
            }}
            className="text-slate-400 text-center text-base md:text-lg max-w-md mx-auto mt-1"
          >
            Building digital products, brands, and experiences
          </motion.p>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-4 md:mt-6 lg:mt-8 pb-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-center justify-center">
            <div className="space-y-4 flex flex-col justify-center">
              <div>
                <SkillChips
                  items={[
                    'docker',
                    'php',
                    'react',
                    'git',
                    'redux',
                    'html5',
                    'linux',
                    'typescript',
                    'vite',
                    'gsap',
                    'mysql',
                    'nodejs',
                    'css',
                    'tailwind',
                    'threejs',
                    'javascript',
                    'react',
                    'nextjs',
                    'angular',
                  ]}
                />
              </div>
              <div className="pt-2 md:pt-3">
                <button
                  type="button"
                  onClick={() => scrollTo('projects')}
                  className="inline-flex items-center justify-center px-6 py-2.5 md:px-7 md:py-3 rounded-full bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 hover:border-sky-400/50 transition-all shadow-lg shadow-black/20 cursor-pointer text-sm md:text-base"
                >
                  Check out my projects
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div
              id="about-character-target"
              className="relative md:flex items-center justify-center hidden h-[360px] md:h-[400px] lg:h-[440px] w-full"
            >
              <div className="absolute bottom-0 left-0 right-0 bg-sky-500/20 blur-[100px] rounded-full w-full max-w-sm h-[90%] mx-auto z-0" />
            </div>
          </div>
        </div>
      </section>

      <section
        className="py-14 px-6 max-w-5xl mx-auto relative z-10"
        id="experience"
        data-lenis-prevent="true"
      >
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-200 mb-2 leading-tight">
            My career &amp;
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-purple-500">
              experience
            </span>
          </h2>
        </div>

        <div className="relative w-full" id="experience-container">
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 rounded-full">
            <div
              id="experience-line"
              className="absolute top-0 left-0 w-full h-0 bg-gradient-to-b from-transparent via-sky-400/50 to-sky-400 rounded-full"
            />
          </div>
          <div
            id="experience-dot"
            className="hidden md:block absolute left-1/2 top-0 w-3 h-3 rounded-full bg-sky-300 shadow-[0_0_15px_4px_rgba(56,189,248,0.8)] -translate-x-1/2 -translate-y-1/2 opacity-0"
          />

          <div className="flex flex-col gap-16 md:gap-24 relative">
            <div className="experience-row opacity-0 translate-y-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 items-start w-full relative group">
              <div className="flex flex-col md:flex-row justify-between md:items-start md:pr-16 text-left">
                <div className="flex flex-col md:max-w-[14rem]">
                  <h3 className="text-[1.35rem] font-bold text-slate-100 leading-tight">
                    Website Developer
                  </h3>
                  <p className="text-sky-400 text-[0.95rem] font-medium mt-1">
                    Probus Software Private Limited
                  </p>
                </div>
                <div className="md:text-right mt-2 md:mt-0 md:pl-4">
                  <h2 className="text-4xl md:text-[2.5rem] font-bold text-slate-200 leading-[1.1] whitespace-nowrap">
                    2025–NOW
                  </h2>
                </div>
              </div>
              <div className="md:pl-16 md:-mt-1 text-slate-400 text-[0.95rem] leading-relaxed">
                Working as a Website Developer, focusing on responsive web development using
                React.js and modern web technologies.
                <br />
                <br />
                <span className="text-[0.75rem] font-semibold text-slate-500 uppercase tracking-widest">
                  ReactJS • Vite • Tailwind CSS • GSAP • Node.js
                </span>
              </div>
            </div>

            <div className="experience-row opacity-0 translate-y-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 items-start w-full relative group">
              <div className="flex flex-col md:flex-row justify-between md:items-start md:pr-16 text-left">
                <div className="flex flex-col md:max-w-[14rem]">
                  <h3 className="text-[1.35rem] font-bold text-slate-100 leading-tight">
                    Frontend Developer &amp; Software Engineer
                  </h3>
                  <p className="text-purple-400 text-[0.95rem] font-medium mt-1">
                    Appystack Private Limited
                  </p>
                </div>
                <div className="md:text-right mt-2 md:mt-0 md:pl-4">
                  <h2 className="text-4xl md:text-[2.5rem] font-bold text-slate-200 leading-[1.1] whitespace-nowrap">
                    2021–2025
                  </h2>
                </div>
              </div>
              <div className="md:pl-16 md:-mt-1 text-slate-400 text-[0.95rem] leading-relaxed">
                Worked on multiple healthcare and business applications including DocItHealth
                (HIMS), Appy Porter (Logistics), and Feedback Management Systems.
                <br />
                <br />
                <span className="text-[0.75rem] font-semibold text-slate-500 uppercase tracking-widest">
                  ReactJs • JavaScript • API • SASS
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="py-14 px-6 max-w-7xl mx-auto relative z-10"
        id="projects"
        data-lenis-prevent="true"
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-100 mb-4">Projects</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-sky-400 to-purple-500 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.title}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-sky-400/30 flex flex-col h-full group"
            >
              <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-sky-400 transition-colors">
                {proj.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed flex-grow mb-6">
                {proj.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                {proj.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium bg-white/10 px-2 py-1 rounded-md text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="py-14 px-6 max-w-7xl mx-auto relative z-10"
        id="activity"
        data-lenis-prevent="true"
      >
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-100 mb-4">
            Open Source &amp; Activity
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-sky-400 to-purple-500 mx-auto rounded-full" />
          <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Interactive contribution history morphing between a 2D GitHub heat map and a 3D
            isometric skyline.
          </p>
        </div>
        <ContributionSkyline githubUsername="pgdiginitin78" />
      </section>

      <section
        className="py-14 px-6 max-w-7xl mx-auto relative z-10"
        id="education"
        data-lenis-prevent="true"
      >
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-100 mb-4">Education</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-sky-400 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/30">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-sky-500/30">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="w-6 h-6 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-1">
              Master of Computer Applications - MCA
            </h3>
            <p className="text-sky-400 font-medium mb-4">
              KCES's Institute of Management &amp; Research, Jalgaon
            </p>
            <div className="flex justify-between items-center text-sm text-slate-400">
              <span>2018 – 2021</span>
              <span className="bg-white/10 px-3 py-1 rounded-full text-slate-200">Grade: A</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/30">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="w-6 h-6 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-1">BSc Computer Science</h3>
            <p className="text-purple-400 font-medium mb-4">
              Kavayitri Bahinabai Chaudhari North Maharashtra University
            </p>
            <div className="flex justify-between items-center text-sm text-slate-400">
              <span>2015 – 2018</span>
              <span className="bg-white/10 px-3 py-1 rounded-full text-slate-200">Grade: B</span>
            </div>
          </div>
        </div>
      </section>

      <CharacterScene />

      <div className="hidden lg:block absolute top-0 left-0 w-full h-[100dvh] pointer-events-none z-[30] overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-[15vh] bg-gradient-to-t from-[#1a0f2e] to-transparent" />
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SVG_ICONS } from '../lib/svg-bundle.js';

const EXTRA_ICONS = {
  docker: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-sky-400">
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186m5.893 2.715h2.12a.186.186 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.929 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H8.1a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185m-2.928 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H2.208a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185M23.77 9.89c-.382-.4-.863-.615-1.425-.637-.215-.008-.433.023-.647.093a4.07 4.07 0 00-1.89-2.316c-.07-.042-.14-.083-.213-.122a.208.208 0 00-.236.035c-.417.388-.69 1.002-.82 1.63a7.48 7.48 0 00-1.493-.153H1.472a.735.735 0 00-.736.735v2.85c0 3.332 1.666 5.623 4.39 6.772 2.37.999 5.378 1.157 8.52.45a12.87 12.87 0 006.188-3.414c2.093-2.222 3.88-3.084 3.935-5.922z" />
    </svg>
  ),
  git: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-orange-400">
      <path d="M23.546 10.93L13.067.452a1.5 1.5 0 00-2.124 0L8.83 2.564l3.037 3.037a1.782 1.782 0 011.663.456 1.783 1.783 0 01.464 1.68l2.92 2.92a1.783 1.783 0 011.68.465 1.786 1.786 0 01-1.263 3.05 1.785 1.785 0 01-1.263-.523l-2.73-2.731v4.872a1.786 1.786 0 11-1.571 0V9.458a1.783 1.783 0 01-.983-.717L7.818 5.712.454 13.076a1.5 1.5 0 000 2.124l10.479 10.48a1.5 1.5 0 002.124 0l10.489-10.49a1.5 1.5 0 000-2.26z" />
    </svg>
  ),
  html5: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-orange-500">
      <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.234-2.625h11.203l.235-2.625H5.859l.704 7.875h8.906l-.328 3.563-3.164.843-3.164-.843-.211-2.344H6.07l.399 4.5 5.508 1.5 5.507-1.5.75-8.344H8.531z" />
    </svg>
  ),
  css: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-sky-400">
      <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm15.422 6.75H7.078l.234 2.625h9.375l-.703 7.875-3.984 1.125-3.984-1.125-.281-3.188H5.109l.469 5.25 6.422 1.781 6.422-1.781 1.031-11.563-.531-1.063z" />
    </svg>
  ),
  linux: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-amber-400">
      <path d="M12.016 0C8.58 0 7.7 3.324 7.7 5.766c0 1.258.17 2.627.514 3.791C6.91 10.154 5.5 11.758 5.5 13.922c0 2.373 1.635 3.996 3.652 4.293-.133.564-.207 1.154-.207 1.777 0 2.227 1.45 4.008 3.071 4.008 1.62 0 3.07-1.781 3.07-4.008 0-.623-.074-1.213-.207-1.777 2.017-.297 3.652-1.92 3.652-4.293 0-2.164-1.41-3.768-2.714-4.365.344-1.164.514-2.533.514-3.791C16.332 3.324 15.452 0 12.016 0zm-1.84 4.54a.89.89 0 01.89.89.89.89 0 01-.89.89.89.89 0 01-.89-.89c0-.492.398-.89.89-.89zm3.68 0c.492 0 .89.398.89.89a.89.89 0 01-.89.89.89.89 0 01-.89-.89c0-.492.398-.89.89-.89zM12 7.031c1.172 0 2.039.524 2.117 1.453H9.883c.078-.93.945-1.453 2.117-1.453z" />
    </svg>
  ),
  nextjs: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-100">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.836 17.514l-5.69-7.39v7.39h-1.89V6.486h1.89l5.69 7.39v-7.39h1.89v11.028h-1.89z" />
    </svg>
  ),
};

const SKILLS_CONFIG = [
  {
    id: 'docker',
    label: 'Docker',
    border: 'border-sky-500/30 hover:border-sky-400',
    bg: 'bg-sky-500/10 hover:bg-sky-500/20',
    text: 'text-sky-300',
    glow: 'hover:shadow-[0_0_20px_rgba(56,189,248,0.3)]',
    dot: 'bg-sky-400',
  },
  {
    id: 'php',
    label: 'PHP',
    border: 'border-indigo-500/30 hover:border-indigo-400',
    bg: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    text: 'text-indigo-300',
    glow: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]',
    dot: 'bg-indigo-400',
  },
  {
    id: 'react',
    label: 'React',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
    text: 'text-cyan-300',
    glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]',
    dot: 'bg-cyan-400',
  },
  {
    id: 'git',
    label: 'Git',
    border: 'border-orange-500/30 hover:border-orange-400',
    bg: 'bg-orange-500/10 hover:bg-orange-500/20',
    text: 'text-orange-300',
    glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
    dot: 'bg-orange-400',
  },
  {
    id: 'redux',
    label: 'Redux',
    border: 'border-purple-500/30 hover:border-purple-400',
    bg: 'bg-purple-500/10 hover:bg-purple-500/20',
    text: 'text-purple-300',
    glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    dot: 'bg-purple-400',
  },
  {
    id: 'html5',
    label: 'HTML5',
    border: 'border-orange-500/30 hover:border-orange-400',
    bg: 'bg-orange-500/10 hover:bg-orange-500/20',
    text: 'text-orange-300',
    glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
    dot: 'bg-orange-400',
  },
  {
    id: 'linux',
    label: 'Linux',
    border: 'border-amber-500/30 hover:border-amber-400',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    text: 'text-amber-300',
    glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    dot: 'bg-amber-400',
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    border: 'border-blue-500/30 hover:border-blue-400',
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    text: 'text-blue-300',
    glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    dot: 'bg-blue-400',
  },
  {
    id: 'vite',
    label: 'Vite',
    border: 'border-violet-500/30 hover:border-violet-400',
    bg: 'bg-violet-500/10 hover:bg-violet-500/20',
    text: 'text-violet-300',
    glow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]',
    dot: 'bg-violet-400',
  },
  {
    id: 'gsap',
    label: 'GSAP',
    border: 'border-green-500/30 hover:border-green-400',
    bg: 'bg-green-500/10 hover:bg-green-500/20',
    text: 'text-green-300',
    glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    dot: 'bg-green-400',
  },
  {
    id: 'mysql',
    label: 'MySQL',
    border: 'border-teal-500/30 hover:border-teal-400',
    bg: 'bg-teal-500/10 hover:bg-teal-500/20',
    text: 'text-teal-300',
    glow: 'hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]',
    dot: 'bg-teal-400',
  },
  {
    id: 'nodejs',
    label: 'Node.js',
    border: 'border-emerald-500/30 hover:border-emerald-400',
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    text: 'text-emerald-300',
    glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    dot: 'bg-emerald-400',
  },
  {
    id: 'css',
    label: 'CSS3',
    border: 'border-sky-500/30 hover:border-sky-400',
    bg: 'bg-sky-500/10 hover:bg-sky-500/20',
    text: 'text-sky-300',
    glow: 'hover:shadow-[0_0_20px_rgba(56,189,248,0.3)]',
    dot: 'bg-sky-400',
  },
  {
    id: 'tailwind',
    label: 'Tailwind CSS',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
    text: 'text-cyan-300',
    glow: 'hover:shadow-[0_0_20px_rgba(56,189,248,0.35)]',
    dot: 'bg-cyan-400',
  },
  {
    id: 'threejs',
    label: 'Three.js',
    border: 'border-slate-500/30 hover:border-slate-300',
    bg: 'bg-slate-500/10 hover:bg-slate-500/20',
    text: 'text-slate-200',
    glow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]',
    dot: 'bg-slate-300',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    border: 'border-yellow-500/30 hover:border-yellow-400',
    bg: 'bg-yellow-500/10 hover:bg-yellow-500/20',
    text: 'text-yellow-300',
    glow: 'hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]',
    dot: 'bg-yellow-400',
  },
  {
    id: 'nextjs',
    label: 'Next.js',
    border: 'border-zinc-500/30 hover:border-zinc-300',
    bg: 'bg-zinc-500/10 hover:bg-zinc-500/20',
    text: 'text-zinc-200',
    glow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]',
    dot: 'bg-zinc-300',
  },
  {
    id: 'angular',
    label: 'Angular',
    border: 'border-rose-500/30 hover:border-rose-400',
    bg: 'bg-rose-500/10 hover:bg-rose-500/20',
    text: 'text-rose-300',
    glow: 'hover:shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    dot: 'bg-rose-400',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
};

export default function SkillChips({ items }) {
  const [activeChip, setActiveChip] = useState(null);

  const rawList = items || [
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
    'nextjs',
    'angular',
  ];

  const uniqueKeys = Array.from(new Set(rawList.map((k) => k.toLowerCase())));

  const chips = uniqueKeys.map((key) => {
    const config = SKILLS_CONFIG.find((c) => c.id === key);
    if (config) return config;
    return {
      id: key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      border: 'border-sky-500/30 hover:border-sky-400',
      bg: 'bg-sky-500/10 hover:bg-sky-500/20',
      text: 'text-sky-300',
      glow: 'hover:shadow-[0_0_20px_rgba(56,189,248,0.25)]',
      dot: 'bg-sky-400',
    };
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Skills &amp; Technologies
          </h4>
        </div>
 
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="flex flex-wrap gap-2.5 sm:gap-3"
      >
        {chips.map((chip) => {
          const isSvgBundle = SVG_ICONS && SVG_ICONS[chip.id];
          const isExtra = EXTRA_ICONS[chip.id];
          const isActive = activeChip === chip.id;

          return (
            <motion.div
              key={chip.id}
              variants={itemVariants}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onHoverStart={() => setActiveChip(chip.id)}
              onHoverEnd={() => setActiveChip(null)}
              className={`group relative inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full border backdrop-blur-md cursor-pointer transition-all duration-300 select-none shadow-sm ${chip.bg} ${chip.border} ${chip.glow} ${
                isActive ? 'ring-1 ring-sky-400/50 shadow-lg' : ''
              }`}
            >
              <span className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
                {isSvgBundle ? (
                  <img
                    src={SVG_ICONS[chip.id]}
                    alt={chip.label}
                    className="w-4 h-4 object-contain filter group-hover:brightness-125 transition-all duration-300"
                  />
                ) : isExtra ? (
                  isExtra
                ) : (
                  <span className={`w-2 h-2 rounded-full ${chip.dot}`} />
                )}
              </span>

              <span className={`text-xs sm:text-sm font-medium tracking-wide ${chip.text}`}>
                {chip.label}
              </span>

              <span
                className={`w-1.5 h-1.5 rounded-full ${chip.dot} opacity-60 group-hover:opacity-100 transition-opacity`}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

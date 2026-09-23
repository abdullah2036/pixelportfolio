/**
 * ─────────────────────────────────────────────────────────────
 *  PORTFOLIO CONTENT
 *  Everything a visitor reads lives in this file. Edit freely —
 *  no game logic depends on the wording, only on the ids.
 * ─────────────────────────────────────────────────────────────
 *
 *  Images: paths are relative to /public. Leave `image` empty and the
 *  board draws a pixel-art illustration from `art` instead.
 */

export type ProjectCategory = 'worlds' | 'tools' | 'lab'

/** Built-in pixel illustrations used when a project has no screenshot. */
export type ProjectArt = 'os' | 'room' | 'city' | 'terminal' | 'chess' | 'book' | 'map' | 'shield' | 'eye' | 'chart'

export interface Project {
  id: string
  title: string
  tagline: string
  category: ProjectCategory
  description: string
  highlights: string[]
  tech: string[]
  image?: string
  art: ProjectArt
  github?: string
  demo?: string
  year?: string
}

export interface SkillItem {
  name: string
  /** 1–3 letters painted on the item icon */
  glyph: string
  /** project ids this skill was used in (shown as "found in") */
  usedIn?: string[]
  note?: string
}

export interface SkillBag {
  id: string
  name: string
  icon: 'tome' | 'potion' | 'hammer' | 'crate' | 'shield' | 'gem'
  color: string
  items: SkillItem[]
}

export const profile = {
  name: 'Abdullah Bokhary',
  role: 'Software Developer',
  focus: 'AI / Machine Learning · Software Engineering',
  tagline: 'Building ideas into interactive experiences.',
  location: 'Al Khobar, Saudi Arabia',
  lookingFor: 'AI/ML or software engineering roles and internships.',
  summary: [
    'Final-year Data Science student specialising in AI/ML who works end to end.',
    'I take an unfamiliar problem — a backend, an API, something awkward from real life — and turn it into software that runs and gets used.',
    'IBM Full Stack Software Developer and eCPPT certified, with deployed web applications and offline security tooling behind both.',
  ],
  education: {
    school: 'Saudi Electronic University',
    degree: 'B.Sc. Data Science — elective track in Artificial Intelligence',
    when: 'Expected 2027',
    coursework: [
      'Machine Learning',
      'Natural Language Processing',
      'Computer Vision',
      'Data Structures & Algorithms',
      'Database Systems',
      'Operating Systems',
      'Statistics',
      'Linear Algebra',
    ],
  },
  languages: [
    { name: 'Arabic', level: 'Native' },
    { name: 'English', level: 'Full professional' },
  ],
  achievements: [
    { title: 'Black Hat MEA CTF Finals', detail: 'Qualified — Riyadh, December 2026. Team tooling & first-pass triage lead.' },
    { title: 'Miyahthon Hackathon', detail: 'Cleared the online bootcamp stage with my team; finalist selection pending.' },
    { title: 'SEU Cybersecurity Club', detail: 'Member since 2025 — CTF competitions and a mobile app pentesting workshop.' },
    { title: 'Competitive chess', detail: 'Gambit and SEU chess clubs; FIDE-rated and Saudi Chess Federation events, including Ithra 2026.' },
    { title: 'Industry events', detail: 'Black Hat MEA 2025 · LEAP 2026 · SDAIA workshop · ICAN AI Conference (KSU) · MECC 2025 bootcamp.' },
  ],
}

export const links = {
  email: 'bukhariabdulla77@gmail.com',
  github: 'https://github.com/abdullah2036',
  linkedin: 'https://www.linkedin.com/in/abdullah-bokhary-840315326/',
  portfolio: 'https://abdullah.pageui.workers.dev/',
  /** Left empty on purpose — a public page is a poor place for a phone number. */
  phone: '',
  /** Relative to /public. Swap the file to update the resume everywhere. */
  resume: 'assets/resume/Abdullah_Bokhary_Resume.pdf',
  resumeFileName: 'Abdullah_Bokhary_Resume.pdf',
  social: [] as { label: string; url: string }[],
}

export const certifications = [
  {
    name: 'IBM Full Stack Software Developer',
    issuer: 'IBM · Coursera',
    when: 'Sep 2026',
    detail: '15 courses: React, Node.js/Express, Django + SQL, Flask, Docker, Kubernetes, OpenShift, microservices & serverless.',
    url: 'https://coursera.org/verify/professional-cert/ZYDXA0Y9YY1V',
  },
  {
    name: 'eCPPT — Certified Professional Penetration Tester',
    issuer: 'INE Security',
    when: 'Sep 2026',
    detail: 'Hands-on practical exam · ID 194431871',
  },
  {
    name: 'Microsoft AI & ML Engineering',
    issuer: 'Microsoft · Coursera',
    when: 'In progress',
    detail: 'Professional certificate, currently underway.',
  },
]

export const projectCategories: { id: ProjectCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All quests' },
  { id: 'worlds', label: 'Interactive worlds' },
  { id: 'tools', label: 'Tools people use' },
  { id: 'lab', label: 'AI & security lab' },
]

export const projects: Project[] = [
  {
    id: 'cm-os',
    title: 'Computerjy Maher OS',
    tagline: 'The studio as an operating system',
    category: 'worlds',
    art: 'os',
    image: 'assets/projects/cm-os.jpg',
    description:
      'The fourth design of the mock brand Computerjy Maher — and not a page at all. The site asks whether you are on a laptop or a phone, boots, and hands you a macOS-style desktop or an iOS-style home screen. Services are windows, the portfolio is a browser, and there is a working shell.',
    highlights: [
      'One reducer "kernel" drives both the desktop and phone shells',
      'Nine apps, Spotlight, Finder and a terminal — ~73 kB gzipped',
      'Bilingual Arabic / English, every icon drawn as SVG',
    ],
    tech: ['React', 'Vite', 'JavaScript', 'CSS', 'SVG'],
    github: 'https://github.com/abdullah2036/computerjymaherOS',
    demo: 'https://abdullah2036.github.io/computerjymaherOS/',
    year: '2026',
  },
  {
    id: 'cm-3d',
    title: 'Computerjy Maher 3D',
    tagline: 'Walk into the store',
    category: 'worlds',
    art: 'room',
    image: 'assets/projects/cm-3d.jpg',
    description:
      'A first-person WebGL room where the 3D world is the site. Walk around a gaming desk with WASD; the monitor is a live render-target portal — click it and the camera flies through the glass into a digital showroom with five product zones joined by light bridges.',
    highlights: [
      'Monitor renders a second live scene, not a video',
      'Seamless portal transition — no visible scene swap',
      'Self-contained build with embedded GLB models',
    ],
    tech: ['three.js', 'WebGL', 'GLB models', 'JavaScript'],
    github: 'https://github.com/abdullah2036/computerjymaher3d',
    demo: 'https://abdullah2036.github.io/computerjymaher3d/',
    year: '2026',
  },
  {
    id: 'cm-night',
    title: 'Night City',
    tagline: 'One continuous cinematic scroll',
    category: 'worlds',
    art: 'city',
    image: 'assets/projects/cm-night.jpg',
    description:
      'A scroll-driven neon-Tokyo redesign of Computerjy Maher. A WebGL particle field morphs shape and colour per section — globe, torus, helix, lattice, skyline — over a perspective street grid, with magnetic buttons, clip-reveal headings and a full reduced-motion path.',
    highlights: [
      'Additive-blended shader particles that morph per section',
      'Scrubbed GSAP ScrollTrigger timeline with Lenis smooth scroll',
      'Content can never get stuck hidden if a CDN fails',
    ],
    tech: ['three.js', 'GSAP', 'ScrollTrigger', 'Lenis', 'HTML/CSS'],
    github: 'https://github.com/abdullah2036/computerjymaherV3',
    demo: 'https://abdullah2036.github.io/computerjymaherV3/',
    year: '2026',
  },
  {
    id: 'cm-v1',
    title: 'Computerjy Maher v1',
    tagline: 'Where the series started',
    category: 'worlds',
    art: 'terminal',
    image: 'assets/projects/cm-v1.jpg',
    description:
      'A 2D cyberpunk, retro-terminal landing page for a bilingual mock tech store. Its brand, products and copy became the fixed content every later version reuses — only the form changes between versions.',
    highlights: ['Bilingual Arabic / English layout', 'The content baseline for v2, v3 and v4'],
    tech: ['HTML', 'CSS', 'JavaScript'],
    github: 'https://github.com/abdullah2036/ComputerjyMaher',
    demo: 'https://abdullah2036.github.io/ComputerjyMaher/',
    year: '2026',
  },
  {
    id: 'chess',
    title: 'Chess Pairing Interface',
    tagline: 'Find your board in seconds',
    category: 'tools',
    art: 'chess',
    image: 'assets/projects/chess.jpg',
    description:
      'Built after watching players struggle with huge pairing tables at tournaments. Paste a Chess-Results URL or ID and it shows only what a player needs: opponent, board, round and colour.',
    highlights: [
      'Dependency-free — parsing runs off the main thread in Web Workers',
      'Deployed on Cloudflare Workers',
    ],
    tech: ['JavaScript', 'Web Workers', 'Cloudflare Workers'],
    github: 'https://github.com/abdullah2036/chessUI',
    demo: 'https://chessresults.pageui.workers.dev/',
    year: '2026',
  },
  {
    id: 'eloria',
    title: 'Eloria',
    tagline: 'Self-publishing for a non-technical writer',
    category: 'tools',
    art: 'book',
    image: 'assets/projects/eloria.jpg',
    description:
      'A novel-publishing site for an author with no technical background. Content lives in a single JSON file, edits save as browser-side drafts, and one button commits them straight to GitHub through the Contents API — no build step, no CMS, no hosting cost.',
    highlights: [
      'Arabic setup guide and a scoped access token',
      'Automatic cover-image compression',
      'Backup/import and a manual upload path so a failed publish never loses work',
    ],
    tech: ['JavaScript', 'GitHub REST API', 'GitHub Pages'],
    github: 'https://github.com/abdullah2036/eloriaproject',
    demo: 'https://abdullah2036.github.io/eloriaproject/',
    year: '2026',
  },
  {
    id: 'basmat',
    title: 'Basmat Watan',
    tagline: 'A national-day wall for a kindergarten',
    category: 'tools',
    art: 'map',
    description:
      'An Arabic interactive site for a kindergarten\'s Saudi National Day initiative. A child types their name, presses a fingerprint onto the map of the Kingdom — with sound and confetti — then shares a wish, a voice note or a picture that appears live on a shared wall.',
    highlights: [
      'Works instantly offline; switches to shared mode with Supabase',
      'Voice recording, live wall that refreshes every few seconds',
      'Designed for staff with no technical background',
    ],
    tech: ['JavaScript', 'HTML/CSS', 'Supabase', 'PostgreSQL'],
    github: 'https://github.com/abdullah2036/basmat-watan',
    year: '2026',
  },
  {
    id: 'workbench',
    title: 'CTF Workbench',
    tagline: 'Offline-first security toolkit',
    category: 'lab',
    art: 'shield',
    description:
      'The tooling layer for a CTF team preparing for the Black Hat MEA finals, built around a triage script that fingerprints any unknown file and routes it to the right category workflow.',
    highlights: [
      'Crypto: multi-attack RSA, XOR, oracle harness',
      'Forensics: pcap, USB HID, stego, memory · RE: angr symbolic execution, headless Ghidra',
      'A shared "already tried" log that stopped the team repeating dead ends',
    ],
    tech: ['Bash', 'Python', 'angr', 'Ghidra'],
    github: 'https://github.com/abdullah2036/workbench',
    year: '2026',
  },
  {
    id: 'zeroshot',
    title: 'Zero-Shot Visual Detector',
    tagline: 'Describe it, and the camera finds it',
    category: 'lab',
    art: 'eye',
    description:
      'A real-time webcam detector built on CLIP image–text similarity. The target is described in plain language and every frame is scored against that description — no training data, no fine-tuning.',
    highlights: ['Runtime threshold control to trade precision against recall', 'Runs locally with OpenCLIP + OpenCV'],
    tech: ['Python', 'OpenCLIP', 'OpenCV'],
    github: 'https://github.com/abdullah2036/luigi',
    year: '2026',
  },
  {
    id: 'ccd',
    title: 'CCD Simulation Auditor',
    tagline: 'Hybrid physics + ML engine',
    category: 'lab',
    art: 'chart',
    description:
      'Validates Corrosion Control Documents by combining empirical corrosion models with a Random Forest that learns correction factors for interacting variables, then quantifies the financial impact — fully offline for privacy.',
    highlights: [
      'Physics-informed synthetic training data, confidence scores for transparency',
      'Financial impact analysis and generated reports',
    ],
    tech: ['Python', 'scikit-learn', 'Streamlit', 'pandas'],
    github: 'https://github.com/abdullah2036/ccd-simulator',
    year: '2026',
  },
]

export const skillBags: SkillBag[] = [
  {
    id: 'languages',
    name: 'Languages',
    icon: 'tome',
    color: '#d6a24e',
    items: [
      { name: 'Python', glyph: 'PY', usedIn: ['workbench', 'zeroshot', 'ccd'] },
      { name: 'JavaScript', glyph: 'JS', usedIn: ['cm-os', 'cm-3d', 'cm-night', 'chess', 'eloria', 'basmat'] },
      { name: 'Java', glyph: 'JV' },
      { name: 'C', glyph: 'C' },
      { name: 'SQL', glyph: 'SQL', usedIn: ['basmat'] },
      { name: 'PHP', glyph: 'PHP', note: 'A PHP/MySQL clinic management system' },
      { name: 'Bash', glyph: 'SH', usedIn: ['workbench'] },
    ],
  },
  {
    id: 'ai',
    name: 'AI & ML',
    icon: 'potion',
    color: '#5fd0a8',
    items: [
      { name: 'scikit-learn', glyph: 'SK', usedIn: ['ccd'] },
      { name: 'pandas', glyph: 'PD', usedIn: ['ccd'] },
      { name: 'NumPy', glyph: 'NP', usedIn: ['ccd'] },
      { name: 'Supervised learning', glyph: 'ML', note: 'Model training and evaluation', usedIn: ['ccd'] },
      { name: 'Computer vision', glyph: 'CV', note: 'OpenCV, CLIP zero-shot inference', usedIn: ['zeroshot'] },
      { name: 'NLP fundamentals', glyph: 'NLP' },
    ],
  },
  {
    id: 'web',
    name: 'Web & Backend',
    icon: 'hammer',
    color: '#7fb0ff',
    items: [
      { name: 'React', glyph: 'RE', usedIn: ['cm-os'], note: 'Also this portfolio' },
      { name: 'Node.js / Express', glyph: 'ND', note: 'IBM capstone REST API' },
      { name: 'Django', glyph: 'DJ', note: 'IBM capstone app deployed to cloud' },
      { name: 'Flask', glyph: 'FL' },
      { name: 'REST APIs', glyph: 'API', usedIn: ['eloria'] },
      { name: 'MySQL', glyph: 'DB' },
      { name: 'HTML / CSS', glyph: 'CSS', usedIn: ['cm-v1', 'cm-night', 'basmat'] },
    ],
  },
  {
    id: 'creative',
    name: 'Creative Frontend',
    icon: 'gem',
    color: '#c79bff',
    items: [
      { name: 'three.js / WebGL', glyph: '3D', usedIn: ['cm-3d', 'cm-night'] },
      { name: 'GSAP & ScrollTrigger', glyph: 'GS', usedIn: ['cm-night'] },
      { name: 'Canvas 2D', glyph: 'CV2', note: 'This whole campsite is drawn on a canvas' },
      { name: 'Web Workers', glyph: 'WW', usedIn: ['chess'] },
    ],
  },
  {
    id: 'cloud',
    name: 'Cloud & Tools',
    icon: 'crate',
    color: '#9fb4c8',
    items: [
      { name: 'Git & GitHub', glyph: 'GIT', usedIn: ['eloria'] },
      { name: 'Docker & containers', glyph: 'DK', note: 'Docker, Kubernetes, OpenShift' },
      { name: 'CI/CD', glyph: 'CI' },
      { name: 'Cloudflare Workers', glyph: 'CF', usedIn: ['chess'] },
      { name: 'Linux', glyph: 'LX', usedIn: ['workbench'] },
      { name: 'AI-assisted development', glyph: 'AI' },
    ],
  },
  {
    id: 'security',
    name: 'Security',
    icon: 'shield',
    color: '#ff8f70',
    items: [
      { name: 'Web & network pentesting', glyph: 'PT', note: 'eCPPT certified' },
      { name: 'Reverse engineering', glyph: 'RE', note: 'Ghidra, angr', usedIn: ['workbench'] },
      { name: 'Forensics & traffic analysis', glyph: 'FX', usedIn: ['workbench'] },
    ],
  },
]

/**
 * Small things to find in the world. Text only — the objects themselves
 * are placed in src/game/world/layout.ts.
 */
export const worldText = {
  intro: 'A quiet place to build big things.',
  lake: 'Same sky, bigger dreams.',
  cat: ['The camp cat is fast asleep.', 'It has seen a lot of merge conflicts.'],
  laptop: ['A laptop, still warm from the fire.', '`npm run dev` is running... this very site, actually.'],
  backpack: ['A backpack covered in stickers:', 'React, Python, Docker, a tiny chess knight and a CTF flag.'],
  telescope: ['The telescope is pointed at the aurora.', 'Somewhere up there, a satellite is running someone\'s code.'],
  mug: ['Cold coffee.', 'Someone was debugging here until very late.'],
  boat: ['A little rowboat, tied to the boardwalk.', 'Not tonight — the lake is too calm to disturb.'],
  chess: ['A game in progress on a tree stump.', 'White to move. It is always white to move.'],
  fox: ['A fox keeps watch over the workshop.', 'It seems to approve of the toolset.'],
  owl: ['Hoo.', 'The owl reviews your pull request in complete silence.'],
  flag: ['A small flag at the edge of the cliff:', 'BLACK HAT MEA — CTF FINALS — RIYADH, DEC 2026.'],
  stairs: 'The cabin lights are on. Someone is home.',
}

# cubik.one — modular cubiks landing page

A single-page promo site for the **cubik.one** modular cubiks line: products, facets, material, interactive 3D sections, and links to the catalog. **UI copy is in English.**

**Live demo (GitHub Pages):** [https://kefir161-spec.github.io/cubik-one-landing/](https://kefir161-spec.github.io/cubik-one-landing/)  
(branch `main`, repository root; first deploy may take 1–2 minutes after push).

---

## Tech stack

| Area | Technologies |
|------|----------------|
| Markup | HTML5, semantic sections, `loading="lazy"` on images |
| Styles | CSS3, custom properties, Flexbox/Grid, responsive breakpoints, `clamp()` for type |
| Logic | JavaScript (ES modules), no bundler — runs directly in the browser |
| 3D | **Three.js** (r162) via import map: scenes, `OBJLoader`, `GLTFLoader`, **Draco** for compressed GLB |
| Motion | **GSAP 3** + **ScrollTrigger** (section reveals, cubik assembly and wall timelines) |
| Fonts | Google Fonts — **Inter** |
| Assets | SVG/PNG/JPEG, MP4 (`playsinline`, `muted` for autoplay) |

Dependencies load from CDN (jsDelivr); the project stays portable and easy to deploy.

---

## Project layout

```
├── index.html
├── css/styles.css
├── js/app.js
└── assets/
    ├── images/   # brand, cubik facets, products, material icons
    ├── facets/   # per-facet .glb (e.g. zen_facet.glb) — hero; assembly mixes faces from full cubiks in models/
    ├── media/video/
    └── models/   # .glb / .obj for Three.js
```

Asset paths are relative to the site root — works on any static host or GitHub Pages.

**Assembly check (optional):** after `npm install`, run `npm run test:assembly` — verifies `assets/facets/*.glb` load and produce a sane merged mesh (filters junk geometry).

---

## What stands out

- **Several independent 3D scenes** on one page: rotating hero models with a shared palette, assembly built from faces taken from full cubik GLBs in `models/`, a modular 3×3 “wall” with clip animation and looping rotation.
- **UI ↔ 3D**: swatch picks drive mesh materials via GSAP.
- **Scroll triggers**: builds start when a section enters the viewport and reset when you leave.
- **Resilience**: failed model loads show fallback copy (and simple hero geometry).
- **Responsive**: burger menu; product and facet grids reflow on small screens.
- **Organized assets**: predictable folders instead of random root filenames.

---

## Run locally

From the project root:

```bash
# Python 3
python -m http.server 8080
```

Open `http://localhost:8080` (not `file://` — ES modules and model loading need HTTP).

---

## For employers (short)

**Framework-free frontend** focused on scroll interaction, **WebGL**, and **animation timelines**, with a tidy repo layout. Shows integration of heavy media (GLB/OBJ/video), maintainable vanilla JS, and a consistent UI across breakpoints.

---

## License & brand

**cubik.one** content and branding belong to their owner. Landing code may be shown in a portfolio with project context noted.

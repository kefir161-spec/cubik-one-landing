import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

gsap.registerPlugin(ScrollTrigger);
console.log('%c[app.js v76] LOADED', 'color:lime;font-weight:bold;font-size:14px');

/** Должна совпадать с проверкой после загрузки assembly: глобальный ScrollTrigger.refresh() сдвигает все триггеры и может вызвать onToggle(false) у соседних секций без последующего onToggle(true). */
function isSectionInPlayViewport(sectionEl) {
    if (!sectionEl) return false;
    const r = sectionEl.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    return r.top < vh * 0.72 && r.bottom > vh * 0.12;
}

// =============================================
// Navigation
// =============================================
const burger = document.getElementById('navBurger');
const navLinks = document.querySelector('.nav-links');
burger?.addEventListener('click', () => {
    burger.classList.toggle('open');
    navLinks.classList.toggle('open');
});
navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
        burger.classList.remove('open');
        navLinks.classList.remove('open');
    });
});

// =============================================
// Hero — crossfade + карточки категорий (автосмена всех фото каждые 5 с)
// =============================================
const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
heroTL
    .to('.hero-title--hero', { opacity: 1, y: 0, duration: 0.55 })
    .to('.hero-showcase', { opacity: 1, y: 0, duration: 0.52 }, '-=0.32');

function bannerAssetUrl(folder, file) {
    return ['assets', 'images', 'banner', folder, file].map(encodeURIComponent).join('/');
}

(function initHeroShowcase() {
    const showcase = document.getElementById('heroShowcase');
    if (!showcase) return;

    const layerA = showcase.querySelector('.hero-showcase-layer--a');
    const layerB = showcase.querySelector('.hero-showcase-layer--b');
    const floats = showcase.querySelectorAll('.hero-float');
    const parallax = showcase.querySelector('[data-hero-parallax] .hero-showcase-parallax');

    if (!layerA || !layerB) return;

    const categories = [
        {
            folder: 'Garden',
            label: 'Garden',
            files: ['2.jpeg', '3 (1).jpeg', 'hf-20260210-145115-85d5663e-480f-468c-b147-8c97ea81ff32.jpeg'],
        },
        {
            folder: 'Interior',
            label: 'Interior',
            files: ['Image_202601231409.jpeg'],
        },
        {
            folder: 'Pet house',
            label: 'Pet house',
            files: ['photo_2026-03-26_13-29-32.jpg'],
        },
        {
            folder: 'Public space',
            label: 'Public space',
            files: ['1 render  (1).png', 'Image_202601231443.jpeg'],
        },
    ];

    const slides = [];
    categories.forEach((cat, categoryIndex) => {
        cat.files.forEach((file) => {
            slides.push({
                src: bannerAssetUrl(cat.folder, file),
                label: cat.label,
                categoryIndex,
            });
        });
    });

    let activeIndex = 0;
    /** True if layer A currently has the visible image (opacity 1). */
    let visibleIsA = true;
    let autoplayTimer = null;

    function setFloatState(categoryIndex) {
        floats.forEach((btn) => {
            const ci = Number(btn.dataset.categoryIndex);
            const on = ci === categoryIndex;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }

    function firstSlideIndexForCategory(categoryIndex) {
        const i = slides.findIndex((s) => s.categoryIndex === categoryIndex);
        return i >= 0 ? i : 0;
    }

    function restartAutoplay() {
        clearInterval(autoplayTimer);
        autoplayTimer = setInterval(() => {
            const next = (activeIndex + 1) % slides.length;
            applySlide(next);
        }, 5000);
    }

    function applySlide(index) {
        if (index === activeIndex || index < 0 || index >= slides.length) return;

        const outgoing = visibleIsA ? layerA : layerB;
        const incoming = visibleIsA ? layerB : layerA;
        const { src, label, categoryIndex } = slides[index];

        incoming.removeAttribute('aria-hidden');

        const finalize = () => {
            incoming.classList.add('is-visible');
            outgoing.classList.remove('is-visible');
            visibleIsA = incoming === layerA;
            activeIndex = index;
            setFloatState(categoryIndex);
            incoming.alt = label;
            outgoing.setAttribute('aria-hidden', 'true');
        };

        const run = () => {
            if (incoming.decode) {
                incoming.decode().then(finalize).catch(finalize);
            } else {
                finalize();
            }
        };

        function sameImageUrl(a, b) {
            if (!a || !b) return false;
            try {
                return new URL(a, window.location.href).pathname === new URL(b, window.location.href).pathname;
            } catch {
                return a === b;
            }
        }

        if (sameImageUrl(incoming.getAttribute('src') || incoming.src, src)) {
            requestAnimationFrame(run);
            return;
        }

        incoming.onload = () => {
            incoming.onload = null;
            incoming.onerror = null;
            run();
        };
        incoming.onerror = () => {
            incoming.onload = null;
            incoming.onerror = null;
            run();
        };
        incoming.src = src;
    }

    layerA.classList.add('is-visible');
    layerB.classList.remove('is-visible');
    layerA.alt = slides[0].label;
    setFloatState(0);
    restartAutoplay();

    const hoverMedia = window.matchMedia('(hover: hover) and (pointer: fine)');

    floats.forEach((btn) => {
        const catIdx = Number(btn.dataset.categoryIndex);
        if (Number.isNaN(catIdx)) return;

        btn.addEventListener('click', () => {
            const inCat = slides
                .map((s, i) => (s.categoryIndex === catIdx ? i : -1))
                .filter((i) => i >= 0);
            if (slides[activeIndex].categoryIndex === catIdx && inCat.length > 1) {
                const curPos = inCat.indexOf(activeIndex);
                const nextSlide = inCat[(curPos + 1) % inCat.length];
                applySlide(nextSlide);
            } else {
                applySlide(firstSlideIndexForCategory(catIdx));
            }
            restartAutoplay();
        });

        btn.addEventListener('mouseenter', () => {
            if (hoverMedia.matches) applySlide(firstSlideIndexForCategory(catIdx));
        });
    });

    if (parallax && hoverMedia.matches) {
        showcase.addEventListener('mousemove', (e) => {
            const r = showcase.getBoundingClientRect();
            const mx = (e.clientX - r.left) / r.width - 0.5;
            const my = (e.clientY - r.top) / r.height - 0.5;
            parallax.style.setProperty('--px', `${mx * 1.2}%`);
            parallax.style.setProperty('--py', `${my * 0.9}%`);
        });
        showcase.addEventListener('mouseleave', () => {
            parallax.style.setProperty('--px', '0%');
            parallax.style.setProperty('--py', '0%');
        });
    }
})();

// =============================================
// Modular hero — entrance (editorial column + 3D)
// =============================================
const modularHeroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
modularHeroTL
    .to('.modular-accordion', { opacity: 1, y: 0, duration: 0.52 })
    .to('.modular-canvas-wrap', { opacity: 1, y: 0, scale: 1, duration: 0.62, ease: 'power2.out' }, '-=0.3')
    .to('.modular-controls', { opacity: 1, y: 0, duration: 0.45 }, '-=0.52');

(function initModularAccordion() {
    const root = document.getElementById('modularAccordion');
    if (!root) return;

    const items = root.querySelectorAll('[data-acc-item]');
    let refreshTimer = null;

    function scheduleScrollTriggerRefresh() {
        if (typeof ScrollTrigger === 'undefined') return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            refreshTimer = null;
            requestAnimationFrame(() => ScrollTrigger.refresh());
        }, 420);
    }

    function setPanelA11y(item, open) {
        const panel = item.querySelector('.modular-acc-panel');
        const trig = item.querySelector('.modular-acc-trigger');
        if (panel) {
            panel.setAttribute('aria-hidden', open ? 'false' : 'true');
        }
        if (trig) {
            trig.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
    }

    function pauseVideo(item) {
        const v = item.querySelector('video[data-acc-video]');
        if (v) {
            v.pause();
            v.currentTime = 0;
        }
    }

    /** Воспроизведение после открытия панели: muted + playsinline; ждём canplay/loadeddata, иначе play() падает на пустом буфере. */
    function playVideo(item) {
        const v = item.querySelector('video[data-acc-video]');
        if (!v) return;
        v.muted = true;
        if ('playsInline' in v) v.playsInline = true;

        const tryPlay = () => {
            v.play().catch(() => {});
        };

        if (v.readyState >= 2) {
            tryPlay();
            return;
        }
        const onReady = () => {
            v.removeEventListener('canplay', onReady);
            v.removeEventListener('loadeddata', onReady);
            tryPlay();
        };
        v.addEventListener('canplay', onReady, { once: true });
        v.addEventListener('loadeddata', onReady, { once: true });
        if (v.readyState === 0) v.load();
    }

    items.forEach((item) => {
        const trigger = item.querySelector('.modular-acc-trigger');
        if (!trigger) return;

        trigger.addEventListener('click', () => {
            const opening = !item.classList.contains('is-open');
            items.forEach((other) => {
                other.classList.remove('is-open');
                pauseVideo(other);
                setPanelA11y(other, false);
            });
            if (opening) {
                item.classList.add('is-open');
                setPanelA11y(item, true);
                requestAnimationFrame(() => playVideo(item));
            }
            scheduleScrollTriggerRefresh();
        });
    });

    const accVideoIo =
        'IntersectionObserver' in window
            ? new IntersectionObserver(
                  (entries) => {
                      entries.forEach((en) => {
                          const item = en.target;
                          if (!item.classList.contains('is-open')) return;
                          if (en.isIntersecting) {
                              playVideo(item);
                          } else {
                              pauseVideo(item);
                          }
                      });
                  },
                  { root: null, threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
              )
            : null;
    items.forEach((item) => {
        if (item.querySelector('video[data-acc-video]')) accVideoIo?.observe(item);
    });
})();

// =============================================
// Three.js — modular hero: cubik + табы Bion / Void / Zen / Zen/2
// =============================================
const canvas = document.getElementById('heroCanvas');
const canvasWrap = document.getElementById('heroCanvasWrap');
const loaderEl = document.getElementById('heroLoader');

let heroScene = null;
let heroCamera = null;
let heroRenderer = null;
let heroRotationY = 0;
let heroCompositionRoot = null;

const HERO_ROT_SPEED = -0.0075;
const objLoader = new OBJLoader();

function cleanMeshGeometry(mesh, fixGeometry) {
    if (!mesh.isMesh || !mesh.geometry?.isBufferGeometry) return;
    let g = mesh.geometry;
    if (fixGeometry) {
        g = mergeVertices(g, 0.001);
        g.computeVertexNormals();
        mesh.geometry = g;
    }
}

if (canvas && canvasWrap) {
heroScene = new THREE.Scene();
heroScene.background = new THREE.Color(0xffffff);

heroCamera = new THREE.PerspectiveCamera(32, 2.5, 0.1, 500);
heroCamera.position.set(0, 1.2, 34);

heroRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
heroRenderer.toneMapping = THREE.ACESFilmicToneMapping;
heroRenderer.toneMappingExposure = 1.2;

heroScene.add(new THREE.AmbientLight(0xffffff, 0.75));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(6, 10, 8);
heroScene.add(dirLight);
const fill = new THREE.DirectionalLight(0xffffff, 0.3);
fill.position.set(-5, 3, -4);
heroScene.add(fill);

const sharedMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4f4f4,
    roughness: 0.6,
    metalness: 0.05,
});

/** Базовый масштаб hero-модели: больше значение → крупнее cubik в кадре */
const MODEL_SCALE = 7.35;
/** Наклон как на референсе: чуть сверху, видна верхняя грань (турнтейбл по центру) */
const HERO_BASE_TILT_X = 0.3;

const modelFiles = [
    { file: './assets/models/bion.glb', fixGeometry: false, format: 'gltf' },
    { file: './assets/models/void.glb', fixGeometry: false, format: 'gltf' },
    /** Полный Zen-cubik: zen_facet.glb в сцене с «раздутым» root-bbox нормализуется почти как void → выглядит вторым Void. */
    { file: './assets/models/zen.glb', fixGeometry: false, format: 'gltf' },
    /** GLB точнее и детальнее OBJ */
    { file: './assets/models/zen-2.glb', fixGeometry: true, format: 'gltf' },
];

const loadedModels = new Array(modelFiles.length).fill(null);
const dracoHero = new DRACOLoader();
dracoHero.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
const heroGltfLoader = new GLTFLoader();
heroGltfLoader.setDRACOLoader(dracoHero);

let heroLayoutInitialized = false;

function scheduleRemainingHeroModels() {
    const run = () => {
        modelFiles.forEach((_, i) => {
            if (i === HERO_DEFAULT_FACET_INDEX) return;
            loadHeroModelAt(i);
        });
    };
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 2500 });
    } else {
        setTimeout(run, 0);
    }
}

function onHeroModelLoaded(index) {
    if (!heroLayoutInitialized) {
        if (index !== HERO_DEFAULT_FACET_INDEX) return;
        layoutHeroSingleCubikMode();
        setupHeroFacetPicker();
        heroLayoutInitialized = true;
        loaderEl?.classList.add('hidden');
        scheduleRemainingHeroModels();
    } else if (heroTiltGroup && loadedModels[index]) {
        const g = loadedModels[index];
        heroTiltGroup.add(g);
        g.visible = index === heroFacetIndex;
    }
    updateHeroFacetTabAvailability();
}

function loadHeroModelAt(index) {
    const { file, fixGeometry, format } = modelFiles[index];
    if (format === 'gltf') {
        heroGltfLoader.load(
            file,
            (gltf) => {
                loadedModels[index] = buildHeroModelGroup(gltf.scene, fixGeometry);
                onHeroModelLoaded(index);
            },
            undefined,
            () => loadHeroFallbackBox(index)
        );
    } else {
        objLoader.load(
            file,
            (obj) => {
                loadedModels[index] = buildHeroModelGroup(obj, fixGeometry);
                onHeroModelLoaded(index);
            },
            undefined,
            () => loadHeroFallbackBox(index)
        );
    }
}

/**
 * Группа вращается вокруг Y; меш внутри отцентрован в (0,0,0) и без «левого» quaternion из OBJ —
 * тогда все cubiks визуально крутятся в одну сторону с одинаковой скоростью.
 */
function buildHeroModelGroup(obj, fixGeometry = false) {
    obj.rotation.set(0, 0, 0);
    obj.quaternion.set(0, 0, 0, 1);

    obj.traverse((child) => {
        if (child.isMesh) {
            cleanMeshGeometry(child, fixGeometry);
            const mat = sharedMaterial.clone();
            if (fixGeometry) {
                mat.polygonOffset = true;
                mat.polygonOffsetFactor = 1;
                mat.polygonOffsetUnits = 1;
            }
            child.material = mat;
        }
    });

    const box0 = new THREE.Box3().setFromObject(obj);
    const size0 = box0.getSize(new THREE.Vector3());
    const maxDim = Math.max(size0.x, size0.y, size0.z, 0.001);
    const scale = MODEL_SCALE / maxDim;
    obj.scale.setScalar(scale);

    const box1 = new THREE.Box3().setFromObject(obj);
    const center = box1.getCenter(new THREE.Vector3());
    obj.position.sub(center);

    const group = new THREE.Group();
    group.add(obj);
    group.rotation.order = 'YXZ';
    /** Локальные габариты без вращения турнтейбла — иначе world AABB «дышит» с углом Y и камера прыгает при каждом fit */
    const fitBox = new THREE.Box3().setFromObject(group);
    const fitSize = fitBox.getSize(new THREE.Vector3());
    group.userData.heroFitSpan = {
        x: Math.max(fitSize.x, 1e-6),
        y: Math.max(fitSize.y, 1e-6),
        z: Math.max(fitSize.z, 1e-6),
    };
    return group;
}

/** Внешняя группа: только Y (турнтейбл). Дети: tilt → меши (центр вращения — центр куба) */
let heroTiltGroup = null;

/** Стартовый cubik: 0 Bion, 1 Void, 2 Zen, 3 Zen/2 */
const HERO_DEFAULT_FACET_INDEX = 2;

const HERO_FACET_BENEFITS = [
    'Open lattice — light and airflow for plants and screens.',
    'Open frame — shelves, niches, and display surfaces.',
    'Solid relief surfaces — privacy and clean, calm lines.',
    'Low profile — stackable, compact layouts.',
];

function groundHeroGroupOnY(g) {
    g.position.set(0, 0, 0);
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    g.position.y -= box.min.y;
}

function layoutHeroSingleCubikMode() {
    const hasAny = loadedModels.some(Boolean);
    if (!hasAny) return;

    if (heroCompositionRoot) {
        heroScene.remove(heroCompositionRoot);
        while (heroCompositionRoot.children.length) {
            heroCompositionRoot.remove(heroCompositionRoot.children[0]);
        }
        heroCompositionRoot = null;
    }
    heroTiltGroup = null;

    heroCompositionRoot = new THREE.Group();
    heroCompositionRoot.rotation.order = 'YXZ';

    heroTiltGroup = new THREE.Group();
    heroTiltGroup.rotation.x = HERO_BASE_TILT_X;
    heroCompositionRoot.add(heroTiltGroup);

    loadedModels.forEach((g) => {
        if (g) heroTiltGroup.add(g);
    });

    heroScene.add(heroCompositionRoot);
    const startIdx = HERO_DEFAULT_FACET_INDEX;
    heroFacetIndex = startIdx;
    loadedModels.forEach((g, j) => {
        if (g) g.visible = j === startIdx;
    });
    syncHeroFacetChrome(startIdx);
    const active = loadedModels[startIdx];
    if (active) {
        runHeroAssemblyEntrance([active]);
    }
}

/** Без анимации scale 0.22→1 — сразу полный масштаб, как после повторного клика по табу */
function runHeroAssemblyEntrance(groups) {
    groups.forEach((g) => {
        gsap.killTweensOf(g.scale);
        g.scale.setScalar(1);
    });
    const active = groups[0];
    if (active) fitHeroCamera([active], { tight: true });
}

let heroFacetIndex = HERO_DEFAULT_FACET_INDEX;
/** GSAP-твин смены cubik; kill при быстром переключении табов */
let heroFacetSwitchTween = null;

function syncHeroFacetChrome(index) {
    const benefitEl = document.getElementById('heroFacetBenefit');
    if (benefitEl) benefitEl.textContent = HERO_FACET_BENEFITS[index] ?? '';
    document.querySelectorAll('#heroFacetPicker .facet-tab').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
        btn.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });
}

function setHeroFacetFocus(index) {
    const switchedModel = index !== heroFacetIndex;
    heroFacetIndex = index;
    syncHeroFacetChrome(index);

    const next = loadedModels[index];
    loadedModels.forEach((g, j) => {
        if (g) g.visible = j === index;
    });

    if (!next) return;

    next.position.set(0, 0, 0);
    if (heroFacetSwitchTween) {
        heroFacetSwitchTween.kill();
        heroFacetSwitchTween = null;
    }

    if (!switchedModel) {
        next.scale.setScalar(1);
        fitHeroCamera([next], { tight: true });
        return;
    }

    /**
     * Видимый «пульс»: нормальный размер → чуть уменьшить → сразу вернуть к 1.
     * fit только до/после: во время scale камера не двигается — куб реально мельчает и отскакивает.
     */
    next.scale.setScalar(1);
    fitHeroCamera([next], { tight: true });

    const pulse = { s: 1 };
    const dipS = 0.86;

    heroFacetSwitchTween = gsap.timeline({
        onComplete: () => {
            heroFacetSwitchTween = null;
            next.scale.setScalar(1);
            fitHeroCamera([next], { tight: true });
        },
    });
    heroFacetSwitchTween.to(pulse, {
        s: dipS,
        duration: 0.14,
        ease: 'power2.in',
        onUpdate: () => {
            next.scale.setScalar(pulse.s);
        },
    });
    heroFacetSwitchTween.to(pulse, {
        s: 1,
        duration: 0.32,
        ease: 'power3.out',
        onUpdate: () => {
            next.scale.setScalar(pulse.s);
        },
    });
}

function updateHeroFacetTabAvailability() {
    document.querySelectorAll('#heroFacetPicker .facet-tab').forEach((btn, i) => {
        const loaded = !!loadedModels[i];
        btn.disabled = !loaded;
        btn.setAttribute('aria-disabled', loaded ? 'false' : 'true');
    });
}

function setupHeroFacetPicker() {
    const tabs = document.querySelectorAll('#heroFacetPicker .facet-tab');
    if (!tabs.length) return;
    tabs.forEach((btn) => {
        btn.addEventListener('click', () => {
            const i = Number.parseInt(btn.dataset.facetIndex, 10);
            if (!Number.isFinite(i) || !loadedModels[i]) return;
            setHeroFacetFocus(i);
        });
    });
    updateHeroFacetTabAvailability();
}

/**
 * Подгоняет камеру под bbox групп. `tight` — один cubik крупно в hero (меньше поля, ближе камера).
 * Для одной hero-модели используем заранее сохранённые локальные габариты: world AABB при вращении
 * родителя по Y меняется от кадра к кадру, из-за этого при каждом fit камера «прыгала».
 */
function fitHeroCamera(groups, opts = {}) {
    if (!groups.length || !heroCamera) return;

    const tight = opts.tight === true;
    /** Запас под вращение и наклон без обрезки в канвасе */
    const padding = tight ? 1.32 : 1.18;
    /** Доп. вертикальный запас: верх граней при tilt+Y-вращении не вылезает из canvas */
    const paddingV = tight ? padding * 1.12 : padding;
    const minDist = tight ? 7.8 : 24;

    const g0 = groups[0];
    const u = g0.userData?.heroFitSpan;

    if (groups.length === 1 && u) {
        g0.updateMatrixWorld(true);
        const center = new THREE.Vector3();
        g0.getWorldPosition(center);
        const s = typeof g0.scale?.x === 'number' ? g0.scale.x : 1;
        /** Горизонталь после поворота вокруг Y: максимальный размах в XZ не больше hypot локальных dx,dz */
        const horiz = Math.hypot(u.x * s, u.z * s);
        const spanX = horiz;
        const spanY = u.y * s;
        const spanZ = horiz;

        const vHalf = THREE.MathUtils.degToRad(heroCamera.fov * 0.5);
        const tanHalfV = Math.tan(vHalf);
        const tanHalfH = tanHalfV * Math.max(heroCamera.aspect, 0.01);

        const distV = (spanY * paddingV) / (2 * tanHalfV);
        const distH = (spanX * padding) / (2 * tanHalfH);
        const distZ = (spanZ * padding) / (2 * tanHalfV);
        const dist = Math.max(distV, distH, distZ, minDist);

        const yLift = tight ? spanY * 0.072 : spanY * 0.07;
        /** Сдвиг точки взгляда по Y (tight): меньше |коэфф.| → куб ниже в кадре */
        const lookYOffset = tight ? -spanY * 0.14 : 0;
        heroCamera.position.set(center.x, center.y + yLift, center.z + dist);
        heroCamera.lookAt(center.x, center.y + lookYOffset, center.z);
        heroCamera.updateProjectionMatrix();
        return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    groups.forEach((g) => {
        g.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(g);
        const sx = box.max.x - box.min.x;
        const sz = box.max.z - box.min.z;
        const cx = (box.max.x + box.min.x) * 0.5;
        const cz = (box.max.z + box.min.z) * 0.5;
        const rxz = Math.hypot(sx * 0.5, sz * 0.5);
        minX = Math.min(minX, cx - rxz);
        maxX = Math.max(maxX, cx + rxz);
        minY = Math.min(minY, box.min.y);
        maxY = Math.max(maxY, box.max.y);
        minZ = Math.min(minZ, cz - rxz);
        maxZ = Math.max(maxZ, cz + rxz);
    });

    const center = new THREE.Vector3(
        (minX + maxX) * 0.5,
        (minY + maxY) * 0.5,
        (minZ + maxZ) * 0.5
    );
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const spanZ = maxZ - minZ;

    const vHalf = THREE.MathUtils.degToRad(heroCamera.fov * 0.5);
    const tanHalfV = Math.tan(vHalf);
    const tanHalfH = tanHalfV * Math.max(heroCamera.aspect, 0.01);

    const padV = tight ? padding * 1.12 : padding;
    const distV = (spanY * padV) / (2 * tanHalfV);
    const distH = (spanX * padding) / (2 * tanHalfH);
    const distZ = (spanZ * padding) / (2 * tanHalfV);
    const dist = Math.max(distV, distH, distZ, minDist);

    const yLift = tight ? spanY * 0.072 : spanY * 0.07;
    const lookYOffset = tight ? -spanY * 0.14 : 0;
    heroCamera.position.set(center.x, center.y + yLift, center.z + dist);
    heroCamera.lookAt(center.x, center.y + lookYOffset, center.z);
    heroCamera.updateProjectionMatrix();
}

function loadHeroFallbackBox(index) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), sharedMaterial.clone());
    loadedModels[index] = buildHeroModelGroup(mesh, false);
    onHeroModelLoaded(index);
}

loadHeroModelAt(HERO_DEFAULT_FACET_INDEX);

function resizeHeroRenderer() {
    const w = canvasWrap.clientWidth;
    const h = canvasWrap.clientHeight;
    if (w === 0 || h === 0) return;
    heroRenderer.setSize(w, h);
    heroCamera.aspect = w / h;
    heroCamera.updateProjectionMatrix();
    if (heroCompositionRoot) {
        const active = loadedModels[heroFacetIndex];
        if (active) fitHeroCamera([active], { tight: true });
    }
}
resizeHeroRenderer();
window.addEventListener('resize', resizeHeroRenderer);

}

let asmRenderer;
let asmScene;
let asmCamera;
let asmModelRoot;
let asmAssemblyComplete = false;
/** План макро-съёмок (две смежные пары фасетов) — после загрузки bion.glb */
let assemblyMacroPlan = null;

function getAssemblyCameraFitVectors() {
    if (!asmCamera || !asmModelRoot || asmModelRoot.children.length === 0) return null;
    const r0 = asmModelRoot.userData.assembledBoundingRadius;
    if (r0 == null || !isFinite(r0) || r0 <= 0) return null;

    /** >1 — отодвигаем камеру: куб целиком в кадре при вращении после пошаговой сборки */
    const padding = 1.26;
    const r = r0 * padding;
    const vHalf = THREE.MathUtils.degToRad(asmCamera.fov * 0.5);
    const distV = r / Math.tan(vHalf);
    const distH = r / (Math.tan(vHalf) * Math.max(asmCamera.aspect, 0.001));
    const dist = Math.max(distV, distH, 0.5) * 1.04;

    return {
        dist,
        pos: new THREE.Vector3(0, 0.32, dist),
        look: new THREE.Vector3(0, 0, 0),
        near: Math.max(0.02, dist * 0.02),
        far: Math.max(200, dist * 4),
    };
}

function updateAssemblyCameraFit() {
    const fit = getAssemblyCameraFitVectors();
    if (!fit) return;
    asmCamera.position.copy(fit.pos);
    asmCamera.lookAt(fit.look);
    asmCamera.near = fit.near;
    asmCamera.far = fit.far;
    asmCamera.updateProjectionMatrix();
}

/** Секция «Клипса»: стенка 3×3 + клипсы */
let consRenderer;
let consScene;
let consCamera;
let consWallRoot;
let consWallComplete = false;
let consBuildTL = null;
let consAnimPayload = null;
let consBackClipTL = null;
let consLeftClipTL = null;
let consRightClipTL = null;
/** Перезапуск цикла «сборка + клипсы + вращение» после полного оборота (задаётся в initConstructionWall) */
let consLoopRestartFn = null;
/** Секция #construction в зоне ScrollTrigger — иначе idle-вращение и клипсы не крутят в фоне */
let consConstructionVisible = false;

const CONS_LOOP_TURN_RAD = Math.PI * 2;

/** POV «за клипсой»: камера сзади и выше, чуть сбоку — виден силуэт, впереди паз */
function updateConsCameraRideClip(clip) {
    if (!clip || !consCamera || !consWallRoot) return;
    consWallRoot.updateMatrixWorld(true);
    clip.updateMatrixWorld(true);
    const wpos = new THREE.Vector3();
    clip.getWorldPosition(wpos);
    const parentZ = new THREE.Vector3(0, 0, 1).applyQuaternion(consWallRoot.quaternion).normalize();
    const parentY = new THREE.Vector3(0, 1, 0).applyQuaternion(consWallRoot.quaternion).normalize();
    const parentX = new THREE.Vector3(1, 0, 0).applyQuaternion(consWallRoot.quaternion).normalize();
    consCamera.position
        .copy(wpos)
        .addScaledVector(parentZ, 0.54)
        .addScaledVector(parentY, 0.15)
        .addScaledVector(parentX, 0.075);
    const lookAtPt = wpos
        .clone()
        .addScaledVector(parentZ, -0.52)
        .addScaledVector(parentY, -0.04);
    consCamera.lookAt(lookAtPt);
}

const _consLeftFacetN = new THREE.Vector3();
const _consRightFacetN = new THREE.Vector3();
const _consToCamera = new THREE.Vector3();

/** Задние клипсы — по накопленному повороту от конца сборки (135°) */
const CONS_BACK_CLIP_AT_RAD = THREE.MathUtils.degToRad(135);
/** Боковые клипсы — когда внешняя нормаль фасета смотрит на камеру (dot с направлением на камеру) */
const CONS_SIDE_FACET_DOT = 0.52;

/** Construction: по 135° чередуем скорость — быстро к вставке задних клипс, потом обычно, снова быстро… */
const CONS_WALL_SEGMENT_RAD = THREE.MathUtils.degToRad(135);
const CONS_WALL_ROT_NORMAL = 0.0028;
const CONS_WALL_ROT_FAST = CONS_WALL_ROT_NORMAL * 2.6;

(function animate() {
    requestAnimationFrame(animate);
    if (heroRenderer && heroScene && heroCamera) {
        heroRotationY += HERO_ROT_SPEED;
        if (heroCompositionRoot) {
            heroCompositionRoot.rotation.y = heroRotationY;
            heroCompositionRoot.rotation.x = 0;
            heroCompositionRoot.rotation.z = 0;
        }
        heroRenderer.render(heroScene, heroCamera);
    }
    if (asmRenderer && asmScene && asmCamera) {
        if (asmAssemblyComplete && asmModelRoot) {
            asmModelRoot.rotation.y -= 0.0056;
            asmCamera.lookAt(0, 0, 0);
        }
        asmRenderer.render(asmScene, asmCamera);
    }
    if (consRenderer && consScene && consCamera) {
        const consUd = consWallRoot?.userData;
        if (consConstructionVisible && consUd?.consClipMacroActive && consUd?.macroClip) {
            updateConsCameraRideClip(consUd.macroClip);
        }
        if (consConstructionVisible && consWallComplete && consWallRoot) {
            const ud = consWallRoot.userData;
            const deltaBefore =
                ud.consIdleStartY != null ? consWallRoot.rotation.y - ud.consIdleStartY : 0;
            let rotSpeed;
            if (ud.consRotFastAfterBack) {
                rotSpeed = CONS_WALL_ROT_FAST;
            } else {
                const segIndex = Math.max(0, Math.floor(deltaBefore / CONS_WALL_SEGMENT_RAD));
                rotSpeed = segIndex % 2 === 0 ? CONS_WALL_ROT_FAST : CONS_WALL_ROT_NORMAL;
            }
            consWallRoot.rotation.y += rotSpeed;
            const deltaAfter =
                ud.consIdleStartY != null ? consWallRoot.rotation.y - ud.consIdleStartY : 0;
            if (ud.consIdleStartY != null) {
                _consLeftFacetN.set(-1, 0, 0).applyQuaternion(consWallRoot.quaternion);
                _consRightFacetN.set(1, 0, 0).applyQuaternion(consWallRoot.quaternion);
                _consToCamera.copy(consCamera.position).normalize();
                const dotL = _consLeftFacetN.dot(_consToCamera);
                const dotR = _consRightFacetN.dot(_consToCamera);
                if (
                    ud.leftClipMeshes?.length &&
                    !ud.consLeftClipPlayed &&
                    dotL > CONS_SIDE_FACET_DOT &&
                    dotL > dotR
                ) {
                    ud.consLeftClipPlayed = true;
                    ud.playLeftClipFlyIn?.();
                }
                if (
                    ud.rightClipMeshes?.length &&
                    !ud.consRightClipPlayed &&
                    dotR > CONS_SIDE_FACET_DOT &&
                    dotR > dotL
                ) {
                    ud.consRightClipPlayed = true;
                    ud.playRightClipFlyIn?.();
                }
                if (
                    ud.backClipMeshes?.length &&
                    !ud.consBackClipPlayed &&
                    deltaAfter >= CONS_BACK_CLIP_AT_RAD
                ) {
                    ud.consBackClipPlayed = true;
                    ud.playBackClipFlyIn?.();
                }
                if (
                    consLoopRestartFn &&
                    consWallRoot.rotation.y - ud.consIdleStartY >= CONS_LOOP_TURN_RAD
                ) {
                    consWallRoot.rotation.y -= CONS_LOOP_TURN_RAD;
                    consLoopRestartFn();
                }
            }
        }
        consRenderer.render(consScene, consCamera);
    }
})();

// =============================================
// Color Picker (modular 3D hero)
// =============================================
const colorNames = {
    '#7D7F7D': 'Gray',
    '#E1B589': 'Beige',
    '#0A6F3C': 'Green',
    '#F4F4F4': 'White',
    '#0A0A0A': 'Black',
};

document.querySelectorAll('#colorPicker .swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
        document.querySelectorAll('#colorPicker .swatch').forEach((s) => s.classList.remove('active'));
        sw.classList.add('active');

        const hex = sw.dataset.color;
        const target = new THREE.Color(hex);
        const label = document.getElementById('colorLabel');
        if (label) label.textContent = colorNames[hex] || '';

        const root = heroCompositionRoot;
        if (root) {
            root.traverse((child) => {
                if (child.isMesh && child.material?.color) {
                    gsap.to(child.material.color, {
                        r: target.r,
                        g: target.g,
                        b: target.b,
                        duration: 0.45,
                        ease: 'power2.inOut',
                        overwrite: 'auto',
                    });
                }
            });
        }
    });
});

// =============================================
// Scroll Animations — fade-in
// =============================================
gsap.utils.toArray('[data-anim]').forEach(el => {
    gsap.to(el, {
        opacity: 1, y: 0, duration: 0.4, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
});

// =============================================
// Assembly — фасеты сходятся в cubik (ScrollTrigger)
//
// Эталон загрузки — bion.glb; грани можно подменить мешами с других полных кубов из assets/models
// (см. ASSEMBLY_MIXED_CUBE): у каждого файла те же 6 граней, выбирается меш по оси относительно центра куба.
// =============================================
const asmCanvas = document.getElementById('assemblyCanvas');
const asmStage = document.getElementById('assemblyStage');
const asmFallback = document.getElementById('assemblyFallback');

let asmBuildTL = null;
/** После загрузки куба для сборки — для кнопки «ещё раз» */
let assemblyMeshesRef = null;
/** Сборка фасетов: 1.5 = на 50% медленнее базовой скорости */
const ASM_BUILD_TIME_SCALE = 1.5;

/**
 * Демо «микс»: разные цвета по сторонам куба (как разные линейки/отделки). Геометрия одна и та же;
 * выключите false, если нужен монохром.
 */
const ASSEMBLY_SHOW_MIXED_FACET_COLORS = true;

/**
 * Цвет грани по доминирующей оси центра фасета относительно центра куба.
 * Пример смысла: лево/право белые, перед/зад серые, верх бежевый (Void), низ зелёный (Zen).
 */
const ASSEMBLY_SLOT_COLORS = {
    '-x': 0xf4f4f4,
    '+x': 0xf4f4f4,
    '+z': 0x9a9c9a,
    '-z': 0x9a9c9a,
    '+y': 0xe1b589,
    '-y': 0x0a6f3c,
};

/**
 * Куб из разных полных GLB в `assets/models`: у каждого куба берётся меш грани по оси (как в bion.glb).
 * Позиция/стыковка — с эталона bion; геометрия — с выбранного файла.
 */
const ASSEMBLY_MIXED_CUBE = {
    sources: {
        bion: './assets/models/bion.glb',
        void: './assets/models/void.glb',
        /** Полный куб Zen (не zen-2 — другой продукт). Масштаб выравнивается normalize + assemblyMeshFromOtherCubik. */
        zen: './assets/models/zen.glb',
    },
    /** Какой куб даёт грань на слоте (`source` — ключ из `sources`). */
    slots: [
        { key: '-x', source: 'bion', color: 0xf4f4f4 },
        { key: '+x', source: 'bion', color: 0xf4f4f4 },
        { key: '-z', source: 'zen', color: 0x9a9c9a },
        { key: '+z', source: 'zen', color: 0x9a9c9a },
        { key: '+y', source: 'void', color: 0xe1b589 },
        { key: '-y', source: 'zen', color: 0x0a6f3c },
    ],
};


const ASSEMBLY_FACE_KEYS = ['-x', '+x', '-y', '+y', '-z', '+z'];

const ASSEMBLY_SLOT_OUTWARD = {
    '-x': new THREE.Vector3(-1, 0, 0),
    '+x': new THREE.Vector3(1, 0, 0),
    '-y': new THREE.Vector3(0, -1, 0),
    '+y': new THREE.Vector3(0, 1, 0),
    '-z': new THREE.Vector3(0, 0, -1),
    '+z': new THREE.Vector3(0, 0, 1),
};

function assemblyOutwardNormalFromSlotKey(key) {
    const v = ASSEMBLY_SLOT_OUTWARD[key];
    return v ? v.clone() : new THREE.Vector3(0, 1, 0);
}

function assemblyColorHexForLog(hex) {
    return (Number(hex) >>> 0).toString(16).padStart(6, '0');
}

function assemblyMeshVertexCount(mesh) {
    return mesh.geometry?.attributes?.position?.count || 0;
}

function assemblyDominantFaceKey(dir) {
    const ax = Math.abs(dir.x);
    const ay = Math.abs(dir.y);
    const az = Math.abs(dir.z);
    if (ax >= ay && ax >= az) return dir.x >= 0 ? '+x' : '-x';
    if (ay >= ax && ay >= az) return dir.y >= 0 ? '+y' : '-y';
    return dir.z >= 0 ? '+z' : '-z';
}

function applyAssemblySlotColors(meshes, cubikCenterW) {
    if (!ASSEMBLY_SHOW_MIXED_FACET_COLORS || !meshes?.length) return;
    meshes.forEach((mesh) => {
        mesh.updateMatrixWorld(true);
        const fb = new THREE.Box3().setFromObject(mesh);
        const ctr = fb.getCenter(new THREE.Vector3());
        const key = assemblyDominantFaceKey(ctr.clone().sub(cubikCenterW));
        const hex = ASSEMBLY_SLOT_COLORS[key];
        const m = mesh.material;
        if (hex == null || !m?.color) return;
        m.color.setHex(hex);
    });
}

function loadGltfPromise(loader, url) {
    return new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
    });
}

function assemblyObjectWorldMaxAxisDim(obj) {
    obj.updateMatrixWorld(true);
    const sz = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
    return Math.max(sz.x, sz.y, sz.z, 1e-6);
}

/** Обновить matrixWorld у всего поддерева от верхнего предка (нужно для мешей из клона GLTF вне сцены). */
function assemblyUpdateWorldFromGraphRoot(obj) {
    let top = obj;
    while (top.parent) top = top.parent;
    top.updateMatrixWorld(true);
}

/** Одна целевая толщина/размер грани с эталона: max по всем 6 слотам — иначе узкая деталь даёт refD≈0.02 и ratio≈0.01. */
function assemblyRefUniformTargetDim(refByKey) {
    let d = 0;
    for (const k of ASSEMBLY_FACE_KEYS) {
        const m = refByKey[k];
        if (m) d = Math.max(d, assemblyObjectWorldMaxAxisDim(m));
    }
    return Math.max(d, 1e-6);
}

function assemblyBuildRefByKey(refMeshes, cubikCenterW) {
    const buckets = Object.create(null);
    for (const m of refMeshes) {
        m.updateMatrixWorld(true);
        const fb = new THREE.Box3().setFromObject(m);
        const ctr = fb.getCenter(new THREE.Vector3());
        const key = assemblyDominantFaceKey(ctr.clone().sub(cubikCenterW));
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(m);
    }
    const refByKey = Object.create(null);
    for (const k of ASSEMBLY_FACE_KEYS) {
        const arr = buckets[k];
        if (!arr?.length) {
            console.warn(`[BuildRefByKey] missing face key ${k}`);
            return null;
        }
        refByKey[k] = arr.reduce((a, b) =>
            assemblyMeshVertexCount(a) >= assemblyMeshVertexCount(b) ? a : b
        );
    }
    console.log(`[BuildRefByKey] OK — ${Object.keys(refByKey).join(', ')}, from ${refMeshes.length} meshes`);
    return refByKey;
}

/** Клон грани с эталона bion (та же геометрия/трансформ), другой цвет. */
function assemblyCloneRefFacet(refMesh, baseMaterial, colorHex) {
    const mat = baseMaterial.clone();
    mat.color.setHex(colorHex);
    if (refMesh.isSkinnedMesh) {
        const c = refMesh.clone(true);
        c.material = mat;
        c.frustumCulled = false;
        return c;
    }
    const mesh = new THREE.Mesh(refMesh.geometry.clone(), mat);
    mesh.position.copy(refMesh.position);
    mesh.quaternion.copy(refMesh.quaternion);
    mesh.scale.copy(refMesh.scale);
    mesh.userData.assemblyFacetMaxDim = assemblyObjectWorldMaxAxisDim(refMesh);
    mesh.frustumCulled = false;
    return mesh;
}

/**
 * Сдвигает `root` в локальных координатах родителя так, чтобы AABB содержимого
 * совпадал с началом координат родителя в мире (после микса граней центр часто «уплывает»).
 */
function assemblyRecenterRootContent(root) {
    if (!root?.parent) return;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    const worldC = box.getCenter(new THREE.Vector3());
    root.parent.updateMatrixWorld(true);
    const invP = new THREE.Matrix4().copy(root.parent.matrixWorld).invert();
    const inParent = worldC.clone().applyMatrix4(invP);
    root.position.sub(inParent);
}

/**
 * Масштаб 2.38 / maxD, центр по **мешам**.
 * void.glb (и подобные) дают у root/scene bbox сотни тысяч единиц из пустышек/transform,
 * при нормализации по root все грани сжимаются в «точки» — на экране два противоположных bion и мусор.
 */
function assemblyNormalizeCubikRoot(root, label) {
    root.updateMatrixWorld(true);
    const union = new THREE.Box3().makeEmpty();
    let meshCount = 0;
    root.traverse((ch) => {
        if ((ch.isMesh || ch.isSkinnedMesh) && ch.geometry) {
            union.expandByObject(ch);
            meshCount++;
        }
    });
    if (union.isEmpty()) {
        console.warn(`[Normalize ${label}] empty bbox, ${meshCount} meshes`);
        return false;
    }
    const size = union.getSize(new THREE.Vector3());
    const maxD = Math.max(size.x, size.y, size.z, 0.001);
    const scaleFactor = 2.38 / maxD;
    console.log(`[Normalize ${label}] meshes=${meshCount} rawSize=(${size.x.toFixed(3)},${size.y.toFixed(3)},${size.z.toFixed(3)}) maxD=${maxD.toFixed(4)} scale=${scaleFactor.toFixed(6)}`);
    root.scale.setScalar(scaleFactor);
    root.updateMatrixWorld(true);
    const union2 = new THREE.Box3().makeEmpty();
    root.traverse((ch) => {
        if ((ch.isMesh || ch.isSkinnedMesh) && ch.geometry) union2.expandByObject(ch);
    });
    root.position.sub(union2.getCenter(new THREE.Vector3()));
    root.updateMatrixWorld(true);
    return true;
}

function assemblyCubikCenterFromMeshes(root) {
    const b = new THREE.Box3().makeEmpty();
    root.updateMatrixWorld(true);
    root.traverse((ch) => {
        if ((ch.isMesh || ch.isSkinnedMesh) && ch.geometry) b.expandByObject(ch);
    });
    return b.isEmpty() ? null : b.getCenter(new THREE.Vector3());
}

/**
 * Загружает полный куб, нормализует, map «ось грани» → меш.
 * Несколько мешей на одну ось (винты, дубликаты) — оставляем с большим числом вершин.
 */
async function assemblyLoadCubikFaceMap(loader, url, facetMat, fixGeometry) {
    console.log(`[FaceMap] loading ${url}...`);
    const gltf = await loadGltfPromise(loader, url);
    const root = gltf.scene.clone(true);
    let meshTotal = 0;
    root.traverse((c) => {
        if (c.isMesh || c.isSkinnedMesh) {
            cleanMeshGeometry(c, fixGeometry);
            c.material = facetMat.clone();
            meshTotal++;
        }
    });
    console.log(`[FaceMap ${url}] raw meshes: ${meshTotal}`);
    if (!assemblyNormalizeCubikRoot(root, url)) {
        console.warn(`[FaceMap ${url}] normalize failed`);
        return null;
    }

    const meshes = [];
    root.traverse((c) => {
        if ((c.isMesh || c.isSkinnedMesh) && c.geometry) meshes.push(c);
    });
    console.log(`[FaceMap ${url}] valid meshes after normalize: ${meshes.length}`);
    if (meshes.length < 6) {
        console.warn(`[FaceMap ${url}] < 6 meshes, abort`);
        return null;
    }

    const cubikC = assemblyCubikCenterFromMeshes(root);
    if (!cubikC) return null;
    const buckets = Object.create(null);
    for (const m of meshes) {
        m.updateMatrixWorld(true);
        const fb = new THREE.Box3().setFromObject(m);
        const ctr = fb.getCenter(new THREE.Vector3());
        const key = assemblyDominantFaceKey(ctr.clone().sub(cubikC));
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(m);
    }

    const bucketSummary = Object.entries(buckets).map(([k, v]) => `${k}:${v.length}`).join(' ');
    console.log(`[FaceMap ${url}] buckets: ${bucketSummary}`);

    const byKey = Object.create(null);
    for (const k of ASSEMBLY_FACE_KEYS) {
        const arr = buckets[k];
        if (!arr?.length) {
            console.warn(`[FaceMap ${url}] missing face key ${k}`);
            return null;
        }
        byKey[k] = arr.reduce((a, b) =>
            assemblyMeshVertexCount(a) >= assemblyMeshVertexCount(b) ? a : b
        );
    }
    console.log(`[FaceMap ${url}] OK — all 6 keys resolved`);
    root.updateMatrixWorld(true);
    return byKey;
}

async function assemblyLoadCubikFaceMapFirstWorking(loader, urls, facetMat) {
    const list = Array.isArray(urls) ? urls : [urls];
    for (const url of list) {
        try {
            const map = await assemblyLoadCubikFaceMap(loader, url, facetMat, false);
            if (map) return map;
            console.warn(`[FaceMapFirstWorking] ${url} returned null, trying next`);
        } catch (err) {
            console.warn(`[FaceMapFirstWorking] ${url} error:`, err.message || err);
        }
    }
    return null;
}

/** Надёжный max-размер меша в мире: обход вершин × matrixWorld (setFromObject иногда врёт). */
function assemblyMeshWorldMaxAxisFromVertices(mesh) {
    mesh.updateMatrixWorld(true);
    const g = mesh.geometry;
    if (!g?.attributes?.position) return 0;
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    const mw = mesh.matrixWorld;
    const box = new THREE.Box3().makeEmpty();
    const n = pos.count;
    for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mw);
        box.expandByPoint(v);
    }
    if (box.isEmpty()) return 0;
    const sz = box.getSize(new THREE.Vector3());
    return Math.max(sz.x, sz.y, sz.z, 0);
}

/**
 * После parent.add(mesh): подгоняем scale так, чтобы max-ось мирового AABB совпала с эталоном.
 */
function assemblyApplyWorldMaxFitFromVertices(mesh, targetMax, logTag) {
    if (!mesh || !(targetMax > 1e-6)) return;
    let wMax = assemblyMeshWorldMaxAxisFromVertices(mesh);
    if (wMax < 1e-10) {
        mesh.updateMatrixWorld(true);
        const sz = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
        wMax = Math.max(sz.x, sz.y, sz.z, 0);
    }
    const k = targetMax / Math.max(wMax, 1e-12);
    if (!Number.isFinite(k) || k <= 0) return;
    if (Math.abs(k - 1) <= 0.004) return;
    mesh.scale.multiplyScalar(k);
    mesh.updateMatrixWorld(true);
    console.log(`[Assembly ${logTag}] vertexWorldFit ×${k.toFixed(3)} (wMax ${wMax.toFixed(5)} → ${targetMax.toFixed(4)})`);
}

function assemblyGeometryCenterWorld(mesh) {
    mesh.updateMatrixWorld(true);
    const g = mesh.geometry;
    if (!g?.attributes?.position) return null;
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    const mw = mesh.matrixWorld;
    const box = new THREE.Box3().makeEmpty();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mw);
        box.expandByPoint(v);
    }
    return box.isEmpty() ? null : box.getCenter(new THREE.Vector3());
}

/** Сдвиг mesh.position в локале родителя так, чтобы геометрия сместилась на deltaW в мире (родитель — без skew). */
function assemblyTranslateMeshByWorldDelta(mesh, deltaW) {
    const parent = mesh.parent;
    if (!parent) {
        mesh.position.add(deltaW);
        return;
    }
    parent.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    parent.matrixWorld.decompose(p, q, s);
    const localDelta = deltaW.clone().applyQuaternion(q.clone().invert()).divide(s);
    mesh.position.add(localDelta);
}

function assemblySnapMeshCenterToRefWorld(mesh, targetWorldCenter, logTag) {
    if (!mesh || !targetWorldCenter) return;
    mesh.updateMatrixWorld(true);
    const cM = assemblyGeometryCenterWorld(mesh);
    if (!cM) return;
    const deltaW = targetWorldCenter.clone().sub(cM);
    if (deltaW.lengthSq() < 1e-12) return;
    assemblyTranslateMeshByWorldDelta(mesh, deltaW);
    mesh.updateMatrixWorld(true);
    console.log(`[Assembly ${logTag}] centerSnap len=${deltaW.length().toFixed(4)}`);
}

/** Индекс самой короткой стороны мирового AABB (0=x,1=y,2=z) — у плоской грани это «толщина». */
function assemblyThinAxisIndexWorld(mesh) {
    mesh.updateMatrixWorld(true);
    const sz = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
    const d = [sz.x, sz.y, sz.z];
    const m = Math.min(d[0], d[1], d[2]);
    return d.indexOf(m);
}

/** Для слота ±x/±y/±z тонкая ось в мире должна совпадать с осью нормали грани. */
function assemblyWantThinAxisIndex(slotKey) {
    const a = slotKey[1];
    if (a === 'x') return 0;
    if (a === 'y') return 1;
    return 2;
}

const ASSEMBLY_THIN_FIX = {
    '1-2': [new THREE.Vector3(1, 0, 0), Math.PI / 2],
    '2-1': [new THREE.Vector3(1, 0, 0), -Math.PI / 2],
    '0-2': [new THREE.Vector3(0, 1, 0), Math.PI / 2],
    '2-0': [new THREE.Vector3(0, 1, 0), -Math.PI / 2],
    '0-1': [new THREE.Vector3(0, 0, 1), Math.PI / 2],
    '1-0': [new THREE.Vector3(0, 0, 1), -Math.PI / 2],
};

function assemblyFixThinAxisToMatchSlot(mesh, slotKey, logTag) {
    const want = assemblyWantThinAxisIndex(slotKey);
    for (let step = 0; step < 4; step++) {
        const thin = assemblyThinAxisIndexWorld(mesh);
        if (thin === want) return;
        const spec = ASSEMBLY_THIN_FIX[`${thin}-${want}`];
        if (!spec) {
            console.warn(`[Assembly ${logTag}] thin=${thin} want=${want} — нет пары в ASSEMBLY_THIN_FIX`);
            return;
        }
        mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(spec[0], spec[1]));
        mesh.updateMatrixWorld(true);
    }
    if (assemblyThinAxisIndexWorld(mesh) !== want) {
        console.warn(`[Assembly ${logTag}] thinAxis не сошёлся после поворотов`);
    } else {
        console.log(`[Assembly ${logTag}] thinAxis→${want} (${slotKey})`);
    }
}

/**
 * Zen: грань ориентирована «внешней» стороной наружу — нужна рабочая сторона к центру куба.
 * Поворот на π вокруг оси, лежащей в плоскости грани (переворот как вокруг ребра), меняет лицевую сторону на противоположную.
 */
function assemblyZenFlipFaceTowardCubeInterior(mesh, slotKey) {
    mesh.updateMatrixWorld(true);
    const nW = assemblyOutwardNormalFromSlotKey(slotKey).clone().normalize();
    let t = new THREE.Vector3(0, 1, 0);
    t.addScaledVector(nW, -t.dot(nW));
    if (t.lengthSq() < 1e-8) {
        t.set(1, 0, 0);
        t.addScaledVector(nW, -t.dot(nW));
    }
    if (t.lengthSq() < 1e-8) {
        t.set(0, 0, 1);
        t.addScaledVector(nW, -t.dot(nW));
    }
    t.normalize();
    mesh.rotateOnWorldAxis(t, Math.PI);
    mesh.updateMatrixWorld(true);
}

function assemblyMeshFromOtherCubik(sourceMesh, refMesh, baseMaterial, colorHex, slotKey, refTargetDim) {
    assemblyUpdateWorldFromGraphRoot(sourceMesh);
    sourceMesh.updateMatrixWorld(true);
    refMesh.updateMatrixWorld(true);
    const refParent = refMesh.parent;
    if (!refParent) {
        console.warn(`[MeshFromCubik ${slotKey || '?'}] refMesh без parent`);
        return assemblyCloneRefFacet(refMesh, baseMaterial, colorHex);
    }
    refParent.updateMatrixWorld(true);
    const cubikBion = new THREE.Box3().setFromObject(refParent).getCenter(new THREE.Vector3());

    let srcRoot = sourceMesh;
    while (srcRoot.parent) srcRoot = srcRoot.parent;
    srcRoot.updateMatrixWorld(true);
    const cubikSrc = new THREE.Box3().setFromObject(srcRoot).getCenter(new THREE.Vector3());

    const g = sourceMesh.geometry.clone();
    g.applyMatrix4(sourceMesh.matrixWorld);
    g.computeBoundingBox();
    const bb0 = g.boundingBox;
    const srcCtr = bb0.getCenter(new THREE.Vector3());

    let nSrc = srcCtr.clone().sub(cubikSrc);
    if (nSrc.lengthSq() < 1e-12) {
        nSrc.copy(assemblyOutwardNormalFromSlotKey(slotKey));
    } else {
        nSrc.normalize();
    }

    const refBox = new THREE.Box3().setFromObject(refMesh);
    const refCtrW = refBox.getCenter(new THREE.Vector3());
    let nRef = refCtrW.clone().sub(cubikBion);
    if (nRef.lengthSq() < 1e-12) {
        nRef.copy(assemblyOutwardNormalFromSlotKey(slotKey));
    } else {
        nRef.normalize();
    }

    const qAlign = new THREE.Quaternion().setFromUnitVectors(nSrc, nRef);
    if (Number.isFinite(qAlign.x) && Number.isFinite(qAlign.w)) {
        g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(qAlign));
    }

    g.computeBoundingBox();
    const bb = g.boundingBox;
    g.translate(-(bb.min.x + bb.max.x) * 0.5, -(bb.min.y + bb.max.y) * 0.5, -(bb.min.z + bb.max.z) * 0.5);
    g.computeBoundingBox();
    const sz = g.boundingBox.getSize(new THREE.Vector3());
    const facetMax = Math.max(sz.x, sz.y, sz.z, 1e-6);
    const refD =
        refTargetDim != null && Number.isFinite(refTargetDim) && refTargetDim > 1e-5
            ? refTargetDim
            : assemblyObjectWorldMaxAxisDim(refMesh);
    const ratio = refD / facetMax;
    console.log(`[MeshFromCubik ${slotKey || '?'}] facetMax=${facetMax.toFixed(4)} refD=${refD.toFixed(4)} ratio=${ratio.toFixed(6)} color=0x${assemblyColorHexForLog(colorHex)}`);
    if (!Number.isFinite(ratio) || ratio < 1e-4 || ratio > 1e4) {
        console.warn(`[MeshFromCubik ${slotKey || '?'}] bad ratio → cloning refMesh as fallback`);
        return assemblyCloneRefFacet(refMesh, baseMaterial, colorHex);
    }
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const mat = baseMaterial.clone();
    mat.color.setHex(colorHex);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.copy(refMesh.position);
    mesh.quaternion.copy(refMesh.quaternion);
    mesh.scale.copy(refMesh.scale).multiplyScalar(ratio);
    mesh.userData.assemblyFacetMaxDim = refD;
    mesh.userData.assemblyRefWorldCenter = refCtrW.clone();
    mesh.frustumCulled = false;
    return mesh;
}

/**
 * Собирает куб: грани с разных полных GLB из `ASSEMBLY_MIXED_CUBE.sources`.
 * @returns {Promise<{ meshes: THREE.Mesh[], usedComposite: boolean }>}
 */
async function assemblyTryBuildMixedCubeFromModels(root, refMeshes, cubikCenterW, facetMat, loader) {
    console.log('[Assembly] === Building mixed cube from full models ===');
    const { sources, slots } = ASSEMBLY_MIXED_CUBE;
    const refByKey = assemblyBuildRefByKey(refMeshes, cubikCenterW);
    if (!refByKey) {
        console.warn('[Assembly] refByKey failed (duplicate axes in bion?)');
        return { meshes: refMeshes, usedComposite: false };
    }
    console.log('[Assembly] ref keys:', Object.keys(refByKey).join(', '));

    for (const s of slots) {
        if (!refByKey[s.key]) {
            console.warn(`[Assembly] missing ref for slot ${s.key}`);
            return { meshes: refMeshes, usedComposite: false };
        }
    }

    const needed = new Set(slots.map((sl) => sl.source));
    const faceMaps = Object.create(null);
    faceMaps.bion = refByKey;

    try {
        for (const name of needed) {
            if (name === 'bion') continue;
            const spec = sources[name];
            if (!spec) {
                console.warn(`[Assembly] no source spec for "${name}"`);
                return { meshes: refMeshes, usedComposite: false };
            }
            console.log(`[Assembly] loading "${name}" from`, spec);
            const byKey = await assemblyLoadCubikFaceMapFirstWorking(loader, spec, facetMat);
            if (!byKey) {
                console.warn(`[Assembly] faceMap for "${name}" returned null`);
                return { meshes: refMeshes, usedComposite: false };
            }
            console.log(`[Assembly] "${name}" face keys:`, Object.keys(byKey).join(', '));
            faceMaps[name] = byKey;
        }
    } catch (err) {
        console.error('[Assembly] loading models error:', err);
        return { meshes: refMeshes, usedComposite: false };
    }

    const refTargetDim = assemblyRefUniformTargetDim(refByKey);
    console.log(`[Assembly] refTargetDim (uniform scale vs bion) = ${refTargetDim.toFixed(4)}`);

    const newMeshes = [];
    for (const slot of slots) {
        const ref = refByKey[slot.key];
        if (slot.source === 'bion') {
            console.log(`[Assembly slot ${slot.key}] → bion clone, color=0x${assemblyColorHexForLog(slot.color)}`);
            newMeshes.push(assemblyCloneRefFacet(ref, facetMat, slot.color));
            continue;
        }
        const src = faceMaps[slot.source]?.[slot.key];
        if (!src) {
            console.warn(`[Assembly slot ${slot.key}] → ${slot.source} face not found, clone ref`);
            newMeshes.push(assemblyCloneRefFacet(ref, facetMat, slot.color));
        } else {
            console.log(`[Assembly slot ${slot.key}] → ${slot.source} geometry`);
            newMeshes.push(assemblyMeshFromOtherCubik(src, ref, facetMat, slot.color, slot.key, refTargetDim));
        }
    }

    while (root.children.length) root.remove(root.children[0]);
    newMeshes.forEach((m) => root.add(m));

    root.updateMatrixWorld(true);
    for (let i = 0; i < newMeshes.length; i++) {
        const sl = slots[i];
        if (sl && sl.source !== 'bion') {
            const m = newMeshes[i];
            assemblyApplyWorldMaxFitFromVertices(m, refTargetDim, `slot ${sl.key}`);
            assemblySnapMeshCenterToRefWorld(m, m.userData.assemblyRefWorldCenter, `slot ${sl.key}`);
            assemblyFixThinAxisToMatchSlot(m, sl.key, `slot ${sl.key}`);
            assemblySnapMeshCenterToRefWorld(m, m.userData.assemblyRefWorldCenter, `slot ${sl.key} post-twist`);
            if (sl.source === 'zen') {
                assemblyZenFlipFaceTowardCubeInterior(m, sl.key);
                assemblySnapMeshCenterToRefWorld(m, m.userData.assemblyRefWorldCenter, `slot ${sl.key} post-zenFlip`);
            }
        }
    }
    root.updateMatrixWorld(true);

    for (const m of newMeshes) {
        m.updateMatrixWorld(true);
        const wb = new THREE.Box3().setFromObject(m);
        const ws = wb.getSize(new THREE.Vector3());
        const wc = wb.getCenter(new THREE.Vector3());
        console.log(`[Assembly result] mesh pos=(${m.position.x.toFixed(4)},${m.position.y.toFixed(4)},${m.position.z.toFixed(4)}) worldSize=(${ws.x.toFixed(4)},${ws.y.toFixed(4)},${ws.z.toFixed(4)}) worldCenter=(${wc.x.toFixed(4)},${wc.y.toFixed(4)},${wc.z.toFixed(4)})`);
    }
    console.log('[Assembly] === Mixed cube built successfully ===');

    return { meshes: newMeshes, usedComposite: true };
}

function applyExplodedPositions(meshes) {
    if (!meshes?.length) return;
    meshes.forEach((mesh) => {
        const ex = mesh.userData.explodedPos;
        if (ex) mesh.position.copy(ex);
    });
}

function buildAssemblyMacroPlan(meshes, modelRoot) {
    if (!meshes?.length) return null;
    modelRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(modelRoot);
    const cubikCenterW = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const half = Math.max(size.x, size.y, size.z) * 0.5 * 1.02;

    const facets = meshes.map((mesh) => {
        mesh.updateMatrixWorld(true);
        const fb = new THREE.Box3().setFromObject(mesh);
        const c = fb.getCenter(new THREE.Vector3());
        const n = c.clone().sub(cubikCenterW);
        if (n.lengthSq() < 1e-12) n.set(0, 0, 1);
        else n.normalize();
        return { mesh, centerW: c, normalW: n };
    });

    const pairs = [];
    for (let i = 0; i < facets.length; i++) {
        for (let j = i + 1; j < facets.length; j++) {
            if (Math.abs(facets[i].normalW.dot(facets[j].normalW)) < 0.28) {
                pairs.push([facets[i], facets[j]]);
            }
        }
    }
    if (pairs.length === 0) return null;

    /** Остов: первая пара с разлёта, далее каждый новый фасет стыкуется к уже собранной оболочке. */
    function buildSequentialSteps() {
        const n = facets.length;
        const pk = (a, b) => [a.mesh.uuid, b.mesh.uuid].sort().join('|');
        const inAsm = new Set();
        const usedEdge = new Set();
        const steps = [];

        const p0 = pairs[0];
        steps.push({ mode: 'dual', pair: p0 });
        inAsm.add(p0[0].mesh.uuid);
        inAsm.add(p0[1].mesh.uuid);
        usedEdge.add(pk(p0[0], p0[1]));

        while (inAsm.size < n) {
            let dock = null;
            for (const p of pairs) {
                if (usedEdge.has(pk(p[0], p[1]))) continue;
                const [x, y] = p;
                const xi = inAsm.has(x.mesh.uuid);
                const yi = inAsm.has(y.mesh.uuid);
                if (xi && !yi) {
                    dock = { statFacet: x, moverFacet: y, pair: p };
                    break;
                }
                if (!xi && yi) {
                    dock = { statFacet: y, moverFacet: x, pair: p };
                    break;
                }
            }
            if (!dock) break;
            usedEdge.add(pk(dock.pair[0], dock.pair[1]));
            inAsm.add(dock.moverFacet.mesh.uuid);
            steps.push({ mode: 'dock', statFacet: dock.statFacet, moverFacet: dock.moverFacet, pair: dock.pair });
        }

        return steps;
    }

    const sequentialSteps = buildSequentialSteps();

    function focusForPair(facetA, facetB) {
        const n1 = facetA.normalW;
        const n2 = facetB.normalW;
        const focus = cubikCenterW.clone().addScaledVector(n1, half).addScaledVector(n2, half);
        const outward = n1.clone().add(n2);
        if (outward.lengthSq() < 1e-12) outward.set(0, 1, 0);
        outward.normalize();
        return { focus, outward };
    }

    return {
        cubikCenterW,
        half,
        pairs,
        sequentialSteps,
        focusForPair,
        pair1: sequentialSteps[0]?.pair,
        pair2: sequentialSteps[1]?.pair,
    };
}

/**
 * Кадр макро: зона стыка + уже собранные фасеты.
 * lookAt всегда на центре собранного cubik (не на центре bbox пары граней) — иначе при разлёте
 * точка взгляда «ездит» и модель визуально уходит от центра белого блока.
 */
function computeAssemblyMacroCamera(stat, mover, preLocal, outwardWorld, extraBoundsMeshes = [], cubikCenterWorld) {
    /** Запас по полю зрения — края граней и защёлки остаются в кадре. */
    const padding = 1.32;
    const lookAt = cubikCenterWorld ? cubikCenterWorld.clone() : new THREE.Vector3(0, 0, 0);
    const s0 = stat.position.clone();
    const m0 = mover.position.clone();

    const box = new THREE.Box3().makeEmpty();
    const unionPose = (sp, mp) => {
        stat.position.copy(sp);
        mover.position.copy(mp);
        if (asmModelRoot) asmModelRoot.updateMatrixWorld(true);
        const b = new THREE.Box3().makeEmpty();
        b.expandByObject(stat);
        b.expandByObject(mover);
        box.union(b);
    };

    unionPose(stat.userData.assembledPos, preLocal);
    unionPose(stat.userData.assembledPos, mover.userData.assembledPos);

    stat.position.copy(s0);
    mover.position.copy(m0);
    if (asmModelRoot) asmModelRoot.updateMatrixWorld(true);

    for (const ex of extraBoundsMeshes) {
        if (ex) box.expandByObject(ex);
    }

    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const offsetFromCubik = sphere.center.distanceTo(lookAt);
    const r = Math.max((sphere.radius + offsetFromCubik) * padding, 0.06);

    const vHalf = THREE.MathUtils.degToRad(asmCamera.fov * 0.5);
    const aspect = Math.max(asmCamera.aspect, 0.001);
    const distV = r / Math.tan(vHalf);
    const distH = r / (Math.tan(vHalf) * aspect);
    let dist = Math.max(distV, distH, 0.42);

    const dir = outwardWorld.clone();
    if (dir.lengthSq() < 1e-12) dir.set(0.35, 0.18, 1);
    dir.normalize();

    const camPos = lookAt.clone().addScaledVector(dir, dist);
    camPos.y += r * 0.05;

    const fitNear = Math.max(0.004, dist * 0.008);
    const fitFar = Math.max(160, dist * 6);
    return { camPos, lookAt, fitNear, fitFar };
}

function computePreSnapLocal(mesh, outwardW, gap) {
    const assembled = mesh.userData.assembledPos;
    mesh.position.copy(assembled);
    mesh.updateMatrixWorld(true);
    const p0 = new THREE.Vector3();
    mesh.getWorldPosition(p0);
    const p1 = p0.clone().addScaledVector(outwardW, gap);
    const local = p1.clone();
    mesh.parent.worldToLocal(local);
    mesh.position.copy(assembled);
    return local;
}

function pulseAssemblySnap(mesh) {
    const m = mesh.material;
    if (!m || m.emissiveIntensity === undefined) return;
    gsap.killTweensOf(m);
    gsap.fromTo(
        m,
        { emissiveIntensity: 0 },
        { emissiveIntensity: 0.75, duration: 0.085, yoyo: true, repeat: 1, ease: 'power2.out' }
    );
}

function assemblySequentialStepsCoverAllMeshes(steps, meshes) {
    if (!steps?.length || !meshes?.length) return false;
    const covered = new Set();
    for (const st of steps) {
        if (st.mode === 'dual') {
            covered.add(st.pair[0].mesh.uuid);
            covered.add(st.pair[1].mesh.uuid);
        } else {
            covered.add(st.statFacet.mesh.uuid);
            covered.add(st.moverFacet.mesh.uuid);
        }
    }
    return covered.size === meshes.length;
}

function resetAssemblyToExploded(meshes) {
    if (asmBuildTL) {
        asmBuildTL.kill();
        asmBuildTL = null;
    }
    asmAssemblyComplete = false;
    if (!meshes?.length) return;
    applyExplodedPositions(meshes);
    meshes.forEach((mesh) => {
        mesh.visible = false;
        const m = mesh.material;
        if (m && m.emissiveIntensity !== undefined) m.emissiveIntensity = 0;
    });
    updateAssemblyCameraFit();
}

function playAssemblyBuild(meshes) {
    if (!meshes?.length) return;
    if (asmBuildTL) asmBuildTL.kill();
    meshes.forEach((m) => {
        m.visible = false;
    });
    asmAssemblyComplete = false;

    const plan = assemblyMacroPlan;
    const steps = plan?.sequentialSteps;
    const useSequential =
        Boolean(steps?.length && meshes.length >= 2) &&
        assemblySequentialStepsCoverAllMeshes(steps, meshes);

    const finishBuild = () => {
        meshes.forEach((m) => {
            m.visible = true;
            if (m.userData?.assembledPos) m.position.copy(m.userData.assembledPos);
            const mat = m.material;
            if (mat && mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0;
        });
        asmAssemblyComplete = true;
        asmBuildTL = null;
    };

    if (!useSequential) {
        if (steps?.length && !assemblySequentialStepsCoverAllMeshes(steps, meshes)) {
            console.warn('[Assembly] пошаговый план не охватывает все 6 граней — простая анимация сбора');
        }
        const S = ASM_BUILD_TIME_SCALE;
        const perFace = 1.12 * S;
        asmBuildTL = gsap.timeline({ onComplete: finishBuild });
        meshes.forEach((mesh, i) => {
            const p = mesh.userData.assembledPos;
            if (!p) return;
            const t0 = i * perFace;
            asmBuildTL.call(() => {
                mesh.visible = true;
            }, null, t0);
            asmBuildTL.to(
                mesh.position,
                {
                    x: p.x,
                    y: p.y,
                    z: p.z,
                    duration: perFace * 0.92,
                    ease: 'power2.inOut',
                },
                t0
            );
        });
        return;
    }

    const S = ASM_BUILD_TIME_SCALE;
    const gap = Math.max(0.055, plan.half * 0.1);
    const MACRO_APPROACH = 0.52 * S;
    const MACRO_SNAP = 0.45 * S;
    const PLANE_BLEND = 0.18 * S;
    /** Финальный отъезд короче: масштаб уже близок к общему кадру. */
    const FINAL_PULL = 0.45 * S;

    asmBuildTL = gsap.timeline({ onComplete: finishBuild });

    function tweenCameraClipPlanes(nearT, farT, tPos) {
        const o = { n: asmCamera.near, f: asmCamera.far };
        asmBuildTL.to(
            o,
            {
                n: nearT,
                f: farT,
                duration: PLANE_BLEND,
                ease: 'power1.out',
                onUpdate: () => {
                    asmCamera.near = o.n;
                    asmCamera.far = o.f;
                    asmCamera.updateProjectionMatrix();
                },
            },
            tPos
        );
    }

    /** Длительность = фаза подлёта, чтобы lookAt не «замирал» раньше геометрии. */
    function addCameraMacroTween(tStart, macroCam, duration) {
        asmBuildTL.to(
            asmCamera.position,
            {
                x: macroCam.camPos.x,
                y: macroCam.camPos.y,
                z: macroCam.camPos.z,
                duration,
                ease: 'power2.inOut',
                onUpdate: () => asmCamera.lookAt(macroCam.lookAt),
            },
            tStart
        );
    }

    function extrasBeforeStep(stepIndex) {
        const done = new Set();
        for (let s = 0; s < stepIndex; s++) {
            const st = steps[s];
            if (st.mode === 'dual') {
                done.add(st.pair[0].mesh.uuid);
                done.add(st.pair[1].mesh.uuid);
            } else {
                done.add(st.statFacet.mesh.uuid);
                done.add(st.moverFacet.mesh.uuid);
            }
        }
        const st = steps[stepIndex];
        if (st.mode === 'dual') {
            return meshes.filter((m) => done.has(m.uuid));
        }
        const stM = st.statFacet.mesh;
        const mvM = st.moverFacet.mesh;
        return meshes.filter((m) => done.has(m.uuid) && m !== stM && m !== mvM);
    }

    function addDualStep(tStart, step, extras) {
        const dualFlip = true;
        const [fA, fB] = step.pair;
        const stat = dualFlip ? fB.mesh : fA.mesh;
        const mover = dualFlip ? fA.mesh : fB.mesh;
        const { outward } = plan.focusForPair(fA, fB);
        const preLocal = computePreSnapLocal(mover, outward, gap);
        const macroCam = computeAssemblyMacroCamera(stat, mover, preLocal, outward, extras, plan.cubikCenterW);

        asmBuildTL.call(
            () => {
                const active = new Set(extras.map((e) => e.uuid));
                active.add(stat.uuid);
                active.add(mover.uuid);
                meshes.forEach((m) => {
                    m.visible = active.has(m.uuid);
                });
                extras.forEach((m) => {
                    m.position.copy(m.userData.assembledPos);
                });
                stat.position.copy(stat.userData.explodedPos);
                mover.position.copy(mover.userData.explodedPos);
            },
            null,
            tStart
        );

        tweenCameraClipPlanes(macroCam.fitNear, macroCam.fitFar, tStart);
        const approachT = MACRO_APPROACH;

        asmBuildTL.to(
            stat.position,
            {
                x: stat.userData.assembledPos.x,
                y: stat.userData.assembledPos.y,
                z: stat.userData.assembledPos.z,
                duration: MACRO_APPROACH,
                ease: 'power2.inOut',
            },
            tStart
        );
        asmBuildTL.to(
            mover.position,
            { x: preLocal.x, y: preLocal.y, z: preLocal.z, duration: MACRO_APPROACH, ease: 'power2.inOut' },
            tStart
        );
        addCameraMacroTween(tStart, macroCam, approachT);

        const snapT = tStart + approachT;
        asmBuildTL.to(
            mover.position,
            {
                x: mover.userData.assembledPos.x,
                y: mover.userData.assembledPos.y,
                z: mover.userData.assembledPos.z,
                duration: MACRO_SNAP,
                ease: 'power2.inOut',
                onComplete: () => {
                    pulseAssemblySnap(mover);
                    pulseAssemblySnap(stat);
                },
            },
            snapT
        );

        return snapT + MACRO_SNAP;
    }

    function addDockStep(tStart, step, extras) {
        const stat = step.statFacet.mesh;
        const mover = step.moverFacet.mesh;
        const { outward } = plan.focusForPair(step.statFacet, step.moverFacet);
        const preLocal = computePreSnapLocal(mover, outward, gap);
        const macroCam = computeAssemblyMacroCamera(stat, mover, preLocal, outward, extras, plan.cubikCenterW);

        asmBuildTL.call(
            () => {
                const active = new Set(extras.map((e) => e.uuid));
                active.add(stat.uuid);
                active.add(mover.uuid);
                meshes.forEach((m) => {
                    m.visible = active.has(m.uuid);
                });
                extras.forEach((m) => {
                    m.position.copy(m.userData.assembledPos);
                });
                stat.position.copy(stat.userData.assembledPos);
                mover.position.copy(mover.userData.explodedPos);
            },
            null,
            tStart
        );

        tweenCameraClipPlanes(macroCam.fitNear, macroCam.fitFar, tStart);
        const approachT = MACRO_APPROACH;

        asmBuildTL.to(
            mover.position,
            { x: preLocal.x, y: preLocal.y, z: preLocal.z, duration: MACRO_APPROACH, ease: 'power2.inOut' },
            tStart
        );
        addCameraMacroTween(tStart, macroCam, approachT);

        const snapT = tStart + approachT;
        asmBuildTL.to(
            mover.position,
            {
                x: mover.userData.assembledPos.x,
                y: mover.userData.assembledPos.y,
                z: mover.userData.assembledPos.z,
                duration: MACRO_SNAP,
                ease: 'power2.inOut',
                onComplete: () => {
                    pulseAssemblySnap(mover);
                    pulseAssemblySnap(stat);
                },
            },
            snapT
        );

        return snapT + MACRO_SNAP;
    }

    let t = 0;
    for (let i = 0; i < steps.length; i++) {
        const ex = extrasBeforeStep(i);
        t = steps[i].mode === 'dual' ? addDualStep(t, steps[i], ex) : addDockStep(t, steps[i], ex);
    }

    asmBuildTL.call(
        () => {
            meshes.forEach((m) => {
                m.visible = true;
                m.position.copy(m.userData.assembledPos);
                const mat = m.material;
                if (mat && mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0;
            });
        },
        null,
        t
    );

    const wideFit = getAssemblyCameraFitVectors();
    const widePos = wideFit ? wideFit.pos : asmCamera.position.clone();
    const wideLook = wideFit ? wideFit.look : new THREE.Vector3(0, 0, 0);

    if (wideFit) {
        tweenCameraClipPlanes(wideFit.near, wideFit.far, t);
    }

    asmBuildTL.to(
        asmCamera.position,
        {
            x: widePos.x,
            y: widePos.y,
            z: widePos.z,
            duration: FINAL_PULL,
            ease: 'power2.inOut',
            onUpdate: () => asmCamera.lookAt(wideLook),
        },
        t
    );
}

function initAssemblyViewer() {
    if (!asmCanvas || !asmStage) return;

    asmScene = new THREE.Scene();
    asmScene.background = new THREE.Color(0xffffff);

    asmCamera = new THREE.PerspectiveCamera(46, 1, 0.08, 200);
    asmCamera.position.set(0, 0, 5.5);

    asmRenderer = new THREE.WebGLRenderer({
        canvas: asmCanvas,
        antialias: true,
        alpha: false,
        logarithmicDepthBuffer: true,
    });
    asmRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    asmRenderer.setClearColor(0xffffff, 1);
    asmRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    asmRenderer.toneMappingExposure = 1.12;

    asmScene.add(new THREE.AmbientLight(0xffffff, 0.82));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.05);
    d1.position.set(5, 9, 7);
    asmScene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.32);
    d2.position.set(-4, 3, -4);
    asmScene.add(d2);

    asmModelRoot = new THREE.Group();
    asmModelRoot.rotation.order = 'YXZ';
    asmScene.add(asmModelRoot);

    const facetMat = new THREE.MeshStandardMaterial({
        color: 0x7d7f7d,
        roughness: 0.58,
        metalness: 0.04,
        emissive: new THREE.Color(0x2f6f4e),
        emissiveIntensity: 0,
    });

    function resizeAsm() {
        const w = asmStage.clientWidth;
        const h = asmStage.clientHeight;
        if (w < 2 || h < 2) return;
        asmRenderer.setSize(w, h, false);
        asmCamera.aspect = w / h;
        asmCamera.updateProjectionMatrix();
        const tlBusy = Boolean(asmBuildTL?.isActive?.());
        if (!tlBusy) {
            updateAssemblyCameraFit();
        }
    }
    resizeAsm();
    window.addEventListener('resize', resizeAsm);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(
        './assets/models/bion.glb',
        (gltf) => {
            void (async () => {
                asmCanvas?.classList.add('is-assembly-preparing');
                try {
                asmFallback?.setAttribute('hidden', '');

                const root = gltf.scene;
                root.traverse((c) => {
                    if (c.isMesh || c.isSkinnedMesh) {
                        c.material = facetMat.clone();
                    }
                });

                const box = new THREE.Box3().setFromObject(root);
                const size = box.getSize(new THREE.Vector3());
                const maxD = Math.max(size.x, size.y, size.z, 0.001);
                const scale = 2.38 / maxD;
                console.log(`[Assembly bion.glb] rawSize=(${size.x.toFixed(3)},${size.y.toFixed(3)},${size.z.toFixed(3)}) maxD=${maxD.toFixed(4)} scale=${scale.toFixed(6)}`);
                root.scale.setScalar(scale);

                box.setFromObject(root);
                const center = box.getCenter(new THREE.Vector3());
                root.position.sub(center);

                asmModelRoot.add(root);

                const refMeshes = [];
                root.updateMatrixWorld(true);
                asmModelRoot.updateMatrixWorld(true);
                root.traverse((c) => {
                    if ((c.isMesh || c.isSkinnedMesh) && c.geometry) refMeshes.push(c);
                });
                console.log(`[Assembly bion.glb] refMeshes: ${refMeshes.length}`);

                if (refMeshes.length === 0) {
                    asmFallback?.removeAttribute('hidden');
                    return;
                }

                let cubikC = new THREE.Box3().setFromObject(asmModelRoot).getCenter(new THREE.Vector3());
                console.log(`[Assembly] cubikCenter=(${cubikC.x.toFixed(4)},${cubikC.y.toFixed(4)},${cubikC.z.toFixed(4)})`);

                let meshes = refMeshes;
                console.log('%c[Assembly] Attempting mixed cube build...', 'color:cyan;font-weight:bold');
                console.log('[Assembly] sources config:', JSON.stringify(ASSEMBLY_MIXED_CUBE.sources));
                console.log('[Assembly] slots:', JSON.stringify(ASSEMBLY_MIXED_CUBE.slots.map(s => `${s.key}→${s.source}`)));
                try {
                    const cr = await assemblyTryBuildMixedCubeFromModels(
                        root,
                        refMeshes,
                        cubikC,
                        facetMat,
                        gltfLoader
                    );
                    meshes = cr.meshes;
                    console.log(`%c[Assembly] Mixed cube result: usedComposite=${cr.usedComposite}, meshes=${meshes.length}`, cr.usedComposite ? 'color:lime;font-weight:bold' : 'color:red;font-weight:bold');
                    asmModelRoot.updateMatrixWorld(true);
                    if (cr.usedComposite) {
                        assemblyRecenterRootContent(root);
                        asmModelRoot.updateMatrixWorld(true);
                        cubikC = new THREE.Box3().setFromObject(asmModelRoot).getCenter(new THREE.Vector3());
                    } else {
                        applyAssemblySlotColors(meshes, cubikC);
                    }
                } catch (err) {
                    console.error('%c[Assembly] build FAILED, fallback to bion only:', 'color:red;font-weight:bold', err);
                    meshes = refMeshes;
                    applyAssemblySlotColors(meshes, cubikC);
                }

                meshes.forEach((m) => {
                    m.userData.assembledPos = m.position.clone();
                });

                asmModelRoot.updateMatrixWorld(true);
                const assembledSphere = new THREE.Box3()
                    .setFromObject(asmModelRoot)
                    .getBoundingSphere(new THREE.Sphere());
                asmModelRoot.userData.assembledBoundingRadius = assembledSphere.radius;

                const rAsm = assembledSphere.radius;
                const expandBase = Math.max(2.4, maxD * scale * 0.95);
                const expandW = Math.min(expandBase, Math.max(1.05, rAsm * 1.62));

                updateAssemblyCameraFit();
                asmScene.updateMatrixWorld(true);
                asmModelRoot.updateMatrixWorld(true);
                asmCamera.updateMatrixWorld(true);
                const camWorld = new THREE.Vector3();
                asmCamera.getWorldPosition(camWorld);
                const toCam = camWorld.clone().sub(cubikC);
                if (toCam.lengthSq() < 1e-12) toCam.set(0, 0, 1);
                else toCam.normalize();

                meshes.forEach((mesh, idx) => {
                    mesh.updateMatrixWorld(true);
                    const assembledWorld = new THREE.Vector3();
                    mesh.getWorldPosition(assembledWorld);

                    const fb = new THREE.Box3().setFromObject(mesh);
                    const facetCtr = fb.getCenter(new THREE.Vector3());

                    let dir = facetCtr.clone().sub(cubikC);
                    if (dir.lengthSq() < 1e-14) {
                        const ax = [
                            new THREE.Vector3(1, 0, 0),
                            new THREE.Vector3(-1, 0, 0),
                            new THREE.Vector3(0, 1, 0),
                            new THREE.Vector3(0, -1, 0),
                            new THREE.Vector3(0, 0, 1),
                            new THREE.Vector3(0, 0, -1),
                        ];
                        dir.copy(ax[idx % 6]);
                    } else {
                        dir.normalize();
                    }

                    const facing = dir.dot(toCam);
                    let mult = 1.42;
                    if (facing > 0.62) mult = 1.02;
                    else if (facing > 0.35) mult = 1.12;
                    else if (facing < -0.4) mult = 1.92;
                    else if (facing < -0.15) mult = 1.68;

                    const explodedWorldOrigin = assembledWorld.clone().addScaledVector(dir, expandW * mult);

                    mesh.parent.updateMatrixWorld(true);
                    const invParent = new THREE.Matrix4().copy(mesh.parent.matrixWorld).invert();
                    const explodedLocal = explodedWorldOrigin.clone().applyMatrix4(invParent);

                    mesh.position.copy(explodedLocal);
                    mesh.userData.explodedPos = mesh.position.clone();
                });

                meshes.forEach((m) => {
                    m.visible = false;
                });

                updateAssemblyCameraFit();
                assemblyMacroPlan = buildAssemblyMacroPlan(meshes, asmModelRoot);

                assemblyMeshesRef = meshes;

                const asmScrollST = ScrollTrigger.create({
                    trigger: '#assembly',
                    start: 'top 70%',
                    end: 'bottom 25%',
                    onEnter: () => playAssemblyBuild(meshes),
                    onEnterBack: () => playAssemblyBuild(meshes),
                    onLeave: () => resetAssemblyToExploded(meshes),
                    onLeaveBack: () => resetAssemblyToExploded(meshes),
                });
                /**
                 * Если модель догрузилась, когда пользователь уже прокрутил к секции, onEnter не вызовется
                 * (не было «пересечения» границы start). Fallback по getBoundingClientRect расходился с start/end — используем isActive.
                 */
                let assemblyPostLoadSyncRan = false;
                function playAssemblyIfTriggerZoneActive() {
                    if (assemblyPostLoadSyncRan) return;
                    ScrollTrigger.refresh();
                    const inZone =
                        typeof asmScrollST.isActive === 'boolean'
                            ? asmScrollST.isActive
                            : isSectionInPlayViewport(document.getElementById('assembly'));
                    if (!inZone) return;
                    assemblyPostLoadSyncRan = true;
                    playAssemblyBuild(meshes);
                }
                requestAnimationFrame(() => {
                    playAssemblyIfTriggerZoneActive();
                    requestAnimationFrame(() => {
                        playAssemblyIfTriggerZoneActive();
                        setTimeout(playAssemblyIfTriggerZoneActive, 220);
                    });
                });
                } finally {
                    asmCanvas?.classList.remove('is-assembly-preparing');
                }
            })();
        },
        undefined,
        () => {
            asmFallback?.removeAttribute('hidden');
        }
    );
}

initAssemblyViewer();

function replayAssemblyAnimation() {
    if (!assemblyMeshesRef?.length) return;
    resetAssemblyToExploded(assemblyMeshesRef);
    playAssemblyBuild(assemblyMeshesRef);
}

asmStage?.addEventListener('click', replayAssemblyAnimation);
asmStage?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    replayAssemblyAnimation();
});

// =============================================
// Construction — стенка 3×3 (Void / Bion / Zen) + клипсы clips.obj
// =============================================
const consCanvas = document.getElementById('constructionCanvas');
const consStage = document.getElementById('constructionStage');
const consFallback = document.getElementById('constructionFallback');

function mergeObjWorldGeometries(root) {
    const geoms = [];
    root.updateMatrixWorld(true);
    root.traverse((child) => {
        if (child.isMesh && child.geometry) {
            const g = child.geometry.clone();
            g.applyMatrix4(child.matrixWorld);
            geoms.push(g);
        }
    });
    if (geoms.length === 0) return null;
    return mergeGeometries(geoms, false);
}

/** Центрирует и тянет bbox до 1×1×1 по осям — соседние cubiks в сетке стык в стык без зазоров */
function normalizeObjectToUnitAxesBox(obj) {
    obj.rotation.set(0, 0, 0);
    obj.scale.set(1, 1, 1);
    obj.position.set(0, 0, 0);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const cx = Math.max(size.x, 1e-6);
    const cy = Math.max(size.y, 1e-6);
    const cz = Math.max(size.z, 1e-6);
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center);
    obj.updateMatrixWorld(true);
    obj.scale.set(1 / cx, 1 / cy, 1 / cz);
    obj.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(obj);
    const c2 = box2.getCenter(new THREE.Vector3());
    obj.position.sub(c2);
}

/**
 * Равномерный масштаб 1/max(size) — без разного масштаба по осям (иначе на Bion с normal map / рельефом — «рвёт» шейдинг).
 * Ячейка может быть чуть меньше 1 по отдельным осям, зато без искажений.
 */
function normalizeObjectToUnitUniformMax(obj) {
    obj.rotation.set(0, 0, 0);
    obj.scale.set(1, 1, 1);
    obj.position.set(0, 0, 0);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxD = Math.max(size.x, size.y, size.z, 1e-6);
    const center = box.getCenter(new THREE.Vector3());
    obj.position.sub(center);
    obj.updateMatrixWorld(true);
    obj.scale.setScalar(1 / maxD);
    obj.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(obj);
    obj.position.sub(box2.getCenter(new THREE.Vector3()));
}

/** Как normalizeObjectToUnitAxesBox, но union bbox только по Mesh — для GLB с пустыми transform/helper у root */
function normalizeConstructionCubikToUnitBox(root) {
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().makeEmpty();
    root.traverse((ch) => {
        if (ch.isMesh && ch.geometry) box.expandByObject(ch);
    });
    if (box.isEmpty()) {
        normalizeObjectToUnitAxesBox(root);
        return;
    }
    const size = box.getSize(new THREE.Vector3());
    const cx = Math.max(size.x, 1e-6);
    const cy = Math.max(size.y, 1e-6);
    const cz = Math.max(size.z, 1e-6);
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    root.updateMatrixWorld(true);
    root.scale.set(1 / cx, 1 / cy, 1 / cz);
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().makeEmpty();
    root.traverse((ch) => {
        if (ch.isMesh && ch.geometry) box2.expandByObject(ch);
    });
    if (!box2.isEmpty()) root.position.sub(box2.getCenter(new THREE.Vector3()));
}

/**
 * Совмещает union bbox мешей void.glb с bbox нормализованного void.obj — та же ячейка сетки, без ручных сдвигов.
 */
function alignVoidGlbMeshToObjReference(voidGlbRoot, voidObjRefNormalized) {
    voidGlbRoot.updateMatrixWorld(true);
    voidObjRefNormalized.updateMatrixWorld(true);
    const boxG = new THREE.Box3().makeEmpty();
    const boxR = new THREE.Box3().makeEmpty();
    voidGlbRoot.traverse((ch) => {
        if (ch.isMesh && ch.geometry) boxG.expandByObject(ch);
    });
    voidObjRefNormalized.traverse((ch) => {
        if (ch.isMesh && ch.geometry) boxR.expandByObject(ch);
    });
    if (boxG.isEmpty() || boxR.isEmpty()) return;
    const sizeG = boxG.getSize(new THREE.Vector3());
    const sizeR = boxR.getSize(new THREE.Vector3());
    voidGlbRoot.scale.multiply(
        new THREE.Vector3(
            sizeR.x / Math.max(sizeG.x, 1e-6),
            sizeR.y / Math.max(sizeG.y, 1e-6),
            sizeR.z / Math.max(sizeG.z, 1e-6)
        )
    );
    voidGlbRoot.updateMatrixWorld(true);
    boxG.makeEmpty();
    voidGlbRoot.traverse((ch) => {
        if (ch.isMesh && ch.geometry) boxG.expandByObject(ch);
    });
    const cG = boxG.getCenter(new THREE.Vector3());
    const cR = boxR.getCenter(new THREE.Vector3());
    voidGlbRoot.position.add(cR.clone().sub(cG));
}

/** Construction: общие PBR-параметры — кубики и клипсы */
const CONS_CUBIK_PBR_ENV_CLONE = 0.42;
const CONS_CUBIK_PBR_ENV_NEW = 0.48;
const CONS_CUBIK_PBR_ROUGH_NEW = 0.52;
const CONS_CUBIK_PBR_METAL_NEW = 0.06;

/**
 * Construction: PBR с IBL. hex — как в палитре (sRGB); Color.setHex уже переводит в рабочее пространство.
 * Низкий envMapIntensity — иначе отражения «перебивают» базовый цвет и он не совпадает с образцом.
 */
function applyCubikMaterial(obj, hex, envMap) {
    obj.traverse((child) => {
        if (!child.isMesh) return;
        const m = child.material;
        if (envMap && m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) {
            const mat = m.clone();
            mat.color.setHex(hex, THREE.SRGBColorSpace);
            mat.envMap = envMap;
            mat.envMapIntensity = CONS_CUBIK_PBR_ENV_CLONE;
            mat.roughness = THREE.MathUtils.clamp((mat.roughness ?? 0.5) * 0.92, 0.38, 0.78);
            mat.metalness = THREE.MathUtils.clamp(mat.metalness ?? 0.06, 0, 0.12);
            child.material = mat;
        } else {
            child.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHex(hex, THREE.SRGBColorSpace),
                roughness: CONS_CUBIK_PBR_ROUGH_NEW,
                metalness: CONS_CUBIK_PBR_METAL_NEW,
                envMap: envMap || null,
                envMapIntensity: envMap ? CONS_CUBIK_PBR_ENV_NEW : 0,
            });
        }
    });
}

function stripGltfLightsAndCameras(root) {
    const drop = [];
    root.traverse((o) => {
        if (o.isLight || o.isCamera) drop.push(o);
    });
    drop.forEach((o) => o.parent?.remove(o));
}

function initConstructionWall() {
    if (!consCanvas || !consStage) return;

    consScene = new THREE.Scene();
    consScene.background = new THREE.Color(0xffffff);

    consCamera = new THREE.PerspectiveCamera(38, 1, 0.06, 200);
    consCamera.position.set(0, 0.15, 6);

    consRenderer = new THREE.WebGLRenderer({
        canvas: consCanvas,
        antialias: true,
        alpha: false,
        logarithmicDepthBuffer: true,
        powerPreference: 'high-performance',
    });
    consRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    consRenderer.setClearColor(0xffffff, 1);
    consRenderer.outputColorSpace = THREE.SRGBColorSpace;
    /** ACES сильно смещает оттенки относительно hex из палитры; Linear ближе к «как в макете» */
    consRenderer.toneMapping = THREE.LinearToneMapping;
    consRenderer.toneMappingExposure = 1.0;
    consRenderer.shadowMap.enabled = true;
    consRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const consPmrem = new THREE.PMREMGenerator(consRenderer);
    const consRoomEnv = new RoomEnvironment();
    const consEnvRt = consPmrem.fromScene(consRoomEnv, 0.04);
    consScene.environment = consEnvRt.texture;
    consRoomEnv.dispose();
    consPmrem.dispose();

    consScene.add(new THREE.AmbientLight(0xffffff, 0.22));
    consScene.add(new THREE.HemisphereLight(0xffffff, 0xb4b6bc, 0.48));

    const cDir = new THREE.DirectionalLight(0xffffff, 1.18);
    cDir.position.set(4.2, 9.2, 6.8);
    cDir.castShadow = true;
    cDir.shadow.mapSize.set(2048, 2048);
    cDir.shadow.camera.near = 0.35;
    cDir.shadow.camera.far = 36;
    cDir.shadow.camera.left = -3.6;
    cDir.shadow.camera.right = 3.6;
    cDir.shadow.camera.top = 3.6;
    cDir.shadow.camera.bottom = -3.6;
    cDir.shadow.bias = -0.00038;
    cDir.shadow.normalBias = 0.048;
    consScene.add(cDir);

    const cFill = new THREE.DirectionalLight(0xf2f4f8, 0.36);
    cFill.position.set(-4.8, 3.4, -5.2);
    consScene.add(cFill);

    const cRim = new THREE.DirectionalLight(0xffffff, 0.26);
    cRim.position.set(0, 2.2, -8);
    consScene.add(cRim);

    consWallRoot = new THREE.Group();
    consWallRoot.rotation.order = 'YXZ';
    consScene.add(consWallRoot);

    function getConstructionCameraFitDistance(fovDeg) {
        if (!consWallRoot) return 6;
        consWallRoot.updateMatrixWorld(true);
        const r0 = consWallRoot.userData.assembledFitRadius;
        let r;
        if (r0 != null && isFinite(r0) && r0 > 0) {
            r = r0 * 1.22;
        } else {
            const box = new THREE.Box3().setFromObject(consWallRoot);
            if (box.isEmpty() || !isFinite(box.min.x)) return 6;
            const sp = box.getBoundingSphere(new THREE.Sphere());
            if (!isFinite(sp.radius) || sp.radius <= 0) return 6;
            r = sp.radius * 1.22;
        }
        const fov = fovDeg ?? consCamera?.fov ?? 38;
        const asp = Math.max(consCamera?.aspect ?? 1, 0.001);
        const vHalf = THREE.MathUtils.degToRad(fov * 0.5);
        const distV = r / Math.tan(vHalf);
        const distH = r / (Math.tan(vHalf) * asp);
        return Math.max(distV, distH, 0.5);
    }

    function updateConsCameraFit() {
        if (!consCamera || !consWallRoot) return;
        const dist = getConstructionCameraFitDistance();
        consCamera.position.set(0, 0.12, dist);
        consCamera.lookAt(0, 0, 0);
        consCamera.near = Math.max(0.02, dist * 0.02);
        consCamera.far = Math.max(200, dist * 4);
        consCamera.updateProjectionMatrix();
    }

    function resizeCons() {
        const w = consStage.clientWidth;
        const h = consStage.clientHeight;
        if (w < 2 || h < 2) return;
        consRenderer.setSize(w, h, false);
        consCamera.aspect = w / h;
        consCamera.updateProjectionMatrix();
        if (!consWallRoot?.userData?.consClipMacroActive) {
            updateConsCameraFit();
        }
    }
    resizeCons();
    window.addEventListener('resize', resizeCons);

    const loadObj = (url) =>
        new Promise((resolve, reject) => {
            objLoader.load(url, resolve, undefined, reject);
        });

    const consGltfLoader = new GLTFLoader();
    const loadConsGltf = (url) =>
        new Promise((resolve, reject) => {
            consGltfLoader.load(url, resolve, undefined, reject);
        });

    async function loadZenCubikRoot() {
        try {
            const gltf = await loadConsGltf('./assets/models/zen.glb');
            const root = gltf.scene.clone(true);
            stripGltfLightsAndCameras(root);
            return root;
        } catch (err) {
            console.warn('Construction: zen.glb failed, using zen.obj', err);
            const o = await loadObj('./assets/models/zen.obj');
            return o.clone(true);
        }
    }

    /** void.glb по геометрии совмещаем с нормализованным void.obj — позиция в сетке как у OBJ. */
    async function loadVoidTemplateForWall() {
        const voidObj = await loadObj('./assets/models/void.obj');
        const voidRef = voidObj.clone(true);
        normalizeObjectToUnitAxesBox(voidRef);
        try {
            const gltf = await loadConsGltf('./assets/models/void.glb');
            const voidT = gltf.scene.clone(true);
            stripGltfLightsAndCameras(voidT);
            normalizeConstructionCubikToUnitBox(voidT);
            alignVoidGlbMeshToObjReference(voidT, voidRef);
            return voidT;
        } catch (err) {
            console.warn('Construction: void.glb failed, using void.obj', err);
            return voidRef.clone(true);
        }
    }

    const GRID = [-1, 0, 1];
    const Z_CLIP_START = 1.45;
    const D_CUBIK_MOVE = 0.875;
    /** Клипсы: 0.5 с лёгким «набором» (отход от слота), затем короткая ускоренная посадка */
    const D_CLIP_BUILD = 0.5;
    /** Вставка в паз — ~в 2× дольше (скорость примерно на 50% ниже) */
    const D_CLIP_INSERT = 0.34;
    /** Первая фронтальная клипса: POV + сильное замедление у паза */
    const CONS_CLIP_MACRO_FOV = 43;
    const CONS_CAMERA_FOV_WIDE = consCamera.fov;
    const CONS_CLIP_MACRO_NUDGE_DUR = 0.2;
    const CONS_CLIP_MACRO_FAST_DUR = 1.05;
    const CONS_CLIP_MACRO_SLOW_DUR = 1.95;
    /** Пауза после полной посадки первой — затем отъезд и только остальные фронтальные клипсы */
    const CONS_PAUSE_AFTER_MACRO_SEATED = 0.38;
    const CONS_CLIP_PULLBACK_DUR = 1.55;
    /** Макро-клипса: смещение посадки относительно targetPos (+X вправо). Подгонка под паз — чуть левее расчёта */
    const CONS_MACRO_CLIP_SLOT_NUDGE_X = -0.0012;
    const CONS_MACRO_CLIP_SLOT_NUDGE_Y = -0.034;
    /** Доп. сдвиг макро-клипсы по Y (+ вверх, − вниз); не затрагивает остальные клипсы */
    const CONS_MACRO_CLIP_V_NUDGE = -0.008;
    /**
     * Смещение финальной Z макро-клипсы относительно tpM.z (+ — к камере, мельче; − — глубже в паз).
     * В clipPullT выставляем тот же tpM.z + bias, без щелчка наружу.
     */
    const CONS_MACRO_CLIP_Z_BIAS = -0.012;
    /** Базовый масштаб геометрии клипсы на стенке; итог: × CONS_CLIP_GLOBAL_SCALE_PERCENT / 100 */
    const CONS_CLIP_UNIFORM_SCALE = 0.765;
    /** 100 = как база; 110 = все клипсы на 10% крупнее (проценты от базового масштаба) */
    const CONS_CLIP_GLOBAL_SCALE_PERCENT = 102;
    const CONS_CLIP_SCALE = CONS_CLIP_UNIFORM_SCALE * (CONS_CLIP_GLOBAL_SCALE_PERCENT * 0.01);
    /**
     * Горизонтальные швы: фронт/спина — пары ближе к центру столбца по X; левый/правый торец — те же пары по Z к центру глубины стены.
     * Одно число для обоих (подбор, напр. 0.03). Макро — вертикальный клипс, не на этих рядах.
     */
    const CLIP_H_SEAM_PAIR_INSET = 0.032;
    /** Вертикальные швы на фронте/спине (x = ±STEP/2): пары по Y ближе к центру ряда */
    const CLIP_V_EDGE_PAIR_INSET = 0.032;
    const CLIP_BUILD_NUDGE = 0.07;
    const EASE_CLIP_BUILD = 'sine.inOut';
    const EASE_CLIP_INSERT = 'power4.in';
    /** Расстояние «разлёта» от слота — каждый cubik из своего направления */
    const EXPLODE_DIST = 2.35;
    const STAGGER_IN_ROW = 0.06;
    const ROW_GAP = 0.11;
    const PAUSE_BEFORE_CLIPS = 0.11;
    /** Палитра: void — белый #f4f4f4; bion — серый #7d7f7d; zen / клипсы — см. ниже */
    const CUBIK_VOID_WHITE = 0xf4f4f4;
    const CUBIK_ZEN_BEIGE = 0xe1b589;
    const CUBIK_GRAY = 0x7d7f7d;
    const CLIP_WHITE = 0xf4f4f4;

    /**
     * Поджатие крыльев по ширине — только макро-клипса (CONS_CLIP_MACRO_SLOW_DUR).
     * После rotClipUniform (π/2, π/2, 0) ширина в локальной Z.
     * Меньше значение → сильнее сжатие. 0.76 ≈ на 25% слабее прежнего 0.68 (глубина к 1).
     */
    const CLIP_LATERAL_SQUEEZE_MIN = 0.76;
    /** Доля медленной фазы посадки, за которую сжимаемся к минимуму */
    const CLIP_LATERAL_SQUEEZE_IN_FRAC = 0.42;

    function addClipBuildThenInsert(tl, mesh, tp, facet, startAt) {
        const p = mesh.position;
        if (facet === 'front') {
            tl.to(
                p,
                {
                    x: tp.x,
                    y: tp.y,
                    z: tp.z + Z_CLIP_START + CLIP_BUILD_NUDGE,
                    duration: D_CLIP_BUILD,
                    ease: EASE_CLIP_BUILD,
                },
                startAt
            );
            tl.to(
                p,
                { x: tp.x, y: tp.y, z: tp.z, duration: D_CLIP_INSERT, ease: EASE_CLIP_INSERT },
                startAt + D_CLIP_BUILD
            );
        } else if (facet === 'back') {
            tl.to(
                p,
                {
                    x: tp.x,
                    y: tp.y,
                    z: tp.z - Z_CLIP_START - CLIP_BUILD_NUDGE,
                    duration: D_CLIP_BUILD,
                    ease: EASE_CLIP_BUILD,
                },
                startAt
            );
            tl.to(
                p,
                { x: tp.x, y: tp.y, z: tp.z, duration: D_CLIP_INSERT, ease: EASE_CLIP_INSERT },
                startAt + D_CLIP_BUILD
            );
        } else if (facet === 'left') {
            tl.to(
                p,
                {
                    x: tp.x - Z_CLIP_START - CLIP_BUILD_NUDGE,
                    y: tp.y,
                    z: tp.z,
                    duration: D_CLIP_BUILD,
                    ease: EASE_CLIP_BUILD,
                },
                startAt
            );
            tl.to(
                p,
                { x: tp.x, y: tp.y, z: tp.z, duration: D_CLIP_INSERT, ease: EASE_CLIP_INSERT },
                startAt + D_CLIP_BUILD
            );
        } else if (facet === 'right') {
            tl.to(
                p,
                {
                    x: tp.x + Z_CLIP_START + CLIP_BUILD_NUDGE,
                    y: tp.y,
                    z: tp.z,
                    duration: D_CLIP_BUILD,
                    ease: EASE_CLIP_BUILD,
                },
                startAt
            );
            tl.to(
                p,
                { x: tp.x, y: tp.y, z: tp.z, duration: D_CLIP_INSERT, ease: EASE_CLIP_INSERT },
                startAt + D_CLIP_BUILD
            );
        }
    }

    (async () => {
        try {
            const [voidT, bionObj, zenRoot, clipsObj] = await Promise.all([
                loadVoidTemplateForWall(),
                loadObj('./assets/models/bion.obj'),
                loadZenCubikRoot(),
                loadObj('./assets/models/clips.obj'),
            ]);

            consFallback?.setAttribute('hidden', '');

            const consEnvTex = consScene.environment;
            const templates = new Map();
            const bionT = bionObj.clone(true);
            const zenT = zenRoot.clone(true);
            /** voidT: void.glb, выровнен под void.obj в loadVoidTemplateForWall. Bion — OBJ, равномерный масштаб (без артефактов нормалей). Zen — GLB по мешам. */
            normalizeObjectToUnitUniformMax(bionT);
            normalizeConstructionCubikToUnitBox(zenT);
            applyCubikMaterial(voidT, CUBIK_VOID_WHITE, consEnvTex);
            applyCubikMaterial(bionT, CUBIK_GRAY, consEnvTex);
            applyCubikMaterial(zenT, CUBIK_ZEN_BEIGE, consEnvTex);
            templates.set('void', voidT);
            templates.set('bion', bionT);
            templates.set('zen', zenT);

            /** После 1×1×1 все ячейки одинаковые */
            const STEP_X = 1;
            const STEP_Y = 1;

            const cubikRoots = [];

            function pickTemplate(iy) {
                if (iy === -1) return templates.get('void');
                if (iy === 0) return templates.get('bion');
                return templates.get('zen');
            }

            for (const iy of GRID) {
                const tpl = pickTemplate(iy);
                for (const ix of GRID) {
                    const cubik = tpl.clone(true);
                    const cubikTint =
                        iy === -1 ? CUBIK_VOID_WHITE : iy === 0 ? CUBIK_GRAY : CUBIK_ZEN_BEIGE;
                    cubik.traverse((ch) => {
                        if (ch.isMesh && ch.material) {
                            ch.material = ch.material.clone();
                            ch.material.color.setHex(cubikTint, THREE.SRGBColorSpace);
                        }
                    });
                    const ax = ix * STEP_X;
                    const ay = iy * STEP_Y;
                    cubik.userData.assembled = new THREE.Vector3(ax, ay, 0);
                    if (iy === -1) cubik.userData.assembled.y -= 0.5;
                    cubik.userData.ix = ix;
                    cubik.userData.iy = iy;
                    cubik.userData.sortY = cubik.userData.assembled.y;
                    cubik.userData.sortX = ax;
                    consWallRoot.add(cubik);
                    cubikRoots.push(cubik);
                }
            }

            /** Одна плоскость фасада: у Void/Bion/Zen разная геометрия — выравниваем по max Z */
            cubikRoots.forEach((c) => {
                c.position.copy(c.userData.assembled);
            });
            consWallRoot.updateMatrixWorld(true);
            let wallFrontZ = -Infinity;
            cubikRoots.forEach((c) => {
                const b = new THREE.Box3().setFromObject(c);
                wallFrontZ = Math.max(wallFrontZ, b.max.z);
            });
            cubikRoots.forEach((c) => {
                c.updateMatrixWorld(true);
                const b = new THREE.Box3().setFromObject(c);
                const dz = wallFrontZ - b.max.z;
                c.position.z += dz;
                c.userData.assembled.z += dz;
            });
            /** Стартовая позиция: каждый cubik — из своего угла (разные направления от слота) */
            /** Нижний ряд — снизу, верхний — сверху; средний — с заметным подъёмом снизу (как нижний), без «прыжка из ниоткуда» */
            const explodeDirs = [
                new THREE.Vector3(-1.15, -1.45, 0.95),
                new THREE.Vector3(0.05, -1.75, 1.05),
                new THREE.Vector3(1.15, -1.45, 0.95),
                new THREE.Vector3(-1.25, -1.38, 0.92),
                new THREE.Vector3(0.0, -1.48, 1.02),
                new THREE.Vector3(1.25, -1.38, 0.92),
                new THREE.Vector3(-1.15, 1.45, 0.95),
                new THREE.Vector3(0.05, 1.75, 1.05),
                new THREE.Vector3(1.15, 1.45, 0.95),
            ];
            cubikRoots.forEach((c) => {
                const ix = c.userData.ix;
                const iy = c.userData.iy;
                const idx = (iy + 1) * 3 + (ix + 1);
                const dir = explodeDirs[idx].clone().normalize().multiplyScalar(EXPLODE_DIST);
                c.userData.exploded = c.userData.assembled.clone().add(dir);
                c.position.copy(c.userData.exploded);
            });
            /**
             * Фронт стены и Z пазов — только из СОБРАННЫх позиций.
             * Раньше br здесь считали по «разлёту» → wallFrontZ раздувался, клипсы висели в стороне и не совпадали с пазами.
             */
            cubikRoots.forEach((c) => {
                c.position.copy(c.userData.assembled);
            });
            consWallRoot.updateMatrixWorld(true);
            let wallFrontZAssembled = -Infinity;
            let wallBackZAssembled = Infinity;
            let wallMinXAssembled = Infinity;
            let wallMaxXAssembled = -Infinity;
            cubikRoots.forEach((c) => {
                const b = new THREE.Box3().setFromObject(c);
                wallFrontZAssembled = Math.max(wallFrontZAssembled, b.max.z);
                wallBackZAssembled = Math.min(wallBackZAssembled, b.min.z);
                wallMinXAssembled = Math.min(wallMinXAssembled, b.min.x);
                wallMaxXAssembled = Math.max(wallMaxXAssembled, b.max.x);
            });
            cubikRoots.forEach((c) => {
                c.position.copy(c.userData.exploded);
            });
            consWallRoot.updateMatrixWorld(true);

            let clipGeom = mergeObjWorldGeometries(clipsObj);
            if (!clipGeom) {
                try {
                    clipGeom = mergeGeometries(
                        clipsObj.children
                            .filter((ch) => ch.isMesh && ch.geometry)
                            .map((ch) => ch.geometry.clone()),
                        false
                    );
                } catch {
                    clipGeom = null;
                }
            }
            if (!clipGeom) {
                clipGeom = new THREE.BoxGeometry(0.14, 0.05, 0.07);
            }

            const cb = new THREE.Box3().setFromBufferAttribute(clipGeom.attributes.position);
            const cs = cb.getSize(new THREE.Vector3());
            const maxClip = Math.max(cs.x, cs.y, cs.z, 0.001);
            const clipScale = 0.14 / maxClip;
            clipGeom.scale(clipScale, clipScale, clipScale);
            clipGeom.computeBoundingBox();
            clipGeom.center();
            clipGeom.computeBoundingSphere();

            const clipMatTemplate = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHex(CLIP_WHITE, THREE.SRGBColorSpace),
                roughness: CONS_CUBIK_PBR_ROUGH_NEW,
                metalness: CONS_CUBIK_PBR_METAL_NEW,
                envMap: consEnvTex,
                envMapIntensity: CONS_CUBIK_PBR_ENV_NEW,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -4,
            });

            const clipMeshes = [];
            const backClipMeshes = [];
            const leftClipMeshes = [];
            const rightClipMeshes = [];

            /** Глубже в паз: плоскость клипсы ближе к фасету cubik (ровнее с фасадом). */
            const zClipOnWall = wallFrontZAssembled - 0.028;
            const zClipOnWallBack = wallBackZAssembled + 0.028;
            /**
             * 24 клипса: по два гнезда на каждом внутреннем шве ячейки 1×1.
             * По инструкции cubiks — пазы на рёбрах; на стыке два cubiks дают общее гнездо.
             * Точки — на ¼ и ¾ длины ребра (не «угол ±0.38»), чтобы совпасть с разметкой пазов в модели.
             */
            const clipAlongEdge = Math.min(STEP_X, STEP_Y) * 0.25;
            /** Одна ориентация: клипса входит в стену фронтально (как в инструкции «Insert clip into the socket»). */
            const rotClipUniform = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(Math.PI / 2, Math.PI / 2, 0, 'XYZ')
            );
            /** Задний фасет: ось вставки и «верх» клипсы развернуты на 180° относительно фронта (вокруг Y). */
            const rotClipBack = new THREE.Quaternion()
                .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
                .multiply(rotClipUniform.clone());
            /** Боковые фасеты: ±90° к фронту; только 4 клипсы — по одному пазу на каждый горизонтальный шов слева и справа. */
            const qClipRotLeft = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                -Math.PI / 2
            );
            const qClipRotRight = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                Math.PI / 2
            );
            const rotClipLeft = qClipRotLeft.clone().multiply(rotClipUniform.clone());
            const rotClipRight = qClipRotRight.clone().multiply(rotClipUniform.clone());
            const CLIP_SIDE_INSET = 0.028;
            const zClipSideMid = (wallFrontZAssembled + wallBackZAssembled) * 0.5;
            const wallDepthZ = Math.max(wallFrontZAssembled - wallBackZAssembled, 0.08);
            const clipAlongZSide = wallDepthZ * 0.25;

            const fillClipTargets = (list, zPlane, quat) => {
                const push = (x, y) => {
                    list.push({
                        pos: new THREE.Vector3(x, y, zPlane),
                        quat: quat.clone(),
                    });
                };
                const vInset = CLIP_V_EDGE_PAIR_INSET;
                for (const iy of GRID) {
                    const yc = iy * STEP_Y;
                    push(-STEP_X / 2, yc - clipAlongEdge + vInset);
                    push(-STEP_X / 2, yc + clipAlongEdge - vInset);
                    push(STEP_X / 2, yc - clipAlongEdge + vInset);
                    push(STEP_X / 2, yc + clipAlongEdge - vInset);
                }
                const hInset = CLIP_H_SEAM_PAIR_INSET;
                for (const ix of GRID) {
                    const xc = ix * STEP_X;
                    push(xc - clipAlongEdge + hInset, -STEP_Y / 2);
                    push(xc + clipAlongEdge - hInset, -STEP_Y / 2);
                    push(xc - clipAlongEdge + hInset, STEP_Y / 2);
                    push(xc + clipAlongEdge - hInset, STEP_Y / 2);
                }
            };

            const frontTargets = [];
            const backTargets = [];
            const ySeamBottom = -STEP_Y / 2;
            const ySeamTop = STEP_Y / 2;
            const sideZInset = CLIP_H_SEAM_PAIR_INSET;
            const pushSideQuad = (list, xPlane, quatBase) => {
                const zm = zClipSideMid;
                const zh = clipAlongZSide;
                list.push(
                    {
                        pos: new THREE.Vector3(xPlane, ySeamBottom, zm - zh + sideZInset),
                        quat: quatBase.clone(),
                    },
                    {
                        pos: new THREE.Vector3(xPlane, ySeamBottom, zm + zh - sideZInset),
                        quat: quatBase.clone(),
                    },
                    {
                        pos: new THREE.Vector3(xPlane, ySeamTop, zm - zh + sideZInset),
                        quat: quatBase.clone(),
                    },
                    {
                        pos: new THREE.Vector3(xPlane, ySeamTop, zm + zh - sideZInset),
                        quat: quatBase.clone(),
                    }
                );
            };
            const leftTargets = [];
            const rightTargets = [];
            pushSideQuad(leftTargets, wallMinXAssembled + CLIP_SIDE_INSET, rotClipLeft);
            pushSideQuad(rightTargets, wallMaxXAssembled - CLIP_SIDE_INSET, rotClipRight);
            fillClipTargets(frontTargets, zClipOnWall, rotClipUniform);
            fillClipTargets(backTargets, zClipOnWallBack, rotClipBack);

            frontTargets.forEach((t, i) => {
                const m = new THREE.Mesh(clipGeom, clipMatTemplate.clone());
                m.name = `clip_front_${i}`;
                m.quaternion.copy(t.quat);
                m.userData.targetQuat = t.quat.clone();
                m.visible = false;
                m.position.set(t.pos.x, t.pos.y, t.pos.z + Z_CLIP_START);
                m.userData.targetPos = t.pos.clone();
                consWallRoot.add(m);
                clipMeshes.push(m);
            });

            backTargets.forEach((t, i) => {
                const m = new THREE.Mesh(clipGeom, clipMatTemplate.clone());
                m.name = `clip_back_${i}`;
                m.quaternion.copy(t.quat);
                m.userData.targetQuat = t.quat.clone();
                m.visible = false;
                m.position.set(t.pos.x, t.pos.y, t.pos.z - Z_CLIP_START);
                m.userData.targetPos = t.pos.clone();
                consWallRoot.add(m);
                backClipMeshes.push(m);
            });

            leftTargets.forEach((t, i) => {
                const m = new THREE.Mesh(clipGeom, clipMatTemplate.clone());
                m.name = `clip_left_${i}`;
                m.quaternion.copy(t.quat);
                m.userData.targetQuat = t.quat.clone();
                m.visible = false;
                m.position.set(t.pos.x - Z_CLIP_START, t.pos.y, t.pos.z);
                m.userData.targetPos = t.pos.clone();
                consWallRoot.add(m);
                leftClipMeshes.push(m);
            });

            rightTargets.forEach((t, i) => {
                const m = new THREE.Mesh(clipGeom, clipMatTemplate.clone());
                m.name = `clip_right_${i}`;
                m.quaternion.copy(t.quat);
                m.userData.targetQuat = t.quat.clone();
                m.visible = false;
                m.position.set(t.pos.x + Z_CLIP_START, t.pos.y, t.pos.z);
                m.userData.targetPos = t.pos.clone();
                consWallRoot.add(m);
                rightClipMeshes.push(m);
            });

            /** Центр вращения: сдвиг всей стенки, чтобы ось Y проходила через центр bbox cubiks */
            cubikRoots.forEach((c) => c.position.copy(c.userData.assembled));
            consWallRoot.updateMatrixWorld(true);
            const wallPivotBox = new THREE.Box3();
            cubikRoots.forEach((c) => {
                wallPivotBox.union(new THREE.Box3().setFromObject(c));
            });
            const wallPivotCenter = wallPivotBox.getCenter(new THREE.Vector3());
            cubikRoots.forEach((c) => {
                c.position.sub(wallPivotCenter);
                c.userData.assembled.sub(wallPivotCenter);
                c.userData.exploded.sub(wallPivotCenter);
            });
            const allWallClipMeshes = [
                ...clipMeshes,
                ...backClipMeshes,
                ...leftClipMeshes,
                ...rightClipMeshes,
            ];
            allWallClipMeshes.forEach((m) => {
                m.position.sub(wallPivotCenter);
                m.userData.targetPos.sub(wallPivotCenter);
                m.scale.setScalar(CONS_CLIP_SCALE);
            });

            function selectConstructionMacroClip(clips) {
                let topClipY = -Infinity;
                for (let ic = 0; ic < clips.length; ic++) {
                    topClipY = Math.max(topClipY, clips[ic].userData.targetPos.y);
                }
                let macro = clips[0];
                let bestX = -Infinity;
                for (let ic = 0; ic < clips.length; ic++) {
                    const cm = clips[ic];
                    const p0 = cm.userData.targetPos;
                    if (p0.y < topClipY - 0.002) continue;
                    if (p0.x > bestX) {
                        bestX = p0.x;
                        macro = cm;
                    }
                }
                return macro;
            }
            /** Макро не участвует в CLIP_V_EDGE_PAIR_INSET — возвращаем «верхнюю» Y пары + ручной nudge */
            {
                const m = selectConstructionMacroClip(clipMeshes);
                const tp = m.userData.targetPos;
                tp.y += CLIP_V_EDGE_PAIR_INSET + CONS_MACRO_CLIP_V_NUDGE;
                m.position.y += CLIP_V_EDGE_PAIR_INSET + CONS_MACRO_CLIP_V_NUDGE;
            }

            consWallRoot.traverse((o) => {
                if (o.isMesh) {
                    o.castShadow = true;
                    o.receiveShadow = true;
                }
            });

            function setCubikMeshesOpacity(cubik, alpha) {
                cubik.traverse((ch) => {
                    if (ch.isMesh && ch.material) {
                        const mat = ch.material;
                        mat.transparent = alpha < 0.999;
                        mat.opacity = alpha;
                    }
                });
            }

            function playBackClipFlyIn() {
                if (consBackClipTL) {
                    consBackClipTL.kill();
                    consBackClipTL = null;
                }
                consBackClipTL = gsap.timeline({
                    onComplete: () => {
                        consBackClipTL = null;
                        if (consWallRoot?.userData) consWallRoot.userData.consRotFastAfterBack = true;
                    },
                });
                backClipMeshes.forEach((m, i) => {
                    m.visible = true;
                    const tp = m.userData.targetPos;
                    addClipBuildThenInsert(consBackClipTL, m, tp, 'back', 0);
                });
            }

            function playLeftClipFlyIn() {
                if (consLeftClipTL) {
                    consLeftClipTL.kill();
                    consLeftClipTL = null;
                }
                consLeftClipTL = gsap.timeline({ onComplete: () => { consLeftClipTL = null; } });
                leftClipMeshes.forEach((m, i) => {
                    m.visible = true;
                    const tp = m.userData.targetPos;
                    addClipBuildThenInsert(consLeftClipTL, m, tp, 'left', 0);
                });
            }

            function playRightClipFlyIn() {
                if (consRightClipTL) {
                    consRightClipTL.kill();
                    consRightClipTL = null;
                }
                consRightClipTL = gsap.timeline({ onComplete: () => { consRightClipTL = null; } });
                rightClipMeshes.forEach((m, i) => {
                    m.visible = true;
                    const tp = m.userData.targetPos;
                    addClipBuildThenInsert(consRightClipTL, m, tp, 'right', 0);
                });
            }

            consWallRoot.userData.backClipMeshes = backClipMeshes;
            consWallRoot.userData.leftClipMeshes = leftClipMeshes;
            consWallRoot.userData.rightClipMeshes = rightClipMeshes;
            consWallRoot.userData.consIdleStartY = null;
            consWallRoot.userData.consLeftClipPlayed = false;
            consWallRoot.userData.consRightClipPlayed = false;
            consWallRoot.userData.consBackClipPlayed = false;
            consWallRoot.userData.consRotFastAfterBack = false;
            consWallRoot.userData.consClipMacroActive = false;
            consWallRoot.userData.macroClip = null;
            consWallRoot.userData.playBackClipFlyIn = playBackClipFlyIn;
            consWallRoot.userData.playLeftClipFlyIn = playLeftClipFlyIn;
            consWallRoot.userData.playRightClipFlyIn = playRightClipFlyIn;

            consAnimPayload = { cubikRoots, clipMeshes, backClipMeshes, leftClipMeshes, rightClipMeshes };

            function resetWallAnim() {
                if (consWallRoot) {
                    gsap.killTweensOf(consWallRoot.rotation);
                    consWallRoot.rotation.set(0, 0, 0);
                }
                if (consBuildTL) {
                    consBuildTL.kill();
                    consBuildTL = null;
                }
                if (consBackClipTL) {
                    consBackClipTL.kill();
                    consBackClipTL = null;
                }
                if (consLeftClipTL) {
                    consLeftClipTL.kill();
                    consLeftClipTL = null;
                }
                if (consRightClipTL) {
                    consRightClipTL.kill();
                    consRightClipTL = null;
                }
                consWallComplete = false;
                if (consWallRoot?.userData) {
                    consWallRoot.userData.consIdleStartY = null;
                    consWallRoot.userData.consLeftClipPlayed = false;
                    consWallRoot.userData.consRightClipPlayed = false;
                    consWallRoot.userData.consBackClipPlayed = false;
                    consWallRoot.userData.consRotFastAfterBack = false;
                    consWallRoot.userData.consClipMacroActive = false;
                    consWallRoot.userData.macroClip = null;
                }
                if (consCamera) {
                    gsap.killTweensOf(consCamera.position);
                    gsap.killTweensOf(consCamera);
                    consCamera.fov = CONS_CAMERA_FOV_WIDE;
                    consCamera.updateProjectionMatrix();
                    updateConsCameraFit();
                }
                [...clipMeshes, ...backClipMeshes, ...leftClipMeshes, ...rightClipMeshes].forEach((m) => {
                    gsap.killTweensOf(m.scale);
                    m.scale.setScalar(CONS_CLIP_SCALE);
                    const mat = m.material;
                    if (mat?.isMeshStandardMaterial) {
                        gsap.killTweensOf(mat);
                        mat.emissive.setHex(0x000000);
                        mat.emissiveIntensity = 0;
                        mat.roughness = CONS_CUBIK_PBR_ROUGH_NEW;
                        mat.metalness = CONS_CUBIK_PBR_METAL_NEW;
                        mat.envMapIntensity = CONS_CUBIK_PBR_ENV_NEW;
                    }
                });
                const firstRowIy = -1;
                cubikRoots.forEach((c) => {
                    c.traverse((ch) => {
                        if (ch.isMesh && ch.material) gsap.killTweensOf(ch.material);
                    });
                    c.position.copy(c.userData.exploded);
                    const isFirst = c.userData.iy === firstRowIy;
                    c.visible = isFirst;
                    setCubikMeshesOpacity(c, 0);
                });
                clipMeshes.forEach((m) => {
                    const tp = m.userData.targetPos;
                    m.visible = false;
                    m.position.set(tp.x, tp.y, tp.z + Z_CLIP_START);
                    if (m.userData.targetQuat) m.quaternion.copy(m.userData.targetQuat);
                });
                backClipMeshes.forEach((m) => {
                    const tp = m.userData.targetPos;
                    m.visible = false;
                    m.position.set(tp.x, tp.y, tp.z - Z_CLIP_START);
                    if (m.userData.targetQuat) m.quaternion.copy(m.userData.targetQuat);
                });
                leftClipMeshes.forEach((m) => {
                    const tp = m.userData.targetPos;
                    m.visible = false;
                    m.position.set(tp.x - Z_CLIP_START, tp.y, tp.z);
                    if (m.userData.targetQuat) m.quaternion.copy(m.userData.targetQuat);
                });
                rightClipMeshes.forEach((m) => {
                    const tp = m.userData.targetPos;
                    m.visible = false;
                    m.position.set(tp.x + Z_CLIP_START, tp.y, tp.z);
                    if (m.userData.targetQuat) m.quaternion.copy(m.userData.targetQuat);
                });
            }

            cubikRoots.forEach((c) => {
                c.position.copy(c.userData.assembled);
            });
            clipMeshes.forEach((m) => {
                const tp = m.userData.targetPos;
                m.position.set(tp.x, tp.y, tp.z);
            });
            backClipMeshes.forEach((m) => {
                const tp = m.userData.targetPos;
                m.position.set(tp.x, tp.y, tp.z);
                m.visible = true;
            });
            leftClipMeshes.forEach((m) => {
                const tp = m.userData.targetPos;
                m.position.set(tp.x, tp.y, tp.z);
                m.visible = true;
            });
            rightClipMeshes.forEach((m) => {
                const tp = m.userData.targetPos;
                m.position.set(tp.x, tp.y, tp.z);
                m.visible = true;
            });
            consWallRoot.updateMatrixWorld(true);
            const fitSph = new THREE.Box3().setFromObject(consWallRoot).getBoundingSphere(new THREE.Sphere());
            consWallRoot.userData.assembledFitRadius = fitSph.radius;

            backClipMeshes.forEach((m) => {
                m.visible = false;
                const tp = m.userData.targetPos;
                m.position.set(tp.x, tp.y, tp.z - Z_CLIP_START);
            });
            leftClipMeshes.forEach((m) => {
                m.visible = false;
                const tp = m.userData.targetPos;
                m.position.set(tp.x - Z_CLIP_START, tp.y, tp.z);
            });
            rightClipMeshes.forEach((m) => {
                m.visible = false;
                const tp = m.userData.targetPos;
                m.position.set(tp.x + Z_CLIP_START, tp.y, tp.z);
            });

            resetWallAnim();
            updateConsCameraFit();
            if (consRenderer?.compile) {
                consRenderer.compile(consScene, consCamera);
            }
            consRenderer.render(consScene, consCamera);

            /** Сводит onEnter + refresh + fallback в один rAF — без двойного playWallAnim */
            let consPlayEnqueueRaf = null;

            function playWallAnim() {
                if (!consAnimPayload) return;
                if (consPlayEnqueueRaf != null) {
                    cancelAnimationFrame(consPlayEnqueueRaf);
                    consPlayEnqueueRaf = null;
                }
                resetWallAnim();
                const tl = gsap.timeline({
                    onComplete: () => {
                        consWallComplete = true;
                        consBuildTL = null;
                        updateConsCameraFit();
                        if (consWallRoot?.userData) {
                            consWallRoot.userData.consIdleStartY = consWallRoot.rotation.y;
                            consWallRoot.userData.consLeftClipPlayed = false;
                            consWallRoot.userData.consRightClipPlayed = false;
                            consWallRoot.userData.consBackClipPlayed = false;
                            consWallRoot.userData.consRotFastAfterBack = false;
                            consWallRoot.userData.consClipMacroActive = false;
                            consWallRoot.userData.macroClip = null;
                        }
                    },
                });
                consBuildTL = tl;
                const { cubikRoots: cubiks, clipMeshes: clips } = consAnimPayload;
                const rowOf = (iy) =>
                    cubiks
                        .filter((c) => c.userData.iy === iy)
                        .sort((a, b) => a.userData.sortX - b.userData.sortX);
                const rowOrder = [-1, 0, 1];
                let rowT = 0;
                rowOrder.forEach((iy) => {
                    const row = rowOf(iy);
                    tl.add(() => {
                        row.forEach((c) => {
                            c.visible = true;
                            setCubikMeshesOpacity(c, 0);
                            c.traverse((ch) => {
                                if (ch.isMesh && ch.material) {
                                    const m = ch.material;
                                    gsap.to(m, {
                                        opacity: 1,
                                        duration: D_CUBIK_MOVE * 0.92,
                                        ease: 'power2.out',
                                        overwrite: 'auto',
                                        onComplete: () => {
                                            m.transparent = false;
                                        },
                                    });
                                }
                            });
                        });
                    }, rowT);
                    row.forEach((c, i) => {
                        const p = c.userData.assembled;
                        tl.to(
                            c.position,
                            { x: p.x, y: p.y, z: p.z, duration: D_CUBIK_MOVE, ease: 'sine.inOut' },
                            rowT + i * STAGGER_IN_ROW
                        );
                    });
                    rowT += (row.length - 1) * STAGGER_IN_ROW + D_CUBIK_MOVE + ROW_GAP;
                });
                const cubikEnd = rowT - ROW_GAP;
                const clipPhaseStart = cubikEnd + PAUSE_BEFORE_CLIPS;
                /** Макро: верхний ярус (макс. Y), среди них — правый верхний (макс. X) */
                const macroClip = selectConstructionMacroClip(clips);
                if (consWallRoot.userData) {
                    consWallRoot.userData.macroClip = macroClip;
                }
                const macroSlowT0 =
                    clipPhaseStart + CONS_CLIP_MACRO_NUDGE_DUR + CONS_CLIP_MACRO_FAST_DUR;
                const macroClipSeatedT = macroSlowT0 + CONS_CLIP_MACRO_SLOW_DUR;
                const clipPullT = macroClipSeatedT + CONS_PAUSE_AFTER_MACRO_SEATED;
                const fitDistZ = getConstructionCameraFitDistance(CONS_CAMERA_FOV_WIDE);

                const tpM = macroClip.userData.targetPos;
                const pM = macroClip.position;
                const tpMx = tpM.x + CONS_MACRO_CLIP_SLOT_NUDGE_X;
                const tpMy = tpM.y + CONS_MACRO_CLIP_SLOT_NUDGE_Y;
                const zMacroSeat = tpM.z + CONS_MACRO_CLIP_Z_BIAS;

                tl.add(() => {
                    clips.forEach((m) => {
                        m.visible = m === macroClip;
                    });
                    if (consWallRoot.userData) {
                        consWallRoot.userData.consClipMacroActive = true;
                    }
                    pM.x = tpMx;
                    pM.y = tpMy;
                    macroClip.scale.setScalar(CONS_CLIP_SCALE);
                    consCamera.fov = CONS_CLIP_MACRO_FOV;
                    consCamera.updateProjectionMatrix();
                    updateConsCameraRideClip(macroClip);
                }, clipPhaseStart);

                tl.to(
                    pM,
                    {
                        x: tpMx,
                        y: tpMy,
                        z: tpM.z + Z_CLIP_START + CLIP_BUILD_NUDGE,
                        duration: CONS_CLIP_MACRO_NUDGE_DUR,
                        ease: 'sine.inOut',
                    },
                    clipPhaseStart
                );
                tl.to(
                    pM,
                    {
                        x: tpMx,
                        y: tpMy,
                        z: tpM.z + 0.065 + CONS_MACRO_CLIP_Z_BIAS * 0.35,
                        duration: CONS_CLIP_MACRO_FAST_DUR,
                        ease: 'power1.in',
                    },
                    clipPhaseStart + CONS_CLIP_MACRO_NUDGE_DUR
                );
                tl.to(
                    pM,
                    {
                        x: tpMx,
                        y: tpMy,
                        z: zMacroSeat,
                        duration: CONS_CLIP_MACRO_SLOW_DUR,
                        ease: 'power2.out',
                    },
                    macroSlowT0
                );

                const macroSqIn = CONS_CLIP_MACRO_SLOW_DUR * CLIP_LATERAL_SQUEEZE_IN_FRAC;
                const macroSqOut = Math.max(CONS_CLIP_MACRO_SLOW_DUR - macroSqIn, 0.001);
                const macroSqZMin = CONS_CLIP_SCALE * CLIP_LATERAL_SQUEEZE_MIN;
                tl.to(
                    macroClip.scale,
                    { z: macroSqZMin, duration: macroSqIn, ease: 'power2.in' },
                    macroSlowT0
                );
                tl.to(
                    macroClip.scale,
                    { z: CONS_CLIP_SCALE, duration: macroSqOut, ease: 'power2.out' },
                    macroSlowT0 + macroSqIn
                );

                tl.add(() => {
                    pM.z = tpM.z + CONS_MACRO_CLIP_Z_BIAS;
                    if (consWallRoot.userData) {
                        consWallRoot.userData.consClipMacroActive = false;
                    }
                    clips.forEach((m) => {
                        if (m !== macroClip) m.visible = true;
                    });
                }, clipPullT);

                tl.to(
                    consCamera.position,
                    {
                        x: 0,
                        y: 0.12,
                        z: fitDistZ,
                        duration: CONS_CLIP_PULLBACK_DUR,
                        ease: 'power2.inOut',
                        onUpdate: () => {
                            consCamera.lookAt(0, 0.02, 0);
                        },
                    },
                    clipPullT
                );
                const consFovTween = { f: CONS_CLIP_MACRO_FOV };
                tl.to(
                    consFovTween,
                    {
                        f: CONS_CAMERA_FOV_WIDE,
                        duration: CONS_CLIP_PULLBACK_DUR,
                        ease: 'power2.inOut',
                        onUpdate: () => {
                            consCamera.fov = consFovTween.f;
                            consCamera.updateProjectionMatrix();
                        },
                    },
                    clipPullT
                );

                clips.forEach((m) => {
                    if (m === macroClip) return;
                    const tp = m.userData.targetPos;
                    addClipBuildThenInsert(tl, m, tp, 'front', clipPullT);
                });
            }

            /** Цикл «полный оборот → перезапуск»: playWallAnim уже делает resetWallAnim в начале */
            consLoopRestartFn = () => {
                if (!consAnimPayload || !consConstructionVisible) return;
                playWallAnim();
            };

            let consScrollST = null;

            /**
             * Блокируем только «угол снизу» при почти нулевом скролле (баннер + кусок блока без долистывания).
             * Не делаем один жёсткий порог по r.top — иначе onEnter срабатывает раньше, чем условие, и повторного onEnter нет → белый кадр.
             */
            function shouldAllowConstructionAutoplay() {
                if (window.location.hash === '#construction') return true;
                const sec = document.getElementById('construction');
                if (!sec) return false;
                const r = sec.getBoundingClientRect();
                const vh = window.innerHeight || 1;
                if (window.scrollY < 20 && r.top > vh * 0.42) return false;
                return r.top <= vh * 0.62;
            }

            let consScrollRetryRaf = null;
            function onConsWindowScrollRetry() {
                if (consScrollRetryRaf != null) return;
                consScrollRetryRaf = requestAnimationFrame(() => {
                    consScrollRetryRaf = null;
                    if (!consScrollST) return;
                    syncConstructionIfStuck(consScrollST);
                });
            }

            /** Выход из зоны: стоп GSAP + сброс + кадр */
            function pauseConstructionSection() {
                consConstructionVisible = false;
                resetWallAnim();
                if (consRenderer && consScene && consCamera) {
                    consRenderer.render(consScene, consCamera);
                }
            }

            /**
             * Не вызывать pause на каждый onLeave — микропрокрутка и ScrollTrigger.refresh()
             * (аккордеон, resize) дают кратковременный !isActive → анимация «падала».
             * Пауза только если секция реально вне зоны после задержки; отмена при повторном входе.
             */
            const CONS_PAUSE_DEBOUNCE_MS = 420;
            let consPauseDebounceTimer = null;
            function cancelConstructionPauseDebounce() {
                if (consPauseDebounceTimer != null) {
                    clearTimeout(consPauseDebounceTimer);
                    consPauseDebounceTimer = null;
                }
            }
            function schedulePauseConstructionSection() {
                cancelConstructionPauseDebounce();
                consPauseDebounceTimer = setTimeout(() => {
                    consPauseDebounceTimer = null;
                    if (consScrollST?.isActive) return;
                    pauseConstructionSection();
                }, CONS_PAUSE_DEBOUNCE_MS);
            }

            /** Вход в зону / восстановление после refresh: всегда с нуля (playWallAnim сам делает reset) */
            function enqueueConstructionPlay() {
                if (!shouldAllowConstructionAutoplay()) return;
                if (consPlayEnqueueRaf != null) return;
                consPlayEnqueueRaf = requestAnimationFrame(() => {
                    consPlayEnqueueRaf = null;
                    playWallAnim();
                });
            }

            /**
             * После любого ScrollTrigger.refresh() (аккордеон, resize) onEnter может не вызваться повторно,
             * хотя секция всё ещё в зоне — тогда анимация «зависает» на сброшенном кадре.
             */
            function syncConstructionIfStuck(self) {
                if (!shouldAllowConstructionAutoplay()) return;
                if (!self?.isActive) return;
                consConstructionVisible = true;
                if (consBuildTL) return;
                if (consWallComplete) return;
                enqueueConstructionPlay();
            }

            consScrollST = ScrollTrigger.create({
                trigger: '#construction',
                /** Ниже, чем 70%: меньше шансов «уже в зоне» при первом кадре с куском секции внизу экрана */
                start: 'top 88%',
                end: 'bottom 25%',
                onEnter: () => {
                    cancelConstructionPauseDebounce();
                    consConstructionVisible = true;
                    enqueueConstructionPlay();
                },
                onEnterBack: () => {
                    cancelConstructionPauseDebounce();
                    consConstructionVisible = true;
                    enqueueConstructionPlay();
                },
                onLeave: schedulePauseConstructionSection,
                onLeaveBack: schedulePauseConstructionSection,
            });

            consConstructionVisible = Boolean(consScrollST?.isActive);

            const consGlobalRefreshHandler = () => {
                if (!consScrollST) return;
                /** Не ставить false при refresh — иначе ложный сброс при пересчёте триггеров (аккордеон и т.д.) */
                if (consScrollST.isActive) {
                    consConstructionVisible = true;
                }
                syncConstructionIfStuck(consScrollST);
            };
            ScrollTrigger.addEventListener('refresh', consGlobalRefreshHandler);
            window.addEventListener('scroll', onConsWindowScrollRetry, { passive: true });

            requestAnimationFrame(() => {
                ScrollTrigger.refresh();
                requestAnimationFrame(() => {
                    ScrollTrigger.refresh();
                    if (consScrollST) {
                        consConstructionVisible = Boolean(consScrollST.isActive);
                        syncConstructionIfStuck(consScrollST);
                    }
                });
            });
        } catch (e) {
            console.warn('Construction wall:', e);
            consLoopRestartFn = null;
            consFallback?.removeAttribute('hidden');
        }
    })();
}

initConstructionWall();

// =============================================
// Section titles entrance
// =============================================
gsap.utils.toArray('.section-title').forEach(t => {
    gsap.from(t, {
        opacity: 0, y: 50, duration: 0.45, ease: 'power2.out',
        scrollTrigger: { trigger: t, start: 'top 85%', once: true },
    });
});
gsap.utils.toArray('.section-sub').forEach(s => {
    gsap.from(s, {
        opacity: 0, y: 30, duration: 0.35, ease: 'power2.out',
        scrollTrigger: { trigger: s, start: 'top 88%', once: true },
    });
});

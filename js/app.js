import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

gsap.registerPlugin(ScrollTrigger);

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
// Hero entrance
// =============================================
const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
heroTL
    .to('.hero-title', { opacity: 1, y: 0, duration: 0.5 })
    .to('.hero-subtitle', { opacity: 1, y: 0, duration: 0.4 }, '-=.25')
    .to('.hero-canvas-wrap', { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.2)' }, '-=.2')
    .to('.hero-actions', { opacity: 1, y: 0, duration: 0.35 }, '-=.3');

// =============================================
// Three.js — 4 rotating models: Bion, Void, Zen, Zen_2
// =============================================
const canvas = document.getElementById('heroCanvas');
const canvasWrap = document.getElementById('heroCanvasWrap');
const loaderEl = document.getElementById('heroLoader');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(28, 2.5, 0.1, 500);
camera.position.set(0, 1.2, 34);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(6, 10, 8);
scene.add(dirLight);
const fill = new THREE.DirectionalLight(0xffffff, 0.3);
fill.position.set(-5, 3, -4);
scene.add(fill);

const sharedMaterial = new THREE.MeshStandardMaterial({
    color: 0x7D7F7D,
    roughness: 0.6,
    metalness: 0.05,
});

const MODEL_SCALE = 5.2;
/** Зазор между «дисками» вращения соседних моделей (мир), с запасом от пересечений */
const HERO_SPIN_GAP = 2.8;

const modelFiles = [
    { file: './assets/models/bion.glb', fixGeometry: false, format: 'gltf' },
    { file: './assets/models/void.glb', fixGeometry: false, format: 'gltf' },
    { file: './assets/models/zen.obj', fixGeometry: false },
    /** GLB точнее и детальнее OBJ */
    { file: './assets/models/zen-2.glb', fixGeometry: true, format: 'gltf' },
];

const loadedModels = new Array(modelFiles.length).fill(null);
const objLoader = new OBJLoader();
const dracoHero = new DRACOLoader();
dracoHero.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
const heroGltfLoader = new GLTFLoader();
heroGltfLoader.setDRACOLoader(dracoHero);
let modelsLoaded = 0;

function onModelReady() {
    modelsLoaded++;
    if (modelsLoaded >= modelFiles.length) {
        const groups = loadedModels.filter(Boolean);
        layoutHeroModels(groups);
        loaderEl?.classList.add('hidden');
    }
}

function cleanMeshGeometry(mesh, fixGeometry) {
    if (!mesh.isMesh || !mesh.geometry?.isBufferGeometry) return;
    let g = mesh.geometry;
    if (fixGeometry) {
        g = mergeVertices(g, 0.001);
        g.computeVertexNormals();
        mesh.geometry = g;
    }
}

/**
 * Группа вращается вокруг Y; меш внутри отцентрован в (0,0,0) и без «левого» quaternion из OBJ —
 * тогда все кубы визуально крутятся в одну сторону с одинаковой скоростью.
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
    scene.add(group);
    return group;
}

/** Радиус «диска» вращения в плоскости XZ (худший случай при повороте вокруг Y). */
function spinRadiusXZ(group) {
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const hx = size.x / 2;
    const hz = size.z / 2;
    return Math.sqrt(hx * hx + hz * hz) * 1.06;
}

function layoutHeroModels(groups) {
    const n = groups.length;
    if (n === 0) return;

    const radii = groups.map(spinRadiusXZ);
    const centersX = [0];
    for (let i = 1; i < n; i++) {
        centersX[i] = centersX[i - 1] + radii[i - 1] + radii[i] + HERO_SPIN_GAP;
    }
    const rowMid = (centersX[0] + centersX[n - 1]) / 2;

    groups.forEach((group, i) => {
        group.position.x = centersX[i] - rowMid;
        group.position.z = 0;
    });

    groups.forEach((group) => {
        group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(group);
        group.position.y -= box.min.y;
    });
}

function loadHeroFallbackBox(index) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), sharedMaterial.clone());
    loadedModels[index] = buildHeroModelGroup(mesh, false);
    onModelReady();
}

modelFiles.forEach(({ file, fixGeometry, format }, index) => {
    if (format === 'gltf') {
        heroGltfLoader.load(
            file,
            (gltf) => {
                loadedModels[index] = buildHeroModelGroup(gltf.scene, fixGeometry);
                onModelReady();
            },
            undefined,
            () => loadHeroFallbackBox(index)
        );
    } else {
        objLoader.load(
            file,
            (obj) => {
                loadedModels[index] = buildHeroModelGroup(obj, fixGeometry);
                onModelReady();
            },
            undefined,
            () => loadHeroFallbackBox(index)
        );
    }
});

function resizeRenderer() {
    const w = canvasWrap.clientWidth;
    const h = canvasWrap.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}
resizeRenderer();
window.addEventListener('resize', resizeRenderer);

let heroRotationY = 0;
const HERO_ROT_SPEED = 0.009;

let asmRenderer;
let asmScene;
let asmCamera;
let asmModelRoot;
let asmAssemblyComplete = false;

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

const CONS_LOOP_TURN_RAD = Math.PI * 2;

const _consLeftFaceN = new THREE.Vector3();
const _consRightFaceN = new THREE.Vector3();
const _consToCamera = new THREE.Vector3();

/** Задние клипсы — по накопленному повороту от конца сборки (135°) */
const CONS_BACK_CLIP_AT_RAD = THREE.MathUtils.degToRad(135);
/** Боковые клипсы — когда внешняя нормаль грани смотрит на камеру (dot с направлением на камеру) */
const CONS_SIDE_FACE_DOT = 0.52;

/** Construction: по 135° чередуем скорость — быстро к вставке задних клипс, потом обычно, снова быстро… */
const CONS_WALL_SEGMENT_RAD = THREE.MathUtils.degToRad(135);
const CONS_WALL_ROT_NORMAL = 0.0028;
const CONS_WALL_ROT_FAST = CONS_WALL_ROT_NORMAL * 2.6;

(function animate() {
    requestAnimationFrame(animate);
    heroRotationY += HERO_ROT_SPEED;
    for (let i = 0; i < loadedModels.length; i++) {
        const g = loadedModels[i];
        if (g) g.rotation.y = heroRotationY;
    }
    renderer.render(scene, camera);
    if (asmRenderer && asmScene && asmCamera) {
        if (asmAssemblyComplete && asmModelRoot) {
            asmModelRoot.rotation.y += 0.0056;
        }
        asmRenderer.render(asmScene, asmCamera);
    }
    if (consRenderer && consScene && consCamera) {
        if (consWallComplete && consWallRoot) {
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
                _consLeftFaceN.set(-1, 0, 0).applyQuaternion(consWallRoot.quaternion);
                _consRightFaceN.set(1, 0, 0).applyQuaternion(consWallRoot.quaternion);
                _consToCamera.copy(consCamera.position).normalize();
                const dotL = _consLeftFaceN.dot(_consToCamera);
                const dotR = _consRightFaceN.dot(_consToCamera);
                if (
                    ud.leftClipMeshes?.length &&
                    !ud.consLeftClipPlayed &&
                    dotL > CONS_SIDE_FACE_DOT &&
                    dotL > dotR
                ) {
                    ud.consLeftClipPlayed = true;
                    ud.playLeftClipFlyIn?.();
                }
                if (
                    ud.rightClipMeshes?.length &&
                    !ud.consRightClipPlayed &&
                    dotR > CONS_SIDE_FACE_DOT &&
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
// Color Picker
// =============================================
const colorNames = {
    '#7D7F7D': 'Серый',
    '#E1B589': 'Бежевый',
    '#0A6F3C': 'Зелёный',
    '#F4F4F4': 'Белый',
    '#0A0A0A': 'Чёрный',
};

document.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');

        const hex = sw.dataset.color;
        const target = new THREE.Color(hex);
        document.getElementById('colorLabel').textContent = colorNames[hex] || '';

        loadedModels.forEach((root) => {
            if (!root) return;
            root.traverse((child) => {
                if (child.isMesh && child.material?.color) {
                    gsap.to(child.material.color, {
                        r: target.r, g: target.g, b: target.b,
                        duration: 0.4,
                        ease: 'power2.inOut',
                        overwrite: 'auto',
                    });
                }
            });
        });
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
// Assembly — Bion.glb: грани сходятся в куб (ScrollTrigger)
// =============================================
const asmCanvas = document.getElementById('assemblyCanvas');
const asmStage = document.getElementById('assemblyStage');
const asmFallback = document.getElementById('assemblyFallback');
const assemblyReplayBtn = document.getElementById('assemblyReplayBtn');

let asmBuildTL = null;
/** Заполняется после загрузки bion.glb — для кнопки «ещё раз» */
let assemblyMeshesRef = null;
/** Сборка граней: 1.5 = на 50% медленнее базовой скорости */
const ASM_BUILD_TIME_SCALE = 1.5;

function resetAssemblyToExploded(meshes) {
    if (asmBuildTL) {
        asmBuildTL.kill();
        asmBuildTL = null;
    }
    asmAssemblyComplete = false;
    if (!meshes?.length) return;
    meshes.forEach((mesh) => {
        const ex = mesh.userData.explodedPos;
        if (ex) mesh.position.copy(ex);
    });
}

function playAssemblyBuild(meshes) {
    if (!meshes?.length) return;
    if (asmBuildTL) asmBuildTL.kill();
    asmAssemblyComplete = false;
    asmBuildTL = gsap.timeline({
        defaults: { duration: 1.175 * ASM_BUILD_TIME_SCALE, ease: 'power2.inOut' },
        onComplete: () => {
            asmAssemblyComplete = true;
            asmBuildTL = null;
        },
    });
    const asmStagger = 0.05 * ASM_BUILD_TIME_SCALE;
    meshes.forEach((mesh, i) => {
        const p = mesh.userData.assembledPos;
        if (!p) return;
        asmBuildTL.to(
            mesh.position,
            { x: p.x, y: p.y, z: p.z },
            i * asmStagger
        );
    });
}

function initAssemblyViewer() {
    if (!asmCanvas || !asmStage) return;

    asmScene = new THREE.Scene();
    asmScene.background = new THREE.Color(0xffffff);

    asmCamera = new THREE.PerspectiveCamera(42, 1, 0.08, 200);
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

    const faceMat = new THREE.MeshStandardMaterial({
        color: 0x7d7f7d,
        roughness: 0.58,
        metalness: 0.04,
    });

    /** Дистанция только по собранному кубу — иначе «взрыв» раздувает bbox и камера уезжает в бесконечность. */
    function updateAssemblyCameraFit() {
        if (!asmCamera || !asmModelRoot || asmModelRoot.children.length === 0) return;
        const r0 = asmModelRoot.userData.assembledBoundingRadius;
        if (r0 == null || !isFinite(r0) || r0 <= 0) return;

        const padding = 1.22;
        const r = r0 * padding;
        const vHalf = THREE.MathUtils.degToRad(asmCamera.fov * 0.5);
        const distV = r / Math.tan(vHalf);
        const distH = r / (Math.tan(vHalf) * Math.max(asmCamera.aspect, 0.001));
        const dist = Math.max(distV, distH, 0.5);

        asmCamera.position.set(0, 0.22, dist);
        asmCamera.lookAt(0, 0, 0);
        asmCamera.near = Math.max(0.02, dist * 0.02);
        asmCamera.far = Math.max(200, dist * 4);
        asmCamera.updateProjectionMatrix();
    }

    function resizeAsm() {
        const w = asmStage.clientWidth;
        const h = asmStage.clientHeight;
        if (w < 2 || h < 2) return;
        asmRenderer.setSize(w, h, false);
        asmCamera.aspect = w / h;
        asmCamera.updateProjectionMatrix();
        updateAssemblyCameraFit();
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
            asmFallback?.setAttribute('hidden', '');

            const root = gltf.scene;
            root.traverse((c) => {
                if (c.isMesh || c.isSkinnedMesh) {
                    c.material = faceMat.clone();
                }
            });

            const box = new THREE.Box3().setFromObject(root);
            const size = box.getSize(new THREE.Vector3());
            const maxD = Math.max(size.x, size.y, size.z, 0.001);
            const scale = 2.38 / maxD;
            root.scale.setScalar(scale);

            box.setFromObject(root);
            const center = box.getCenter(new THREE.Vector3());
            root.position.sub(center);

            asmModelRoot.add(root);

            const meshes = [];
            root.updateMatrixWorld(true);
            root.traverse((c) => {
                if ((c.isMesh || c.isSkinnedMesh) && c.geometry) meshes.push(c);
            });

            if (meshes.length === 0) {
                asmFallback?.removeAttribute('hidden');
                return;
            }

            meshes.forEach((m) => {
                m.userData.assembledPos = m.position.clone();
            });

            asmModelRoot.updateMatrixWorld(true);
            const assembledSphere = new THREE.Box3()
                .setFromObject(asmModelRoot)
                .getBoundingSphere(new THREE.Sphere());
            asmModelRoot.userData.assembledBoundingRadius = assembledSphere.radius;

            const cubeC = new THREE.Box3()
                .setFromObject(asmModelRoot)
                .getCenter(new THREE.Vector3());

            const expandW = Math.max(2.4, maxD * scale * 0.95);

            meshes.forEach((mesh, idx) => {
                mesh.updateMatrixWorld(true);
                const assembledWorld = new THREE.Vector3();
                mesh.getWorldPosition(assembledWorld);

                const fb = new THREE.Box3().setFromObject(mesh);
                const faceCtr = fb.getCenter(new THREE.Vector3());

                let dir = faceCtr.clone().sub(cubeC);
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

                const explodedWorldOrigin = assembledWorld.clone().addScaledVector(dir, expandW);

                mesh.parent.updateMatrixWorld(true);
                const invParent = new THREE.Matrix4().copy(mesh.parent.matrixWorld).invert();
                const explodedLocal = explodedWorldOrigin.clone().applyMatrix4(invParent);

                mesh.position.copy(explodedLocal);
                mesh.userData.explodedPos = mesh.position.clone();
            });

            updateAssemblyCameraFit();

            assemblyMeshesRef = meshes;
            assemblyReplayBtn?.removeAttribute('disabled');
            assemblyReplayBtn?.removeAttribute('aria-disabled');

            ScrollTrigger.create({
                trigger: '#assembly',
                start: 'top 70%',
                end: 'bottom 25%',
                onEnter: () => playAssemblyBuild(meshes),
                onEnterBack: () => playAssemblyBuild(meshes),
                onLeave: () => resetAssemblyToExploded(meshes),
                onLeaveBack: () => resetAssemblyToExploded(meshes),
            });
        },
        undefined,
        () => {
            asmFallback?.removeAttribute('hidden');
        }
    );
}

initAssemblyViewer();

assemblyReplayBtn?.addEventListener('click', () => {
    if (!assemblyMeshesRef?.length) return;
    resetAssemblyToExploded(assemblyMeshesRef);
    playAssemblyBuild(assemblyMeshesRef);
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

/** Центрирует и тянет bbox до 1×1×1 по осям — соседние кубы в сетке стык в стык без зазоров */
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

function applyCubeMaterial(obj, hex) {
    obj.traverse((child) => {
        if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
                color: hex,
                roughness: 0.56,
                metalness: 0.05,
            });
        }
    });
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
    });
    consRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    consRenderer.setClearColor(0xffffff, 1);
    consRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    consRenderer.toneMappingExposure = 1.1;

    consScene.add(new THREE.AmbientLight(0xffffff, 0.78));
    const cDir = new THREE.DirectionalLight(0xffffff, 1.05);
    cDir.position.set(5, 10, 8);
    consScene.add(cDir);
    const cFill = new THREE.DirectionalLight(0xffffff, 0.35);
    cFill.position.set(-5, 4, -6);
    consScene.add(cFill);

    consWallRoot = new THREE.Group();
    consWallRoot.rotation.order = 'YXZ';
    consScene.add(consWallRoot);

    function updateConsCameraFit() {
        if (!consCamera || !consWallRoot) return;
        consWallRoot.updateMatrixWorld(true);
        const r0 = consWallRoot.userData.assembledFitRadius;
        let r;
        if (r0 != null && isFinite(r0) && r0 > 0) {
            r = r0 * 1.22;
        } else {
            const box = new THREE.Box3().setFromObject(consWallRoot);
            if (box.isEmpty() || !isFinite(box.min.x)) return;
            const sp = box.getBoundingSphere(new THREE.Sphere());
            if (!isFinite(sp.radius) || sp.radius <= 0) return;
            r = sp.radius * 1.22;
        }
        const vHalf = THREE.MathUtils.degToRad(consCamera.fov * 0.5);
        const distV = r / Math.tan(vHalf);
        const distH = r / (Math.tan(vHalf) * Math.max(consCamera.aspect, 0.001));
        const dist = Math.max(distV, distH, 0.5);
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
        updateConsCameraFit();
    }
    resizeCons();
    window.addEventListener('resize', resizeCons);

    const loadObj = (url) =>
        new Promise((resolve, reject) => {
            objLoader.load(url, resolve, undefined, reject);
        });

    const GRID = [-1, 0, 1];
    const Z_CLIP_START = 1.45;
    const D_CUBE_MOVE = 0.875;
    /** Клипсы: 0.5 с лёгким «набором» (отход от слота), затем короткая ускоренная посадка */
    const D_CLIP_BUILD = 0.5;
    /** Вставка в паз — ~в 2× дольше (скорость примерно на 50% ниже) */
    const D_CLIP_INSERT = 0.34;
    const CLIP_BUILD_NUDGE = 0.07;
    const EASE_CLIP_BUILD = 'sine.inOut';
    const EASE_CLIP_INSERT = 'power4.in';
    /** Расстояние «разлёта» от слота — каждый куб из своего направления */
    const EXPLODE_DIST = 2.35;
    const STAGGER_IN_ROW = 0.06;
    const ROW_GAP = 0.11;
    const PAUSE_BEFORE_CLIPS = 0.11;
    /** Один серый для всех типов граней */
    const CUBE_GRAY = 0x7d7f7d;
    const CLIP_WHITE = 0xf2f2f2;

    function addClipBuildThenInsert(tl, mesh, tp, face, startAt) {
        const p = mesh.position;
        if (face === 'front') {
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
        } else if (face === 'back') {
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
        } else if (face === 'left') {
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
        } else if (face === 'right') {
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
            const [voidObj, bionObj, zenObj, clipsObj] = await Promise.all([
                loadObj('./assets/models/void.obj'),
                loadObj('./assets/models/bion.obj'),
                loadObj('./assets/models/zen.obj'),
                loadObj('./assets/models/clips.obj'),
            ]);

            consFallback?.setAttribute('hidden', '');

            const templates = new Map();
            const voidT = voidObj.clone(true);
            const bionT = bionObj.clone(true);
            const zenT = zenObj.clone(true);
            [voidT, bionT, zenT].forEach(normalizeObjectToUnitAxesBox);
            applyCubeMaterial(voidT, CUBE_GRAY);
            applyCubeMaterial(bionT, CUBE_GRAY);
            applyCubeMaterial(zenT, CUBE_GRAY);
            templates.set('void', voidT);
            templates.set('bion', bionT);
            templates.set('zen', zenT);

            /** После 1×1×1 все ячейки одинаковые */
            const STEP_X = 1;
            const STEP_Y = 1;

            const cubeRoots = [];

            function pickTemplate(iy) {
                if (iy === -1) return templates.get('void');
                if (iy === 0) return templates.get('bion');
                return templates.get('zen');
            }

            for (const iy of GRID) {
                const tpl = pickTemplate(iy);
                for (const ix of GRID) {
                    const cube = tpl.clone(true);
                    cube.traverse((ch) => {
                        if (ch.isMesh && ch.material) {
                            ch.material = ch.material.clone();
                            ch.material.color.setHex(CUBE_GRAY);
                        }
                    });
                    const ax = ix * STEP_X;
                    const ay = iy * STEP_Y;
                    cube.userData.assembled = new THREE.Vector3(ax, ay, 0);
                    cube.userData.ix = ix;
                    cube.userData.iy = iy;
                    cube.userData.sortY = ay;
                    cube.userData.sortX = ax;
                    consWallRoot.add(cube);
                    cubeRoots.push(cube);
                }
            }

            /** Одна плоскость фасада: у Void/Bion/Zen разная геометрия — выравниваем по max Z */
            cubeRoots.forEach((c) => {
                c.position.copy(c.userData.assembled);
            });
            consWallRoot.updateMatrixWorld(true);
            let wallFrontZ = -Infinity;
            cubeRoots.forEach((c) => {
                const b = new THREE.Box3().setFromObject(c);
                wallFrontZ = Math.max(wallFrontZ, b.max.z);
            });
            cubeRoots.forEach((c) => {
                c.updateMatrixWorld(true);
                const b = new THREE.Box3().setFromObject(c);
                const dz = wallFrontZ - b.max.z;
                c.position.z += dz;
                c.userData.assembled.z += dz;
            });
            /** Стартовая позиция: каждый куб — из своего угла (разные направления от слота) */
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
            cubeRoots.forEach((c) => {
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
            cubeRoots.forEach((c) => {
                c.position.copy(c.userData.assembled);
            });
            consWallRoot.updateMatrixWorld(true);
            let wallFrontZAssembled = -Infinity;
            let wallBackZAssembled = Infinity;
            let wallMinXAssembled = Infinity;
            let wallMaxXAssembled = -Infinity;
            cubeRoots.forEach((c) => {
                const b = new THREE.Box3().setFromObject(c);
                wallFrontZAssembled = Math.max(wallFrontZAssembled, b.max.z);
                wallBackZAssembled = Math.min(wallBackZAssembled, b.min.z);
                wallMinXAssembled = Math.min(wallMinXAssembled, b.min.x);
                wallMaxXAssembled = Math.max(wallMaxXAssembled, b.max.x);
            });
            cubeRoots.forEach((c) => {
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
            const clipCtr = clipGeom.boundingBox.getCenter(new THREE.Vector3());
            clipGeom.translate(-clipCtr.x, -clipCtr.y, -clipCtr.z);
            clipGeom.computeBoundingSphere();

            const CLIP_BASE_ROUGHNESS = 0.3;
            const CLIP_BASE_METALNESS = 0.14;
            const clipMatTemplate = new THREE.MeshStandardMaterial({
                color: CLIP_WHITE,
                roughness: CLIP_BASE_ROUGHNESS,
                metalness: CLIP_BASE_METALNESS,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0,
            });

            const clipMeshes = [];
            const backClipMeshes = [];
            const leftClipMeshes = [];
            const rightClipMeshes = [];

            /** Глубже в паз: плоскость клипсы ближе к грани куба (ровнее с фасадом). */
            const zClipOnWall = wallFrontZAssembled - 0.028;
            const zClipOnWallBack = wallBackZAssembled + 0.028;
            /**
             * 24 клипса: по два гнезда на каждом внутреннем шве ячейки 1×1.
             * По инструкции кубики — пазы на рёбрах; на стыке два куба дают общее гнездо.
             * Точки — на ¼ и ¾ длины ребра (не «угол ±0.38»), чтобы совпасть с разметкой пазов в модели.
             */
            const clipAlongEdge = Math.min(STEP_X, STEP_Y) * 0.25;
            /** Одна ориентация: клипса входит в стену фронтально (как в инструкции «Insert clip into the socket»). */
            const rotClipUniform = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(Math.PI / 2, Math.PI / 2, 0, 'XYZ')
            );
            /** Задняя грань: ось вставки и «верх» клипсы развернуты на 180° относительно фронта (вокруг Y). */
            const rotClipBack = new THREE.Quaternion()
                .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
                .multiply(rotClipUniform.clone());
            /** Боковые грани: ±90° к фронту; только 4 клипсы — по одному пазу на каждый горизонтальный шов слева и справа. */
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
                for (const iy of GRID) {
                    const yc = iy * STEP_Y;
                    push(-STEP_X / 2, yc - clipAlongEdge);
                    push(-STEP_X / 2, yc + clipAlongEdge);
                    push(STEP_X / 2, yc - clipAlongEdge);
                    push(STEP_X / 2, yc + clipAlongEdge);
                }
                for (const ix of GRID) {
                    const xc = ix * STEP_X;
                    push(xc - clipAlongEdge, -STEP_Y / 2);
                    push(xc + clipAlongEdge, -STEP_Y / 2);
                    push(xc - clipAlongEdge, STEP_Y / 2);
                    push(xc + clipAlongEdge, STEP_Y / 2);
                }
            };

            const frontTargets = [];
            const backTargets = [];
            const ySeamBottom = -STEP_Y / 2;
            const ySeamTop = STEP_Y / 2;
            const pushSideQuad = (list, xPlane, quatBase) => {
                list.push(
                    {
                        pos: new THREE.Vector3(xPlane, ySeamBottom, zClipSideMid - clipAlongZSide),
                        quat: quatBase.clone(),
                    },
                    {
                        pos: new THREE.Vector3(xPlane, ySeamBottom, zClipSideMid + clipAlongZSide),
                        quat: quatBase.clone(),
                    },
                    {
                        pos: new THREE.Vector3(xPlane, ySeamTop, zClipSideMid - clipAlongZSide),
                        quat: quatBase.clone(),
                    },
                    {
                        pos: new THREE.Vector3(xPlane, ySeamTop, zClipSideMid + clipAlongZSide),
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

            /** Центр вращения: сдвиг всей стенки, чтобы ось Y проходила через центр bbox кубов */
            cubeRoots.forEach((c) => c.position.copy(c.userData.assembled));
            consWallRoot.updateMatrixWorld(true);
            const wallPivotBox = new THREE.Box3();
            cubeRoots.forEach((c) => {
                wallPivotBox.union(new THREE.Box3().setFromObject(c));
            });
            const wallPivotCenter = wallPivotBox.getCenter(new THREE.Vector3());
            cubeRoots.forEach((c) => {
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
            });

            function setCubeMeshesOpacity(cube, alpha) {
                cube.traverse((ch) => {
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
            consWallRoot.userData.playBackClipFlyIn = playBackClipFlyIn;
            consWallRoot.userData.playLeftClipFlyIn = playLeftClipFlyIn;
            consWallRoot.userData.playRightClipFlyIn = playRightClipFlyIn;

            consAnimPayload = { cubeRoots, clipMeshes, backClipMeshes, leftClipMeshes, rightClipMeshes };

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
                }
                [...clipMeshes, ...backClipMeshes, ...leftClipMeshes, ...rightClipMeshes].forEach((m) => {
                    const mat = m.material;
                    if (mat?.isMeshStandardMaterial) {
                        gsap.killTweensOf(mat);
                        mat.emissive.setHex(0x000000);
                        mat.emissiveIntensity = 0;
                        mat.roughness = CLIP_BASE_ROUGHNESS;
                        mat.metalness = CLIP_BASE_METALNESS;
                    }
                });
                const firstRowIy = -1;
                cubeRoots.forEach((c) => {
                    c.traverse((ch) => {
                        if (ch.isMesh && ch.material) gsap.killTweensOf(ch.material);
                    });
                    c.position.copy(c.userData.exploded);
                    const isFirst = c.userData.iy === firstRowIy;
                    c.visible = isFirst;
                    setCubeMeshesOpacity(c, 0);
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

            cubeRoots.forEach((c) => {
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

            function playWallAnim() {
                if (!consAnimPayload) return;
                resetWallAnim();
                consBuildTL = gsap.timeline({
                    onComplete: () => {
                        consWallComplete = true;
                        consBuildTL = null;
                        if (consWallRoot?.userData) {
                            consWallRoot.userData.consIdleStartY = consWallRoot.rotation.y;
                            consWallRoot.userData.consLeftClipPlayed = false;
                            consWallRoot.userData.consRightClipPlayed = false;
                            consWallRoot.userData.consBackClipPlayed = false;
                            consWallRoot.userData.consRotFastAfterBack = false;
                        }
                    },
                });
                const { cubeRoots: cubes, clipMeshes: clips } = consAnimPayload;
                const rowOf = (iy) =>
                    cubes
                        .filter((c) => c.userData.iy === iy)
                        .sort((a, b) => a.userData.sortX - b.userData.sortX);
                const rowOrder = [-1, 0, 1];
                let rowT = 0;
                rowOrder.forEach((iy) => {
                    const row = rowOf(iy);
                    consBuildTL.add(() => {
                        row.forEach((c) => {
                            c.visible = true;
                            setCubeMeshesOpacity(c, 0);
                            c.traverse((ch) => {
                                if (ch.isMesh && ch.material) {
                                    const m = ch.material;
                                    gsap.to(m, {
                                        opacity: 1,
                                        duration: D_CUBE_MOVE * 0.92,
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
                        consBuildTL.to(
                            c.position,
                            { x: p.x, y: p.y, z: p.z, duration: D_CUBE_MOVE, ease: 'sine.inOut' },
                            rowT + i * STAGGER_IN_ROW
                        );
                    });
                    rowT += (row.length - 1) * STAGGER_IN_ROW + D_CUBE_MOVE + ROW_GAP;
                });
                const cubeEnd = rowT - ROW_GAP;
                consBuildTL.add(() => {
                    clips.forEach((m) => {
                        m.visible = true;
                    });
                }, cubeEnd + PAUSE_BEFORE_CLIPS);
                const clipPhaseStart = cubeEnd + PAUSE_BEFORE_CLIPS;
                clips.forEach((m) => {
                    const tp = m.userData.targetPos;
                    addClipBuildThenInsert(consBuildTL, m, tp, 'front', clipPhaseStart);
                });
            }

            consLoopRestartFn = () => {
                if (!consAnimPayload) return;
                resetWallAnim();
                playWallAnim();
            };

            ScrollTrigger.create({
                trigger: '#construction',
                start: 'top 70%',
                end: 'bottom 25%',
                /** При каждом входе в зону триггера — полный сброс и сборка с нуля (после ухода со секции) */
                onToggle: (self) => {
                    if (self.isActive) playWallAnim();
                    else resetWallAnim();
                },
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

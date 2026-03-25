/**
 * Проверка facet-GLB: загрузка, отсев мусорных мешей, merge, разумный bbox.
 * Запуск: npm install && npm run test:assembly
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const MAX_BBOX = 2800;

function vertexCount(ch) {
    return ch.geometry?.attributes?.position?.count || 0;
}

function meshWorldMaxSide(meshNode) {
    meshNode.updateMatrixWorld(true);
    const g = meshNode.geometry.clone();
    g.applyMatrix4(meshNode.matrixWorld);
    g.computeBoundingBox();
    const sz = g.boundingBox.getSize(new THREE.Vector3());
    g.dispose();
    return Math.max(sz.x, sz.y, sz.z);
}

function filterNodes(nodes) {
    return nodes.filter((ch) => {
        const ms = meshWorldMaxSide(ch);
        return Number.isFinite(ms) && ms > 1e-6 && ms <= MAX_BBOX;
    });
}

function pickPrimary(nodes) {
    let maxV = 0;
    for (const ch of nodes) maxV = Math.max(maxV, vertexCount(ch));
    const pool = nodes.filter((ch) => vertexCount(ch) >= maxV * 0.95);
    const use = pool.length ? pool : nodes;
    let best = use[0];
    let bestLen = Infinity;
    for (const ch of use) {
        ch.updateMatrixWorld(true);
        const g = ch.geometry.clone();
        g.applyMatrix4(ch.matrixWorld);
        g.computeBoundingBox();
        const len = g.boundingBox.getCenter(new THREE.Vector3()).lengthSq();
        g.dispose();
        if (len < bestLen) {
            bestLen = len;
            best = ch;
        }
    }
    return [best];
}

function facetSceneToMergedMesh(scene) {
    const tmp = scene.clone(true);
    tmp.updateMatrixWorld(true);
    const raw = [];
    tmp.traverse((ch) => {
        if ((ch.isMesh || ch.isSkinnedMesh) && ch.geometry?.isBufferGeometry) raw.push(ch);
    });
    if (!raw.length) return null;
    let nodes = filterNodes(raw);
    if (!nodes.length) return null;
    if (nodes.length > 3) nodes = pickPrimary(nodes);

    const prep = (ch) => {
        const g = ch.geometry.clone();
        g.applyMatrix4(ch.matrixWorld);
        return g;
    };
    let merged;
    if (nodes.length === 1) merged = prep(nodes[0]);
    else {
        const geoms = nodes.map(prep);
        try {
            merged = mergeGeometries(geoms, false);
        } catch {
            merged = prep(nodes.reduce((a, b) => (vertexCount(a) >= vertexCount(b) ? a : b)));
        }
    }
    merged.computeBoundingBox();
    const bb = merged.boundingBox;
    merged.translate(
        -((bb.min.x + bb.max.x) * 0.5),
        -((bb.min.y + bb.max.y) * 0.5),
        -((bb.min.z + bb.max.z) * 0.5)
    );
    merged.computeBoundingBox();
    const sz = merged.boundingBox.getSize(new THREE.Vector3());
    return Math.max(sz.x, sz.y, sz.z);
}

function loadGlb(absPath) {
    const buf = readFileSync(absPath);
    const loader = new GLTFLoader();
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return new Promise((resolve, reject) => {
        loader.parse(ab, '', resolve, reject);
    });
}

const files = {
    bion: join(ROOT, 'assets', 'facets', 'bion_facet.glb'),
    zen: join(ROOT, 'assets', 'facets', 'zen_facet.glb'),
    void: join(ROOT, 'assets', 'facets', 'void_facet.glb'),
};

let failed = false;
for (const [name, p] of Object.entries(files)) {
    if (!existsSync(p)) {
        console.error('MISSING', name, p);
        failed = true;
        continue;
    }
    try {
        const gltf = await loadGlb(p);
        const maxDim = facetSceneToMergedMesh(gltf.scene);
        if (maxDim == null || !Number.isFinite(maxDim)) {
            console.error('FAIL', name, 'no merged mesh');
            failed = true;
            continue;
        }
        if (maxDim < 1e-4 || maxDim > 50) {
            console.warn('WARN', name, 'facetMax', maxDim, '(unexpected range?)');
        }
        console.log('OK', name, 'merged maxDim', maxDim.toFixed(4));
    } catch (e) {
        console.error('FAIL', name, e.message);
        failed = true;
    }
}

if (failed) {
    console.error('\nverify-assembly: FAILED');
    process.exit(1);
}
console.log('\nverify-assembly: ALL OK');

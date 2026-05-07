import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* =========================
   DOM
========================= */

const modelInput = document.getElementById("modelInput");
const dropZone = document.getElementById("dropZone");
const modelCards = document.querySelectorAll(".model-card");

const viewerShell = document.querySelector(".viewer");
const viewer = document.getElementById("viewerStage");
const placeholder =
    document.getElementById("viewerPlaceholder") ||
    document.querySelector(".viewer-placeholder");

const fileNameLabel = document.getElementById("fileName");
const fileFormatLabel = document.getElementById("fileFormat");
const fileSizeLabel = document.getElementById("fileSize");
const fileStatusLabel = document.getElementById("fileStatus");

const viewerModeLabel = document.getElementById("viewerMode");
const viewerStatusLabel = document.getElementById("viewerStatus");
const viewerFileLabel = document.getElementById("viewerFile");

const meshCountLabel = document.getElementById("meshCount");
const vertexCountLabel = document.getElementById("vertexCount");
const triangleCountLabel = document.getElementById("triangleCount");

const scanStatusLabel = document.getElementById("scanStatus");
const scanComplexityLabel = document.getElementById("scanComplexity");
const scanDimensionsLabel = document.getElementById("scanDimensions");

const consoleState = document.getElementById("consoleState");
const consoleLines = document.getElementById("consoleLines");
const forensicVerdict = document.getElementById("forensicVerdict");

const runScanBtn = document.getElementById("runScanBtn");

const resetViewBtn = document.getElementById("resetViewBtn");
const autoRotateBtn = document.getElementById("autoRotateBtn");
const gridBtn = document.getElementById("gridBtn");

const fullscreenBtn = document.getElementById("fullscreenBtn");
const screenshotBtn = document.getElementById("screenshotBtn");

const modeButtons = document.querySelectorAll(".mode-btn");

const toast = document.getElementById("toast");
const viewerResult = document.getElementById("viewerResult");
const forensicPanel = document.querySelector(".forensic-panel");

/* =========================
   STATE
========================= */

let toastTimer = null;
let viewerResultTimer = null;
let visualMode = "normal";
let isAutoRotating = true;
let activeModelKey = "room";
let currentModel = null;
let currentStats = null;
let isScanning = false;

let boundsHelper = null;
let evidenceMarkerGroup = null;
let modelBaseGlow = null;

const scanClock = new THREE.Clock();

/* =========================
   SAFETY CHECK
========================= */

if (!viewer) {
    throw new Error("viewerStage element was not found. Check id='viewerStage' in HTML.");
}

/* =========================
   THREE.JS SETUP
========================= */

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    45,
    Math.max(viewer.clientWidth, 1) / Math.max(viewer.clientHeight, 1),
    0.1,
    1000
);

camera.position.set(3.5, 2.4, 4.5);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(Math.max(viewer.clientWidth, 1), Math.max(viewer.clientHeight, 1));
renderer.setClearColor(0x000000, 0);

if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
}

renderer.domElement.classList.add("webgl-canvas");
viewer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enableZoom = true;
controls.enablePan = true;
controls.autoRotate = false;

/* =========================
   LIGHTS / GRID
========================= */

const ambientLight = new THREE.HemisphereLight(0xffffff, 0x202040, 2.0);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 3.2);
mainLight.position.set(4, 6, 5);
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1.35);
fillLight.position.set(-4, 2.5, 4);
scene.add(fillLight);

const cyanLight = new THREE.PointLight(0x00eaff, 4.2, 14);
cyanLight.position.set(-3, 2.5, 3);
scene.add(cyanLight);

const purpleLight = new THREE.PointLight(0x8b4dff, 3.2, 14);
purpleLight.position.set(3, 1.5, -3);
scene.add(purpleLight);

const grid = new THREE.GridHelper(8, 32, 0x00eaff, 0x25304a);
grid.position.y = -1.2;
scene.add(grid);

const loader = new GLTFLoader();

/* =========================
   PRESET MODELS
========================= */

const presetModels = {
    room: {
        name: "room.glb",
        path: "./models/modelsforweb/room.glb",
        category: "Miestnosť",
        sizeLabel: "—",
        fitScale: 3.2,
        cameraDistance: 1.8,
        yOffset: 0,
        manualPosition: null,
        manualTarget: null
    },
    person: {
        name: "person.glb",
        path: "./models/modelsforweb/person.glb",
        category: "Postava",
        sizeLabel: "—",
        fitScale: 1.8,
        cameraDistance: 1.45,
        yOffset: 0,
        manualPosition: null,
        manualTarget: null
    },
    object: {
        name: "object.glb",
        path: "./models/modelsforweb/object.glb",
        category: "Predmet",
        sizeLabel: "—",
        fitScale: 3.8,
        cameraDistance: 1.45,
        yOffset: 0.75,
        manualPosition: null,
        manualTarget: null
    },
    upload: {
        name: "custom.glb",
        path: "",
        category: "Custom upload",
        sizeLabel: "—",
        fitScale: 3.2,
        cameraDistance: 1.8,
        yOffset: 0,
        manualPosition: null,
        manualTarget: null
    }
};

/* =========================
   BASIC HELPERS
========================= */

function setText(element, value) {
    if (element) {
        element.textContent = value;
    }
}

function setIconButtonLabel(button, value) {
    if (!button) {
        return;
    }

    const label = button.querySelector(".button-label");

    if (label) {
        label.textContent = value;
        return;
    }

    button.textContent = value;
}

function showToast(message, type = "success") {
    if (!toast) {
        return;
    }

    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    toastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 2600);
}

function showCenterResult(title, text = "", type = "success", autoHide = true) {
    if (!viewerResult) {
        return;
    }

    clearTimeout(viewerResultTimer);

    let icon = "✓";

    if (type === "error") {
        icon = "✕";
    }

    if (type === "warning") {
        icon = "!";
    }

    viewerResult.className = `viewer-result show ${type}`;
    viewerResult.innerHTML = `
        <div class="result-icon">${icon}</div>
        <div class="result-title">${title}</div>
        ${text ? `<p class="result-text">${text}</p>` : ""}
    `;

    if (autoHide) {
        const hideDelay = type === "success" ? 1150 : 1700;

        viewerResultTimer = setTimeout(() => {
            hideCenterResult();
        }, hideDelay);
    }
}

function hideCenterResult() {
    if (!viewerResult) {
        return;
    }

    clearTimeout(viewerResultTimer);
    viewerResult.className = "viewer-result";
    viewerResult.innerHTML = "";
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "—";
    }

    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    const decimals = size >= 10 || unitIndex === 0 ? 1 : 2;

    return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

async function updatePresetFileSize(path) {
    if (!path) {
        setText(fileSizeLabel, "—");
        return;
    }

    try {
        const response = await fetch(path);

        if (!response.ok) {
            throw new Error(`File size request failed: ${response.status}`);
        }

        const blob = await response.blob();
        setText(fileSizeLabel, formatFileSize(blob.size));
    } catch (error) {
        console.warn("Could not calculate preset file size:", error);
        setText(fileSizeLabel, "Unknown");
    }
}

function showStatus(text) {
    if (!placeholder) {
        return;
    }

    placeholder.style.display = "grid";
    placeholder.innerHTML = `
        <div class="loading-state">
            <div class="loading-ring"></div>
            <p>${text}</p>
        </div>
    `;
}

function hidePlaceholder() {
    if (!placeholder) {
        return;
    }

    placeholder.style.display = "none";
}

/* =========================
   FORENSIC UI
========================= */

function resetForensicConsole() {
    forensicPanel?.classList.remove("scan-finished");
    viewerShell?.classList.remove("scan-core-active");
    viewer?.classList.remove("scan-core-active");
    if (consoleState) {
        consoleState.textContent = "IDLE";
    }

    if (consoleLines) {
        consoleLines.innerHTML = "<p>&gt; Awaiting scan command...</p>";
    }

    if (forensicVerdict) {
        forensicVerdict.className = "forensic-verdict";
        forensicVerdict.innerHTML = `
            <span>Verdict</span>
            <strong>Not scanned</strong>
            <p>Run scan to generate forensic conclusion.</p>
        `;
    }
}

function addConsoleLine(text, type = "") {
    if (!consoleLines) {
        return;
    }

    const line = document.createElement("p");
    line.textContent = `> ${text}`;

    if (type) {
        line.classList.add(type);
    }

    consoleLines.appendChild(line);

    while (consoleLines.children.length > 7) {
        consoleLines.removeChild(consoleLines.firstElementChild);
    }
}

function setForensicVerdict(stats) {
    if (!forensicVerdict || !stats) {
        return;
    }

    let verdictClass = "clean";
    let verdictTitle = "Clean reconstruction";
    let verdictText = "Geometry is stable. No critical scan anomalies detected.";

    if (stats.triangleCount >= 250000 || stats.meshCount >= 40) {
        verdictClass = "warn";
        verdictTitle = "Suspicious complexity";
        verdictText =
            "Model contains dense geometry or many separated fragments. Manual review is recommended.";
    }

    if (stats.triangleCount >= 800000 || stats.surfaceDensity >= 45000) {
        verdictClass = "danger";
        verdictTitle = "Heavy forensic target";
        verdictText =
            "The scan is highly dense. Rendering, export and reconstruction accuracy should be checked.";
    }

    forensicVerdict.className = `forensic-verdict is-ready ${verdictClass}`;
    forensicVerdict.innerHTML = `
        <span>Verdict</span>
        <strong>${verdictTitle}</strong>
        <p>${verdictText}</p>
    `;
}

/* =========================
   STATS
========================= */

function computeModelStats(model) {
    let meshCount = 0;
    let vertexCount = 0;
    let triangleCount = 0;

    model.traverse((child) => {
        if (!child.isMesh || !child.geometry) {
            return;
        }

        meshCount++;

        const geometry = child.geometry;
        const position = geometry.attributes.position;

        if (position) {
            vertexCount += position.count;
        }

        if (geometry.index) {
            triangleCount += geometry.index.count / 3;
        } else if (position) {
            triangleCount += position.count / 3;
        }
    });

    const roundedVertices = Math.round(vertexCount);
    const roundedTriangles = Math.round(triangleCount);

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const volume = Math.max(size.x * size.y * size.z, 0);
    const surfaceDensity = volume > 0 ? Math.round(roundedTriangles / volume) : 0;

    let rating = "Low";
    let ratingClass = "complexity-low";

    if (roundedTriangles >= 50000 && roundedTriangles < 250000) {
        rating = "Medium";
        ratingClass = "complexity-medium";
    }

    if (roundedTriangles >= 250000 && roundedTriangles < 800000) {
        rating = "High";
        ratingClass = "complexity-high";
    }

    if (roundedTriangles >= 800000) {
        rating = "Extreme";
        ratingClass = "complexity-extreme";
    }

    return {
        meshCount,
        vertexCount: roundedVertices,
        triangleCount: roundedTriangles,
        size,
        center,
        box,
        volume,
        surfaceDensity,
        maxSize: Math.max(size.x, size.y, size.z),
        rating,
        ratingClass
    };
}

function updateModelStats(model) {
    if (!model) {
        return null;
    }

    const stats = computeModelStats(model);
    currentStats = stats;

    setText(meshCountLabel, stats.meshCount.toLocaleString("sk-SK"));
    setText(vertexCountLabel, stats.vertexCount.toLocaleString("sk-SK"));
    setText(triangleCountLabel, stats.triangleCount.toLocaleString("sk-SK"));

    setText(
        scanDimensionsLabel,
        `${stats.size.x.toFixed(2)} × ${stats.size.y.toFixed(2)} × ${stats.size.z.toFixed(2)}`
    );

    setText(scanComplexityLabel, stats.rating);

    if (scanComplexityLabel) {
        scanComplexityLabel.className = stats.ratingClass;
    }

    setText(scanStatusLabel, "Scan complete");

    return stats;
}

function resetStats() {
    currentStats = null;
    clearForensicOverlays();

    setText(meshCountLabel, "—");
    setText(vertexCountLabel, "—");
    setText(triangleCountLabel, "—");
    setText(scanComplexityLabel, "—");
    setText(scanDimensionsLabel, "—");

    if (scanComplexityLabel) {
        scanComplexityLabel.className = "";
    }
}

/* =========================
   LOAD PRESET MODEL
========================= */

function loadPresetModel(modelKey) {
    const preset = presetModels[modelKey];

    if (!preset) {
        return;
    }

    activeModelKey = modelKey;

    setText(fileNameLabel, preset.name);
    setText(fileFormatLabel, "GLB");
    setText(fileSizeLabel, "Calculating...");
    updatePresetFileSize(preset.path);
    setText(fileStatusLabel, "Načítavanie...");

    setText(viewerStatusLabel, "Loading");
    setText(viewerFileLabel, preset.name);
    setText(scanStatusLabel, "Loading target");

    resetStats();
    resetForensicConsole();
    hideCenterResult();
    showStatus(`Načítavam model: ${preset.category}...`);

    loader.load(
        preset.path,
        (gltf) => {
            clearCurrentModel();

            currentModel = gltf.scene;
            scene.add(currentModel);

            normalizeModel(currentModel);
            createModelBaseGlow(currentModel);
            enhanceModelMaterials(currentModel);
            applyVisualMode(visualMode);

            resetStats();
            resetForensicConsole();
            hidePlaceholder();

            setText(fileStatusLabel, "Model načítaný");
            setText(viewerStatusLabel, "Model loaded");
            setText(scanStatusLabel, "Target loaded");

            resizeRenderer();
            fitCameraToModel(currentModel);

            showCenterResult(
                "Model loaded",
                `${preset.category} bol úspešne načítaný.`,
                "success"
            );
        },
        undefined,
        (error) => {
            console.error(error);

            showStatus("Model sa nepodarilo načítať.");
            setText(fileStatusLabel, "Chyba načítania");
            setText(viewerStatusLabel, "Error");
            setText(scanStatusLabel, "Loading error");

            showCenterResult(
                "Loading failed",
                "Model sa nepodarilo načítať.",
                "error",
                false
            );
        }
    );
}

/* =========================
   UPLOAD MODEL
========================= */

function handleModelFile(file) {
    if (!file) {
        return;
    }

    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith(".glb")) {
        showCenterResult(
            "Unsupported file",
            "Podporované sú iba súbory .glb.",
            "warning",
            false
        );
        return;
    }

    activeModelKey = "upload";

    modelCards.forEach((card) => card.classList.remove("active"));

    const fileSizeMb = (file.size / 1024 / 1024).toFixed(2);
    const extension = file.name.split(".").pop().toUpperCase();

    setText(fileNameLabel, file.name);
    setText(fileFormatLabel, extension);
    setText(fileSizeLabel, `${fileSizeMb} MB`);
    setText(fileStatusLabel, "Načítavanie...");

    setText(viewerStatusLabel, "Loading");
    setText(viewerFileLabel, file.name);
    setText(scanStatusLabel, "Loading target");

    resetStats();
    resetForensicConsole();
    hideCenterResult();
    showStatus("Načítavam 3D model...");

    const fileUrl = URL.createObjectURL(file);

    loader.load(
        fileUrl,
        (gltf) => {
            URL.revokeObjectURL(fileUrl);

            clearCurrentModel();

            currentModel = gltf.scene;
            scene.add(currentModel);

            normalizeModel(currentModel);
            createModelBaseGlow(currentModel);
            enhanceModelMaterials(currentModel);
            applyVisualMode(visualMode);

            resetStats();
            resetForensicConsole();
            hidePlaceholder();

            setText(fileStatusLabel, "Model načítaný");
            setText(viewerStatusLabel, "Model loaded");
            setText(scanStatusLabel, "Target loaded");

            resizeRenderer();
            fitCameraToModel(currentModel);

            showCenterResult(
                "Model loaded",
                `${file.name} bol úspešne načítaný.`,
                "success"
            );
        },
        undefined,
        (error) => {
            URL.revokeObjectURL(fileUrl);
            console.error(error);

            showStatus("Model sa nepodarilo načítať.");

            setText(fileStatusLabel, "Chyba načítania");
            setText(viewerStatusLabel, "Error");
            setText(scanStatusLabel, "Loading error");

            resetStats();
            resetForensicConsole();

            showCenterResult(
                "Loading failed",
                "Model sa nepodarilo načítať. Skús iný .glb súbor.",
                "error",
                false
            );
        }
    );
}

/* =========================
   MODEL HELPERS
========================= */

function clearCurrentModel() {
    clearForensicOverlays();
    clearModelBaseGlow();

    if (!currentModel) {
        return;
    }

    scene.remove(currentModel);

    currentModel.traverse((child) => {
        if (!child.isMesh) {
            return;
        }

        child.geometry?.dispose();

        if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
        } else {
            child.material?.dispose();
        }
    });

    currentModel = null;
}

function normalizeModel(model) {
    model.updateMatrixWorld(true);

    const profile = presetModels[activeModelKey] || presetModels.upload;

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const maxDimension = Math.max(size.x, size.y, size.z);

    if (maxDimension === 0) {
        return;
    }

    const scale = profile.fitScale / maxDimension;

    model.scale.setScalar(scale);

    model.position.set(
        -center.x * scale,
        -center.y * scale + profile.yOffset,
        -center.z * scale
    );

    if (profile.manualPosition) {
        model.position.x += profile.manualPosition.x;
        model.position.y += profile.manualPosition.y;
        model.position.z += profile.manualPosition.z;
    }

    model.updateMatrixWorld(true);

    fitCameraToModel(model);
}

function fitCameraToModel(model) {
    if (!model) {
        return;
    }

    const profile = presetModels[activeModelKey] || presetModels.upload;

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const maxSize = Math.max(size.x, size.y, size.z);
    const distance = Math.max(maxSize * profile.cameraDistance, 1.5);

    camera.position.set(
        center.x + distance,
        center.y + distance * 0.45,
        center.z + distance
    );

    camera.near = Math.max(distance / 100, 0.01);
    camera.far = distance * 100;
    camera.updateProjectionMatrix();

    if (profile.manualTarget) {
        controls.target.set(
            profile.manualTarget.x,
            profile.manualTarget.y,
            profile.manualTarget.z
        );

        camera.position.set(
            profile.manualTarget.x + distance,
            profile.manualTarget.y + distance * 0.35,
            profile.manualTarget.z + distance
        );
    } else {
        controls.target.copy(center);
    }

    controls.update();
}

function enhanceModelMaterials(model) {
    model.traverse((child) => {
        if (!child.isMesh || !child.material) {
            return;
        }

        child.castShadow = true;
        child.receiveShadow = true;

        if (Array.isArray(child.material)) {
            child.material.forEach(updateMaterial);
        } else {
            updateMaterial(child.material);
        }
    });
}

function updateMaterial(material) {
    material.needsUpdate = true;

    if ("metalness" in material) {
        material.metalness = Math.min(material.metalness + 0.08, 1);
    }

    if ("roughness" in material) {
        material.roughness = Math.max(material.roughness, 0.28);
    }
}

/* =========================
   VISUAL MODES
========================= */

function removeWireframeOverlay(model) {
    if (!model) {
        return;
    }

    model.traverse((child) => {
        if (!child.isMesh) {
            return;
        }

        const overlays = child.children.filter((item) => item.name === "wireframeOverlay");

        overlays.forEach((overlay) => {
            child.remove(overlay);
            overlay.geometry?.dispose();

            if (Array.isArray(overlay.material)) {
                overlay.material.forEach((material) => material.dispose());
            } else {
                overlay.material?.dispose();
            }
        });
    });
}

function resetModelWireframe(model) {
    if (!model) {
        return;
    }

    model.traverse((child) => {
        if (!child.isMesh || !child.material) {
            return;
        }

        const resetMaterial = (material) => {
            material.wireframe = false;
            material.transparent = false;
            material.opacity = 1;
            material.needsUpdate = true;
        };

        if (Array.isArray(child.material)) {
            child.material.forEach(resetMaterial);
        } else {
            resetMaterial(child.material);
        }
    });
}

function setModelWireframe(model, enabled) {
    if (!model) {
        return;
    }

    model.traverse((child) => {
        if (!child.isMesh || !child.material) {
            return;
        }

        const setMaterial = (material) => {
            material.wireframe = enabled;
            material.needsUpdate = true;
        };

        if (Array.isArray(child.material)) {
            child.material.forEach(setMaterial);
        } else {
            setMaterial(child.material);
        }
    });
}

function addHybridWireframe(model) {
    if (!model) {
        return;
    }

    model.traverse((child) => {
        if (!child.isMesh || !child.geometry) {
            return;
        }

        const existing = child.children.some((item) => item.name === "wireframeOverlay");

        if (existing) {
            return;
        }

        const wireGeometry = new THREE.WireframeGeometry(child.geometry);
        const wireMaterial = new THREE.LineBasicMaterial({
            color: 0x62eaff,
            transparent: true,
            opacity: 0.42
        });

        const wireframe = new THREE.LineSegments(wireGeometry, wireMaterial);
        wireframe.name = "wireframeOverlay";

        child.add(wireframe);
    });
}

function applyXrayMaterial(model) {
    if (!model) {
        return;
    }

    model.traverse((child) => {
        if (!child.isMesh || !child.material) {
            return;
        }

        const applyToMaterial = (material) => {
            material.transparent = true;
            material.opacity = 0.55;
            material.needsUpdate = true;
        };

        if (Array.isArray(child.material)) {
            child.material.forEach(applyToMaterial);
        } else {
            applyToMaterial(child.material);
        }
    });
}

function applyVisualMode(mode) {
    if (!currentModel) {
        return;
    }

    removeWireframeOverlay(currentModel);
    resetModelWireframe(currentModel);

    if (mode === "wireframe") {
        setModelWireframe(currentModel, true);
    }

    if (mode === "hybrid") {
        applyXrayMaterial(currentModel);
        addHybridWireframe(currentModel);
    }
}

/* =========================
   EVIDENCE OVERLAYS
========================= */

function disposeObject3D(object) {
    if (!object) {
        return;
    }

    object.traverse((item) => {
        if (item.geometry) {
            item.geometry.dispose();
        }

        if (item.material) {
            const materials = Array.isArray(item.material) ? item.material : [item.material];

            materials.forEach((material) => {
                if (material.map) {
                    material.map.dispose();
                }

                material.dispose();
            });
        }
    });
}

function clearForensicOverlays() {
    if (boundsHelper) {
        scene.remove(boundsHelper);
        disposeObject3D(boundsHelper);
        boundsHelper = null;
    }

    if (evidenceMarkerGroup) {
        if (evidenceMarkerGroup.parent) {
            evidenceMarkerGroup.parent.remove(evidenceMarkerGroup);
        }

        disposeObject3D(evidenceMarkerGroup);
        evidenceMarkerGroup = null;
    }
}

function clearModelBaseGlow() {
    if (!modelBaseGlow) {
        return;
    }

    scene.remove(modelBaseGlow);
    disposeObject3D(modelBaseGlow);
    modelBaseGlow = null;
}

function createModelBaseGlow(model) {
    if (!model) {
        return;
    }

    clearModelBaseGlow();

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const radius = Math.max(size.x, size.z, 0.8) * 0.48;

    modelBaseGlow = new THREE.Group();
    modelBaseGlow.name = "modelBaseGlow";

    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x62eaff,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });

    const innerMaterial = new THREE.MeshBasicMaterial({
        color: 0x8b4dff,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });

    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x62eaff,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });

    const outerGlow = new THREE.Mesh(
        new THREE.CircleGeometry(1, 96),
        glowMaterial
    );

    const innerGlow = new THREE.Mesh(
        new THREE.CircleGeometry(0.55, 96),
        innerMaterial
    );

    const scannerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.72, 0.76, 128),
        ringMaterial
    );

    outerGlow.rotation.x = -Math.PI / 2;
    innerGlow.rotation.x = -Math.PI / 2;
    scannerRing.rotation.x = -Math.PI / 2;

    modelBaseGlow.add(outerGlow);
    modelBaseGlow.add(innerGlow);
    modelBaseGlow.add(scannerRing);

    modelBaseGlow.position.set(
        center.x,
        box.min.y + 0.018,
        center.z
    );

    modelBaseGlow.scale.setScalar(radius);

    scene.add(modelBaseGlow);
}

function updateModelBaseGlow() {
    if (!modelBaseGlow || !currentModel) {
        return;
    }

    const box = new THREE.Box3().setFromObject(currentModel);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const radius = Math.max(size.x, size.z, 0.8) * 0.48;
    const time = scanClock.getElapsedTime();
    const pulse = 1 + Math.sin(time * 2.2) * 0.035;

    modelBaseGlow.position.set(
        center.x,
        box.min.y + 0.018,
        center.z
    );

    modelBaseGlow.scale.setScalar(radius * pulse);

    modelBaseGlow.rotation.y += 0.002;
}

function buildEvidenceMarkerData(stats) {
    const { box, size, center } = stats;

    const safeX = Math.max(size.x * 0.36, 0.15);
    const safeY = Math.max(size.y * 0.36, 0.15);
    const safeZ = Math.max(size.z * 0.36, 0.15);

    return [
        {
            code: "M01",
            label: "Scale anchor",
            detail: `${stats.maxSize.toFixed(2)} u longest axis`,
            color: 0x62eaff,
            worldPosition: new THREE.Vector3(
                center.x + safeX,
                center.y + safeY,
                center.z + safeZ
            )
        },
        {
            code: "M02",
            label: "Surface density",
            detail: `${stats.surfaceDensity.toLocaleString("sk-SK")} tri/u³`,
            color: 0xffe27d,
            worldPosition: new THREE.Vector3(
                center.x - safeX,
                center.y + safeY * 0.55,
                center.z - safeZ
            )
        },
        {
            code: "M03",
            label: "Geometry center",
            detail: `${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}`,
            color: 0x8b4dff,
            worldPosition: center.clone()
        },
        {
            code: "M04",
            label: "Edge boundary",
            detail: "Bounding volume limit",
            color: stats.triangleCount >= 250000 ? 0xff6b8b : 0x7dffb2,
            worldPosition: new THREE.Vector3(
                box.min.x + size.x * 0.16,
                center.y - safeY,
                box.max.z - size.z * 0.14
            )
        }
    ];
}

function createMarkerLabelSprite(code, label, detail, color, localScaleFix) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 180;

    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(4, 10, 22, 0.78)";
    roundRect(context, 12, 16, 488, 132, 22);
    context.fill();

    context.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.lineWidth = 3;
    roundRect(context, 12, 16, 488, 132, 22);
    context.stroke();

    context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.font = "900 38px Arial";
    context.fillText(code, 34, 62);

    context.fillStyle = "#ffffff";
    context.font = "900 30px Arial";
    context.fillText(label, 34, 100);

    context.fillStyle = "rgba(225, 248, 255, 0.72)";
    context.font = "700 22px Arial";
    context.fillText(detail, 34, 132);

    const texture = new THREE.CanvasTexture(canvas);

    if ("colorSpace" in texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
    }

    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });

    const sprite = new THREE.Sprite(material);

    sprite.scale.set(
        0.46 / localScaleFix,
        0.16 / localScaleFix,
        1
    );

    sprite.position.set(
        0.30 / localScaleFix,
        0.13 / localScaleFix,
        0
    );

    sprite.userData.billboard = true;

    return sprite;
}

function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
}

function createForensicOverlays(model, stats) {
    if (!model || !stats) {
        return;
    }

    clearForensicOverlays();

    boundsHelper = new THREE.BoxHelper(model, 0x62eaff);
    boundsHelper.name = "forensicBoundingBox";

    if (boundsHelper.material) {
        boundsHelper.material.transparent = true;
        boundsHelper.material.opacity = 0.42;
        boundsHelper.material.depthTest = false;
    }

    scene.add(boundsHelper);

    evidenceMarkerGroup = new THREE.Group();
    evidenceMarkerGroup.name = "evidenceMarkerGroup";
    model.add(evidenceMarkerGroup);

    const localScaleFix = Math.max(model.scale.x || 1, 0.001);
    const markerRadius = Math.max(stats.maxSize * 0.012, 0.024) / localScaleFix;

    const markers = buildEvidenceMarkerData(stats);

    markers.forEach((markerData, index) => {
        const marker = new THREE.Group();
        marker.name = `evidenceMarker_${markerData.code}`;
        marker.userData.pulseOffset = index * 0.65;

        const localPosition = model.worldToLocal(markerData.worldPosition.clone());
        marker.position.copy(localPosition);

        const core = new THREE.Mesh(
            new THREE.SphereGeometry(markerRadius, 20, 20),
            new THREE.MeshBasicMaterial({
                color: markerData.color,
                transparent: true,
                opacity: 0.96
            })
        );

        const halo = new THREE.Mesh(
            new THREE.RingGeometry(markerRadius * 1.8, markerRadius * 2.8, 48),
            new THREE.MeshBasicMaterial({
                color: markerData.color,
                transparent: true,
                opacity: 0.42,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );

        halo.userData.billboard = true;

        const beam = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, markerRadius * 4.5, 0)
            ]),
            new THREE.LineBasicMaterial({
                color: markerData.color,
                transparent: true,
                opacity: 0.55
            })
        );

        const label = createMarkerLabelSprite(
            markerData.code,
            markerData.label,
            markerData.detail,
            markerData.color,
            localScaleFix
        );

        marker.add(core);
        marker.add(halo);
        marker.add(beam);
        marker.add(label);

        evidenceMarkerGroup.add(marker);
    });
}

function updateForensicOverlays() {
    if (boundsHelper && currentModel) {
        boundsHelper.update();
    }

    if (!evidenceMarkerGroup) {
        return;
    }

    const time = scanClock.getElapsedTime();

    evidenceMarkerGroup.children.forEach((marker) => {
        const pulse = 1 + Math.sin(time * 3 + marker.userData.pulseOffset) * 0.12;
        marker.scale.setScalar(pulse);

        marker.traverse((child) => {
            if (child.userData.billboard) {
                child.lookAt(camera.position);
            }
        });
    });
}

/* =========================
   FORENSIC SCAN
========================= */

function runForensicScan() {
    if (isScanning) {
        return;
    }

    if (!currentModel) {
        setText(scanStatusLabel, "No model selected");
        setText(viewerStatusLabel, "No target");

        if (consoleState) {
            consoleState.textContent = "ERROR";
        }

        if (consoleLines) {
            consoleLines.innerHTML = "";
        }

        addConsoleLine("No target model detected.", "danger");
        addConsoleLine("Load GLB model before running scan.", "warn");

        showToast("No model selected", "warning");
        return;
    }

    isScanning = true;
    resetStats();

    forensicPanel?.classList.remove("scan-finished");
    viewerShell?.classList.add("scan-core-active");
    viewer?.classList.add("scan-core-active");

    if (consoleState) {
        consoleState.textContent = "SCANNING";
    }

    if (consoleLines) {
        consoleLines.innerHTML = "";
    }

    if (forensicVerdict) {
        forensicVerdict.className = "forensic-verdict";
        forensicVerdict.innerHTML = `
            <span>Verdict</span>
            <strong>Scanning...</strong>
            <p>Forensic analysis is currently running.</p>
        `;
    }

    setText(scanStatusLabel, "Scanning...");
    setText(viewerStatusLabel, "Scanning");
    setText(fileStatusLabel, "Forensic scan running");

    viewerShell?.classList.add("is-scanning");
    viewer?.classList.add("is-scanning");

    addConsoleLine("Initializing forensic scan core...");
    addConsoleLine("Locking target transform...");
    addConsoleLine("Reading mesh hierarchy...");

    showToast("Forensic scan started");

    setTimeout(() => {
        addConsoleLine("Geometry buffers detected.", "ok");
    }, 260);

    setTimeout(() => {
        addConsoleLine("Calculating bounding dimensions...");
    }, 520);

    setTimeout(() => {
        addConsoleLine("Estimating surface density...");
    }, 780);

    setTimeout(() => {
        const stats = updateModelStats(currentModel);

        if (!stats) {
            isScanning = false;
            viewerShell?.classList.remove("is-scanning");
            viewer?.classList.remove("is-scanning");
            return;
        }

        createForensicOverlays(currentModel, stats);

        addConsoleLine("Geometry bounds calculated.", "ok");
        addConsoleLine("Surface density estimated.", "ok");
        addConsoleLine("Evidence markers generated.", "ok");

        if (stats.triangleCount >= 250000) {
            addConsoleLine("High polygon complexity detected.", "warn");
        }

        if (stats.surfaceDensity >= 45000) {
            addConsoleLine("Dense reconstruction area detected.", "danger");
        }

        addConsoleLine("Forensic report generated.", "ok");

        setForensicVerdict(stats);

        if (consoleState) {
            consoleState.textContent = "DONE";
        }

        setText(scanStatusLabel, "Scan complete");
        setText(viewerStatusLabel, "Scan complete");
        setText(fileStatusLabel, "Forensic report ready");

        viewerShell?.classList.remove("is-scanning");
        viewer?.classList.remove("is-scanning");

        viewerShell?.classList.remove("scan-core-active");
        viewer?.classList.remove("scan-core-active");

        forensicPanel?.classList.add("scan-finished");

        viewer?.classList.add("scan-burst");

        setTimeout(() => {
            viewer?.classList.remove("scan-burst");
        }, 1400);

        showToast("Forensic scan complete");
        isScanning = false;
    }, 1150);
}

/* =========================
   EVENTS
========================= */

modelInput?.addEventListener("change", () => {
    const file = modelInput.files[0];
    handleModelFile(file);
});

dropZone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
});

dropZone?.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
});

dropZone?.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");

    const file = event.dataTransfer.files[0];
    handleModelFile(file);
});

resetViewBtn?.addEventListener("click", () => {
    if (currentModel) {
        fitCameraToModel(currentModel);
        showToast("View reset");
        return;
    }

    camera.position.set(3.5, 2.4, 4.5);
    controls.target.set(0, 0, 0);
    controls.update();

    showToast("View reset");
});

autoRotateBtn?.addEventListener("click", () => {
    isAutoRotating = !isAutoRotating;
    setIconButtonLabel(
        autoRotateBtn,
        isAutoRotating ? "Auto rotate: ON" : "Auto rotate: OFF"
    );
    showToast(isAutoRotating ? "Auto rotate enabled" : "Auto rotate disabled");
});

gridBtn?.addEventListener("click", () => {
    grid.visible = !grid.visible;
    setIconButtonLabel(
        gridBtn,
        grid.visible ? "Grid: ON" : "Grid: OFF"
    );
    showToast(grid.visible ? "Grid enabled" : "Grid disabled");
});

modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        visualMode = button.dataset.mode;

        modeButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");

        setText(viewerModeLabel, button.textContent.trim());

        applyVisualMode(visualMode);

        if (button.textContent.trim().toLowerCase() === "x-ray") {
            showToast("X-Ray mode enabled");
        } else {
            showToast(`${button.textContent.trim()} mode enabled`);
        }
    });
});

fullscreenBtn?.addEventListener("click", async () => {
    try {
        if (!document.fullscreenElement) {
            await viewerShell.requestFullscreen();
            setIconButtonLabel(fullscreenBtn, "Exit fullscreen");
        } else {
            await document.exitFullscreen();
            setIconButtonLabel(fullscreenBtn, "Fullscreen");
        }

        setTimeout(resizeRenderer, 150);
    } catch (error) {
        console.error(error);
        showToast("Fullscreen failed", "error");
    }
});

document.addEventListener("fullscreenchange", () => {
    if (fullscreenBtn) {
        setIconButtonLabel(
            fullscreenBtn,
            document.fullscreenElement ? "Exit fullscreen" : "Fullscreen"
        );
    }

    setTimeout(resizeRenderer, 150);
});

screenshotBtn?.addEventListener("click", () => {
    renderer.render(scene, camera);

    const link = document.createElement("a");
    link.download = "3d-forensic-scan.png";
    link.href = renderer.domElement.toDataURL("image/png");
    link.click();

    showToast("Screenshot PNG saved");
});

modelCards.forEach((card) => {
    card.addEventListener("click", () => {
        const modelKey = card.dataset.model;

        modelCards.forEach((item) => item.classList.remove("active"));
        card.classList.add("active");

        loadPresetModel(modelKey);
    });
});

runScanBtn?.addEventListener("click", runForensicScan);

/* =========================
   RENDER LOOP
========================= */

function resizeRenderer() {
    const rect = viewer.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
}

function animate() {
    requestAnimationFrame(animate);

    if (currentModel && isAutoRotating && !isScanning) {
        currentModel.rotation.y += 0.0025;
    }

    updateModelBaseGlow();
    updateForensicOverlays();

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener("resize", resizeRenderer);

resetStats();
resetForensicConsole();

setTimeout(resizeRenderer, 100);
animate();
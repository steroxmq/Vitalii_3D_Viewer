import * as THREE from "three";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";

/* =========================
   DOM
========================= */

const modelInput = document.getElementById("modelInput");
const dropZone = document.getElementById("dropZone");
const modelCards = document.querySelectorAll(".model-card");

const viewerShell = document.querySelector(".viewer");
const viewerStage = document.getElementById("viewerStage");
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
const qualityScoreLabel = document.getElementById("qualityScore");

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

const rotateModelLeftBtn = document.getElementById("rotateModelLeftBtn");
const rotateModelRightBtn = document.getElementById("rotateModelRightBtn");
const resetModelRotationBtn = document.getElementById("resetModelRotationBtn");

const fullscreenBtn = document.getElementById("fullscreenBtn");
const screenshotBtn = document.getElementById("screenshotBtn");

const modeButtons = document.querySelectorAll(".mode-btn");

const toast = document.getElementById("toast");
const viewerResult = document.getElementById("viewerResult");

const scanProgressLabel = document.getElementById("scanProgressLabel");
const scanProgressBar = document.getElementById("scanProgressBar");
const scanProgressCard = document.querySelector(".scan-progress-card");

const infoBtn = document.getElementById("infoBtn");
const infoModal = document.getElementById("infoModal");
const infoModalBackdrop = document.getElementById("infoModalBackdrop");
const infoCloseBtn = document.getElementById("infoCloseBtn");
const infoCloseBottomBtn = document.getElementById("infoCloseBottomBtn");

/* =========================
   STATE
========================= */

let toastTimer = null;
let viewerResultTimer = null;

let activeModelKey = "room";
let activeModelPath = "./models/splats/room.ply";
let activeModelTitle = "Room / Interior";

let currentSplatMeta = null;
let viewerStarted = false;
let isLoading = false;
let isScanning = false;
let isAutoRotating = false;
let visualMode = "natural";

const rotationOffsets = {
    room: { x: 0, y: 0, z: 0 },
    person: { x: 0, y: 0, z: 0 },
    object: { x: 0, y: 0, z: 0 },
    upload: { x: 0, y: 0, z: 0 }
};

let activeUploadFile = null;

const MODEL_ROTATION_STEP = THREE.MathUtils.degToRad(15);

let cameraRotationFrame = null;
let cameraOrbitAngle = 0;
let cameraVerticalAngle = 0;

const AUTO_ROTATE_ORBIT_SPEED = 0.0065;
const AUTO_ROTATE_VERTICAL_SPEED = 0.0035;
const AUTO_ROTATE_VERTICAL_AMPLITUDE = 0.35;

/* =========================
   PRESET SPLAT MODELS
========================= */

const presetModels = {
    room: {
        name: "room.ply",
        path: "./models/splats/room.ply",
        title: "Room / Interior",
        category: "Miestnosť",
        cameraPosition: [0, -5.2, 2.2],
        lookAt: [0, 0, 0.25],
        position: [0, 0, -0.55],
        rotation: [0, 0, 0, 1],
        scale: [0.55, 0.55, 0.55],
        orbitRadius: 5.2
    },

    person: {
        name: "person.ply",
        path: "./models/splats/person.ply",
        title: "Head / Character",
        category: "Postava",
        cameraPosition: [0, -2.2, 1.35],
        lookAt: [0, 0, 0.45],
        position: [0, 0, 0],
        rotation: [0, 1, 0, 0],
        scale: [1.45, 1.45, 1.45],
        orbitRadius: 3.2
    },

    object: {
        name: "object.ply",
        path: "./models/splats/object.ply",
        title: "Object",
        category: "Predmet",
        cameraPosition: [0, -3.2, 1.45],
        lookAt: [0, 0, 0.2],
        position: [0, 0, -0.45],
        rotation: [0, 0, 0, 1],
        scale: [1.15, 1.15, 1.15],
        orbitRadius: 3.2
    }
};

const presetOrder = ["room", "person", "object"];

/* =========================
   GAUSSIAN SPLAT VIEWER
========================= */

if (!viewerStage) {
    throw new Error("viewerStage element was not found.");
}

const splatViewer = new GaussianSplats3D.Viewer({
    rootElement: viewerStage,

    cameraUp: [0, -1, -0.6],
    initialCameraPosition: presetModels.room.cameraPosition,
    initialCameraLookAt: presetModels.room.lookAt,

    sharedMemoryForWorkers: false,
    gpuAcceleratedSort: false,
    splatSortDistanceMapPrecision: 8,

    selfDrivenMode: true,
    useBuiltInControls: true,

    webGLContextAttributes: {
        preserveDrawingBuffer: true
    }
});

/* =========================
   HELPERS
========================= */

function setText(element, value) {
    if (element) {
        element.textContent = value;
    }
}

function setIconButtonLabel(button, value) {
    if (!button) return;

    const label = button.querySelector(".button-label");

    if (label) {
        label.textContent = value;
    } else {
        button.textContent = value;
    }
}

function showToast(message, type = "success") {
    if (!toast) return;

    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    toastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 2200);
}

function showCenterResult(title, text = "", type = "success", autoHide = true) {
    if (!viewerResult) return;

    clearTimeout(viewerResultTimer);

    let icon = "✓";

    if (type === "error") icon = "✕";
    if (type === "warning") icon = "!";

    viewerResult.className = `viewer-result show ${type}`;
    viewerResult.innerHTML = `
        <div class="result-icon">${icon}</div>
        <div class="result-title">${title}</div>
        ${text ? `<p class="result-text">${text}</p>` : ""}
    `;

    if (autoHide) {
        viewerResultTimer = setTimeout(() => {
            hideCenterResult();
        }, type === "success" ? 1150 : 1800);
    }
}

function hideCenterResult() {
    if (!viewerResult) return;

    clearTimeout(viewerResultTimer);
    viewerResult.className = "viewer-result";
    viewerResult.innerHTML = "";
}

function showStatus(text) {
    if (!placeholder) return;

    placeholder.style.display = "grid";
    placeholder.innerHTML = `
        <div class="loading-state">
            <div class="loading-ring"></div>
            <p>${text}</p>
        </div>
    `;
}

function hidePlaceholder() {
    if (!placeholder) return;
    placeholder.style.display = "none";
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "—";

    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let index = 0;

    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }

    return `${size.toFixed(size >= 10 || index === 0 ? 1 : 2)} ${units[index]}`;
}

function setScanProgress(percent, label, state = "") {
    if (scanProgressBar) {
        scanProgressBar.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
    }

    if (scanProgressLabel) {
        scanProgressLabel.textContent = label;
    }

    if (scanProgressCard) {
        scanProgressCard.className = "scan-progress-card";

        if (state) {
            scanProgressCard.classList.add(`is-${state}`);
        }
    }
}

function getAlphaThreshold() {
    if (visualMode === "xray") return 4;
    if (visualMode === "density") return 38;
    return 10;
}

function syncModelCards(modelKey = activeModelKey) {
    modelCards.forEach((card) => {
        card.classList.toggle("active", card.dataset.model === modelKey);
    });
}

function resetStats() {
    currentSplatMeta = null;

    setText(meshCountLabel, "—");
    setText(vertexCountLabel, "—");
    setText(qualityScoreLabel, "—");
    setText(scanComplexityLabel, "—");
    setText(scanDimensionsLabel, "—");

    if (scanComplexityLabel) {
        scanComplexityLabel.className = "";
    }
}

function resetForensicConsole() {
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

    setScanProgress(0, "Awaiting target");
}

function addConsoleLine(text, type = "") {
    if (!consoleLines) return;

    const line = document.createElement("p");
    line.textContent = `> ${text}`;

    if (type) {
        line.classList.add(type);
    }

    consoleLines.appendChild(line);

    while (consoleLines.children.length > 4) {
        consoleLines.removeChild(consoleLines.firstElementChild);
    }
}

function parsePlyHeader(buffer) {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(
        buffer.slice(0, Math.min(buffer.byteLength, 65536))
    );

    const vertexMatch = text.match(/element\s+vertex\s+(\d+)/i);
    const splatMatch = text.match(/element\s+splat\s+(\d+)/i);

    const count = splatMatch
        ? Number(splatMatch[1])
        : vertexMatch
            ? Number(vertexMatch[1])
            : null;

    const looksLikeGaussianSplat =
        text.includes("scale_0") ||
        text.includes("rot_0") ||
        text.includes("opacity") ||
        text.includes("f_dc_0");

    return {
        splatCount: count,
        looksLikeGaussianSplat
    };
}

async function getPresetMeta(path) {
    const response = await fetch(path);

    if (!response.ok) {
        throw new Error(`Could not fetch model: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const parsed = parsePlyHeader(buffer);

    return {
        sizeBytes: buffer.byteLength,
        format: path.split(".").pop().toUpperCase(),
        splatCount: parsed.splatCount,
        looksLikeGaussianSplat: parsed.looksLikeGaussianSplat
    };
}

async function getUploadMeta(file) {
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const parsed = parsePlyHeader(buffer);

    return {
        sizeBytes: file.size,
        format: file.name.split(".").pop().toUpperCase(),
        splatCount: parsed.splatCount,
        looksLikeGaussianSplat: parsed.looksLikeGaussianSplat
    };
}

function getComplexity(meta) {
    const count = meta?.splatCount || 0;

    if (count >= 1000000) {
        return ["Extreme", "complexity-extreme"];
    }

    if (count >= 500000) {
        return ["High", "complexity-high"];
    }

    if (count >= 100000) {
        return ["Medium", "complexity-medium"];
    }

    return ["Low", "complexity-low"];
}

function getCaptureQuality(meta) {
    if (!meta || !meta.splatCount) {
        return "Unknown";
    }

    if (meta.looksLikeGaussianSplat === false) {
        return "Check format";
    }

    if (meta.splatCount < 50000) {
        return "Low detail";
    }

    if (meta.splatCount < 250000) {
        return "Good";
    }

    if (meta.splatCount < 700000) {
        return "High detail";
    }

    return "Very dense";
}

function updateSplatStats(meta) {
    if (!meta) return;

    const [rating, ratingClass] = getComplexity(meta);

    setText(meshCountLabel, "1 scene");
    setText(vertexCountLabel, meta.splatCount ? meta.splatCount.toLocaleString("sk-SK") : "Unknown");
    setText(qualityScoreLabel, getCaptureQuality(meta));
    setText(scanDimensionsLabel, "Gaussian field");
    setText(scanComplexityLabel, rating);

    if (scanComplexityLabel) {
        scanComplexityLabel.className = ratingClass;
    }
}

function setForensicVerdict(meta) {
    if (!forensicVerdict) return;

    let verdictClass = "clean";
    let verdictTitle = "Clean splat capture";
    let verdictText = "Gaussian Splat model loaded correctly. No critical loading issues detected.";

    if (meta && meta.looksLikeGaussianSplat === false && meta.format === "PLY") {
        verdictClass = "warn";
        verdictTitle = "PLY format warning";
        verdictText = "The file is PLY, but its header does not clearly look like a Gaussian Splat PLY.";
    }

    if (meta?.splatCount >= 500000) {
        verdictClass = "warn";
        verdictTitle = "Dense splat target";
        verdictText = "The model contains a high number of splats. Performance may depend on the device.";
    }

    if (meta?.splatCount >= 1000000) {
        verdictClass = "danger";
        verdictTitle = "Heavy splat reconstruction";
        verdictText = "Very dense Gaussian Splat model. Browser performance and loading time should be checked.";
    }

    forensicVerdict.className = `forensic-verdict is-ready ${verdictClass}`;
    forensicVerdict.innerHTML = `
        <span>Verdict</span>
        <strong>${verdictTitle}</strong>
        <p>${verdictText}</p>
    `;
}

function resetCameraForPreset(modelKey = activeModelKey) {
    const preset = presetModels[modelKey] || presetModels.room;

    if (!splatViewer.camera) return;

    splatViewer.camera.position.set(
        preset.cameraPosition[0],
        preset.cameraPosition[1],
        preset.cameraPosition[2]
    );

    splatViewer.camera.lookAt(
        preset.lookAt[0],
        preset.lookAt[1],
        preset.lookAt[2]
    );
}

function buildSceneRotation(baseRotation = [0, 0, 0, 1], modelKey = activeModelKey) {
    const offset = rotationOffsets[modelKey] || rotationOffsets.upload;

    const baseQuaternion = new THREE.Quaternion(
        baseRotation[0],
        baseRotation[1],
        baseRotation[2],
        baseRotation[3]
    );

    const offsetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(offset.x, offset.y, offset.z, "XYZ")
    );

    const finalQuaternion = offsetQuaternion.multiply(baseQuaternion);

    return [
        finalQuaternion.x,
        finalQuaternion.y,
        finalQuaternion.z,
        finalQuaternion.w
    ];
}

function reloadActiveSplatModel() {
    if (activeModelKey === "upload") {
        if (!activeUploadFile) {
            showToast("Uploaded model is not available", "warning");
            return;
        }

        loadSplatModel("upload", activeUploadFile);
        return;
    }

    loadSplatModel(activeModelKey);
}

function rotateActiveModel(axis, amount) {
    const offset = rotationOffsets[activeModelKey] || rotationOffsets.upload;

    offset[axis] += amount;

    reloadActiveSplatModel();
}

function resetActiveModelRotation() {
    const offset = rotationOffsets[activeModelKey] || rotationOffsets.upload;

    offset.x = 0;
    offset.y = 0;
    offset.z = 0;

    reloadActiveSplatModel();
}

function applyVisualStyleMode(mode) {
    const modeClasses = ["mode-natural", "mode-xray", "mode-density"];

    viewerShell?.classList.remove(...modeClasses);
    viewerStage?.classList.remove(...modeClasses);

    viewerShell?.classList.add(`mode-${mode}`);
    viewerStage?.classList.add(`mode-${mode}`);
}

function openInfoModal() {
    if (!infoModal) {
        return;
    }

    infoModal.classList.add("is-open");
    infoModal.setAttribute("aria-hidden", "false");
}

function closeInfoModal() {
    if (!infoModal) {
        return;
    }

    infoModal.classList.remove("is-open");
    infoModal.setAttribute("aria-hidden", "true");
}

function getViewerCanvas() {
    const canvases = Array.from(viewerStage.querySelectorAll("canvas"));

    if (!canvases.length) {
        return null;
    }

    return canvases[canvases.length - 1];
}

function downloadCanvasAsPng(canvas, filename) {
    canvas.toBlob((blob) => {
        if (!blob) {
            showToast("Screenshot failed", "error");
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.download = filename;
        link.href = url;
        link.click();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 500);

        showToast("Screenshot PNG saved");
    }, "image/png");
}

/* =========================
   LOAD SPLAT MODEL
========================= */

async function loadSplatModel(modelKey, customFile = null) {
    if (isLoading) return;

    const isUpload = Boolean(customFile);

    if (isUpload) {
        activeUploadFile = customFile;
    } else {
        activeUploadFile = null;
    }

    const preset = isUpload ? null : presetModels[modelKey];

    if (!isUpload && !preset) return;

    isLoading = true;
    isScanning = false;

    activeModelKey = isUpload ? "upload" : modelKey;
    activeModelPath = isUpload ? URL.createObjectURL(customFile) : preset.path;
    activeModelTitle = isUpload ? customFile.name : preset.title;

    syncModelCards(activeModelKey);
    resetStats();
    resetForensicConsole();
    hideCenterResult();

    setText(fileNameLabel, isUpload ? customFile.name : preset.name);
    setText(fileFormatLabel, isUpload ? customFile.name.split(".").pop().toUpperCase() : "PLY");
    setText(fileSizeLabel, isUpload ? formatFileSize(customFile.size) : "Calculating...");
    setText(fileStatusLabel, "Načítavanie...");

    setText(viewerStatusLabel, "Loading");
    setText(viewerFileLabel, isUpload ? customFile.name : preset.name);
    setText(scanStatusLabel, "Loading target");
    setScanProgress(8, "Loading splat", "scanning");

    showStatus("Načítavam Gaussian Splat model...");

    try {
        if (viewerStarted) {
            await splatViewer.removeSplatScenes([0]);
        }

        currentSplatMeta = isUpload
            ? await getUploadMeta(customFile)
            : await getPresetMeta(preset.path);

        setText(fileSizeLabel, formatFileSize(currentSplatMeta.sizeBytes));

        await splatViewer.addSplatScene(activeModelPath, {
            splatAlphaRemovalThreshold: getAlphaThreshold(),
            showLoadingUI: false,
            progressiveLoad: true,
            position: isUpload ? [0, 0, 0] : preset.position,
            rotation: isUpload
                ? buildSceneRotation([0, 0, 0, 1], "upload")
                : buildSceneRotation(preset.rotation, activeModelKey),
            scale: isUpload ? [1, 1, 1] : preset.scale
        });

        if (!viewerStarted) {
            splatViewer.start();
            viewerStarted = true;
        }

        if (!isUpload) {
            resetCameraForPreset(modelKey);
        }

        hidePlaceholder();

        setText(fileStatusLabel, "Splat model načítaný");
        setText(viewerStatusLabel, "Model loaded");
        setText(scanStatusLabel, "Target loaded");
        setScanProgress(18, "Target ready", "ready");

        showCenterResult(
            "Model loaded",
            `${activeModelTitle} bol úspešne načítaný.`,
            "success"
        );

        if (isUpload) {
            URL.revokeObjectURL(activeModelPath);
        }
    } catch (error) {
        console.error(error);

        showStatus("Splat model sa nepodarilo načítať.");
        showCenterResult(
            "Loading failed",
            "Skontroluj, či ide o Splat PLY / SPLAT / KSPLAT súbor.",
            "error",
            false
        );

        setText(fileStatusLabel, "Chyba načítania");
        setText(viewerStatusLabel, "Error");
        setText(scanStatusLabel, "Loading error");
        setScanProgress(0, "Loading failed", "error");

        if (isUpload) {
            URL.revokeObjectURL(activeModelPath);
        }
    }

    isLoading = false;
}

/* =========================
   SCAN SIMULATION FOR SPLATS
========================= */

function runForensicScan() {
    if (isScanning || isLoading) return;

    if (!viewerStarted || !currentSplatMeta) {
        setText(scanStatusLabel, "No model selected");
        setText(viewerStatusLabel, "No target");
        setScanProgress(0, "No target", "error");
        showToast("No model selected", "warning");
        return;
    }

    isScanning = true;

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
            <p>Gaussian Splat reconstruction is being analyzed.</p>
        `;
    }

    setText(scanStatusLabel, "Scanning...");
    setText(viewerStatusLabel, "Scanning");
    setText(fileStatusLabel, "Splat scan running");
    setScanProgress(32, "Reading splats", "scanning");

    viewerShell?.classList.add("is-scanning");
    viewerStage?.classList.add("is-scanning");

    addConsoleLine("Initializing Gaussian Splat scan...");
    addConsoleLine("Reading splat cloud metadata...");
    addConsoleLine("Checking PLY header...");

    setTimeout(() => {
        addConsoleLine("Splat buffers detected.", "ok");
        setScanProgress(52, "Buffer check", "scanning");
    }, 280);

    setTimeout(() => {
        addConsoleLine("Estimating splat density...");
        setScanProgress(74, "Density check", "scanning");
    }, 650);

    setTimeout(() => {
        updateSplatStats(currentSplatMeta);

        if (currentSplatMeta.looksLikeGaussianSplat) {
            addConsoleLine("Gaussian Splat properties detected.", "ok");
        } else {
            addConsoleLine("PLY header does not clearly expose splat properties.", "warn");
        }

        if (currentSplatMeta.splatCount) {
            addConsoleLine(
                `${currentSplatMeta.splatCount.toLocaleString("sk-SK")} splats indexed.`,
                "ok"
            );
        } else {
            addConsoleLine("Splat count unavailable.", "warn");
        }

        addConsoleLine("Splat report generated.", "ok");

        setForensicVerdict(currentSplatMeta);

        if (consoleState) {
            consoleState.textContent = "DONE";
        }

        setText(scanStatusLabel, "Scan complete");
        setText(viewerStatusLabel, "Scan complete");
        setText(fileStatusLabel, "Forensic report ready");
        setScanProgress(100, "Report complete", "complete");

        viewerShell?.classList.remove("is-scanning");
        viewerStage?.classList.remove("is-scanning");

        showToast("Forensic scan complete");
        isScanning = false;
    }, 1050);
}

/* =========================
   CAMERA AUTO ROTATE
========================= */

function getCurrentPreset() {
    return presetModels[activeModelKey] || presetModels.room;
}

function startCameraOrbit() {
    if (cameraRotationFrame) return;

    const loop = () => {
        if (isAutoRotating && splatViewer.camera) {
            const preset = getCurrentPreset();

            const lookAt = new THREE.Vector3(
                preset.lookAt[0],
                preset.lookAt[1],
                preset.lookAt[2]
            );

            const radius = preset.orbitRadius || 3.2;
            const baseHeight = preset.cameraPosition[2] || 1.6;

            cameraOrbitAngle += AUTO_ROTATE_ORBIT_SPEED;
            cameraVerticalAngle += AUTO_ROTATE_VERTICAL_SPEED;

            const cameraX = lookAt.x + Math.sin(cameraOrbitAngle) * radius;
            const cameraY = lookAt.y - Math.cos(cameraOrbitAngle) * radius;
            const cameraZ =
                lookAt.z +
                baseHeight +
                Math.sin(cameraVerticalAngle) * AUTO_ROTATE_VERTICAL_AMPLITUDE;

            splatViewer.camera.position.set(cameraX, cameraY, cameraZ);
            splatViewer.camera.lookAt(lookAt);
        }

        cameraRotationFrame = requestAnimationFrame(loop);
    };

    loop();
}

/* =========================
   EVENTS
========================= */

modelInput?.addEventListener("change", () => {
    const file = modelInput.files[0];

    if (!file) return;

    const name = file.name.toLowerCase();

    if (!name.endsWith(".ply") && !name.endsWith(".splat") && !name.endsWith(".ksplat")) {
        showCenterResult(
            "Unsupported file",
            "Podporované sú iba .ply, .splat alebo .ksplat súbory.",
            "warning",
            false
        );
        return;
    }

    loadSplatModel("upload", file);
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

    if (!file) return;

    const name = file.name.toLowerCase();

    if (!name.endsWith(".ply") && !name.endsWith(".splat") && !name.endsWith(".ksplat")) {
        showCenterResult(
            "Unsupported file",
            "Podporované sú iba .ply, .splat alebo .ksplat súbory.",
            "warning",
            false
        );
        return;
    }

    loadSplatModel("upload", file);
});

modelCards.forEach((card) => {
    card.addEventListener("click", () => {
        const modelKey = card.dataset.model;
        loadSplatModel(modelKey);
    });
});

modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
        visualMode = button.dataset.mode || "natural";

        modeButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");

        const label = button.querySelector(".mode-label")?.textContent.trim() || button.textContent.trim();

        setText(viewerModeLabel, label);

        applyVisualStyleMode(visualMode);

        if (viewerStarted && presetOrder.includes(activeModelKey)) {
            loadSplatModel(activeModelKey);
        }

        showToast(`${label} mode enabled`);
    });
});

runScanBtn?.addEventListener("click", runForensicScan);

resetViewBtn?.addEventListener("click", () => {
    resetCameraForPreset(activeModelKey);
    showToast("View reset");
});

autoRotateBtn?.addEventListener("click", () => {
    isAutoRotating = !isAutoRotating;

    setIconButtonLabel(
        autoRotateBtn,
        isAutoRotating ? "Auto rotate: ON" : "Auto rotate: OFF"
    );

    if (isAutoRotating) {
        startCameraOrbit();
    }

    showToast(isAutoRotating ? "Auto rotate enabled" : "Auto rotate disabled");
});

gridBtn?.addEventListener("click", () => {
    viewerShell?.classList.toggle("grid-hidden");
    viewerStage?.classList.toggle("grid-hidden");

    const isHidden = viewerShell?.classList.contains("grid-hidden");

    setIconButtonLabel(gridBtn, isHidden ? "Grid: OFF" : "Grid: ON");
    showToast(isHidden ? "Grid disabled" : "Grid enabled");
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
    } catch (error) {
        console.error(error);
        showToast("Fullscreen failed", "error");
    }
});

document.addEventListener("fullscreenchange", () => {
    setIconButtonLabel(
        fullscreenBtn,
        document.fullscreenElement ? "Exit fullscreen" : "Fullscreen"
    );
});

screenshotBtn?.addEventListener("click", async () => {
    const canvas = getViewerCanvas();

    if (!canvas) {
        showToast("Screenshot failed: canvas not found", "error");
        return;
    }

    try {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const screenshotCanvas = document.createElement("canvas");

        screenshotCanvas.width = canvas.width;
        screenshotCanvas.height = canvas.height;

        const context = screenshotCanvas.getContext("2d");

        context.fillStyle = "#050812";
        context.fillRect(0, 0, screenshotCanvas.width, screenshotCanvas.height);
        context.drawImage(canvas, 0, 0);

        downloadCanvasAsPng(screenshotCanvas, "3d-gaussian-splat-scan.png");
    } catch (error) {
        console.error(error);
        showToast("Screenshot failed", "error");
    }
});

rotateModelLeftBtn?.addEventListener("click", () => {
    rotateActiveModel("z", MODEL_ROTATION_STEP);
    showToast("Model rotated left");
});

rotateModelRightBtn?.addEventListener("click", () => {
    rotateActiveModel("z", -MODEL_ROTATION_STEP);
    showToast("Model rotated right");
});

resetModelRotationBtn?.addEventListener("click", () => {
    resetActiveModelRotation();
    showToast("Model rotation reset");
});

infoBtn?.addEventListener("click", openInfoModal);
infoModalBackdrop?.addEventListener("click", closeInfoModal);
infoCloseBtn?.addEventListener("click", closeInfoModal);
infoCloseBottomBtn?.addEventListener("click", closeInfoModal);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeInfoModal();
    }
});

/* =========================
   INIT
========================= */

resetStats();
resetForensicConsole();
syncModelCards("room");
applyVisualStyleMode("natural");
setIconButtonLabel(autoRotateBtn, "Auto rotate: OFF");
setScanProgress(0, "Awaiting target");

loadSplatModel("room");
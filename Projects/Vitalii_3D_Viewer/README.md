# 3D Forensic Scanner

<img width="1254" height="1254" alt="thumbnail" src="https://github.com/user-attachments/assets/3071ac2a-d96e-4dd9-bb13-d99a05c31876" />

## Project description

**3D Forensic Scanner** is an interactive web application for visual analysis of 3D models.

The project was created as part of the MSAP multimedia assignment. The main goal is to present 3D content in an interactive and visually attractive way using a forensic-style scanner interface.

The application allows the user to load 3D models, inspect them directly in the browser, switch between visualization modes, run a simulated forensic scan, display geometry statistics, generate a scan verdict and mark the model with evidence-style annotations.

The final project is located in:

```text
Projects/Vitalii_3D_Viewer/
```

---

## Main idea

The project is focused on **3D content** and interactive model analysis.

Instead of showing a static 3D object, the application presents the model as a scanned forensic target. After running the scan, the viewer displays:

- a live forensic log;
- a scan verdict;
- model geometry statistics;
- a bounding box around the model;
- evidence markers placed directly on the 3D object;
- fullscreen preview;
- PNG screenshot export.

This creates the effect of a digital forensic analysis tool for reconstructed 3D evidence.

---

## Main functionality

The application supports:

- loading predefined 3D models in `.glb` format;
- uploading a custom `.glb` model from the user's computer;
- interactive 3D viewing with mouse controls;
- automatic model rotation;
- grid visualization;
- fullscreen mode;
- PNG screenshot export;
- Surface, Wireframe and X-Ray visualization modes;
- forensic scan simulation;
- live forensic log;
- automatic scan verdict generation;
- geometric statistics:
  - mesh count;
  - vertex count;
  - triangle count;
  - model dimensions;
  - complexity rating;
- forensic bounding box around the scanned model;
- evidence markers placed on the model after scanning;
- visual loading and scan status overlays;
- custom favicon and project thumbnail.

---

## Technologies used

- HTML5
- CSS3
- JavaScript
- Three.js
- GLTFLoader
- OrbitControls
- Blender
- KIRI Engine / 3D scanning tools for model preparation

---

## How to run the project

The project must be started through a local server.

Opening `index.html` directly by double-clicking is not recommended, because Three.js modules and local 3D assets may not load correctly in the browser.

---

### Option 1: Run with VS Code Live Server

1. Open the repository folder in Visual Studio Code.
2. Go to:

```text
Projects/Vitalii_3D_Viewer/
```

3. Install the **Live Server** extension if it is not installed.
4. Right-click on `index.html`.
5. Select **Open with Live Server**.
6. The project will open in the browser.

Example local address:

```text
http://127.0.0.1:5500/Projects/Vitalii_3D_Viewer/
```

---

### Option 2: Run with Python local server

Open a terminal in the root repository folder:

```text
B-MSAP-WEB-main/
```

Then run:

```bash
python -m http.server 5500
```

Open this address in the browser:

```text
http://127.0.0.1:5500/Projects/Vitalii_3D_Viewer/
```

---

### Option 3: Run through the provided web portal

If the whole MSAP web framework is used, the project can also be accessed through the `Projects` directory inside the web portal structure.

Project path:

```text
Projects/Vitalii_3D_Viewer/
```

---

## How to use the application

1. Open the application in the browser.
2. Select one of the predefined models:
   - Room / Interior
   - Head / Character
   - Object
3. Or upload your own `.glb` file.
4. Use mouse controls to inspect the model:
   - Left mouse button: rotate
   - Mouse wheel: zoom
   - Right mouse button: pan
5. Select a visualization mode:
   - Surface
   - Wireframe
   - X-Ray
6. Click **Run scan**.
7. After the scan, the application displays:
   - live forensic log;
   - scan verdict;
   - geometric statistics;
   - bounding box;
   - evidence markers.

---

## Viewer controls

| Control | Function |
|---|---|
| Surface | Shows the normal textured model |
| Wireframe | Shows the model as wireframe geometry |
| X-Ray | Shows transparent model with wireframe overlay |
| Reset view | Resets the camera position |
| Auto rotate | Enables or disables automatic model rotation |
| Grid | Enables or disables the scene grid |
| Fullscreen | Opens the viewer in fullscreen mode |
| Screenshot PNG | Exports the current viewer image as PNG |
| Run scan | Starts forensic analysis simulation |

---

## Forensic scan output

After running the scan, the application calculates and displays:

| Output | Description |
|---|---|
| Complexity | Estimated complexity level based on triangle count |
| Dimensions | Model size in the 3D scene |
| Meshes | Number of mesh objects in the model |
| Vertices | Number of vertices |
| Triangles | Number of triangles |
| Verdict | Simple forensic conclusion based on model complexity |
| Markers | Evidence-style points placed on the model |
| Bounding box | Visual boundary of the scanned model |

---

## Supported model format

The application supports:

```text
.glb
```

The `.glb` format is used because it can store geometry, materials and textures in a single file. This makes it suitable for browser-based 3D applications.

---

## Project structure

```text
B-MSAP-WEB-main/
│
├── app.py
├── README.md
├── static/
├── templates/
│
└── Projects/
    └── Vitalii_3D_Viewer/
        │
        ├── index.html                  # Main HTML structure
        ├── style.css                   # Visual design and responsive layout
        ├── script.js                   # Three.js logic and scanner functionality
        ├── thumbnail.png               # Project thumbnail
        │
        ├── assets/                     # Favicon and icon assets
        │   ├── favicon.ico
        │   ├── favicon-32.png
        │   ├── apple-touch-icon.png
        │   ├── icon-192.png
        │   └── icon-512.png
        │
        ├── models/
        │   │
        │   ├── modelsforweb/           # Optimized GLB models used directly by the web viewer
        │   │   ├── room.glb
        │   │   ├── person.glb
        │   │   └── object.glb
        │   │
        │   ├── object/                 # Source data and exported model for the object scan
        │   │   ├── 01_ROOT_DATASET/    # Original photos used for reconstruction
        │   │   ├── 02_TRAINED_MODEL/   # Reconstructed PLY model and texture
        │   │   ├── 03_SCREENSHOT/      # Preview screenshot
        │   │   ├── 04_LICENSE/         # License information
        │   │   └── object.glb          # Exported GLB model
        │   │
        │   ├── person/                 # Source data and exported model for the person scan
        │   │   ├── 01_ROOT_DATASET/    # Original photos used for reconstruction
        │   │   ├── 02_TRAINED_MODEL/   # Reconstructed PLY model and texture
        │   │   ├── 03_SCREENSHOT/      # Preview screenshot
        │   │   └── 04_LICENSE/         # License information
        │   │
        │   ├── room/                   # Source data and exported model for the room scan
        │   │   ├── 01_ROOT_DATASET/    # Original photos used for reconstruction
        │   │   ├── 02_TRAINED_MODEL/   # Reconstructed PLY model and texture
        │   │   ├── 03_SCREENSHOT/      # Preview screenshot
        │   │   └── 04_LICENSE/         # License information
        │   │
        │   └── custommodels/           # Additional or backup custom models
        │
        └── vendor/
            └── three/
                ├── three.module.js
                └── addons/
                    ├── loaders/
                    │   └── GLTFLoader.js
                    └── controls/
                        └── OrbitControls.js
```

---

## 3D models

The project uses several predefined models:

| Model | Description |
|---|---|
| Room / Interior | Example room or interior reconstruction |
| Head / Character | Character or person-related scan |
| Object | Object reconstructed from photos or 3D scanning workflow |

The application also allows the user to upload a custom `.glb` model.

---

## 3D model folders

The project contains both optimized web models and source reconstruction data.

The web application loads optimized `.glb` files from:

```text
Projects/Vitalii_3D_Viewer/models/modelsforweb/
```

These files are used directly by the Three.js viewer:

```text
Projects/Vitalii_3D_Viewer/models/modelsforweb/room.glb
Projects/Vitalii_3D_Viewer/models/modelsforweb/person.glb
Projects/Vitalii_3D_Viewer/models/modelsforweb/object.glb
```

The folders `models/room/`, `models/person/` and `models/object/` contain the source data used during the reconstruction process. They include original photo datasets, trained PLY models, textures, screenshots and license information.

This structure keeps final web-ready `.glb` files separated from raw reconstruction data.

---

## Notes

The application is fully client-side and does not require a backend server.

All model loading, visualization and scanning effects are handled directly in the browser using Three.js.

For correct functionality, the project should be served through a local server because ES modules and local 3D assets may be blocked when opening the HTML file directly.

Large archive files such as `.rar`, `.zip` and `.7z` should not be included in the Git repository. The project should be stored as normal folders and source files.

---

## Author

Vitalii Maksym

MSAP project  
3D content – interactive forensic scanner

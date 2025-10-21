# Asset Setup Guide

## Required Directory Structure

```
WebAR-Project/
├── assets/
│   ├── climbing_gym_1k.hdr
│   └── CERA_V11_low_001_Self_optimize3.glb
├── libs/
│   └── draco/
│       ├── draco_decoder.js
│       ├── draco_decoder.wasm
│       ├── draco_wasm_wrapper.js (optional, three.js r170 기준)
│       └── gltf/ (optional subfolder in some versions)
└── src/
    ├── main.js
    ├── ar.js
    └── utils.js
```

## Draco Decoder Files

**Download from:**
https://github.com/mrdoob/three.js/tree/r170/examples/jsm/libs/draco

또는 npm 패키지 사용:
```bash
npm install three
# Copy from node_modules/three/examples/jsm/libs/draco/ to libs/draco/
```

**Required files in `libs/draco/`:**
- `draco_decoder.js` (JavaScript decoder)
- `draco_decoder.wasm` (WebAssembly decoder, optional but faster)
- `draco_wasm_wrapper.js` (wrapper for WASM, version-dependent)

## Asset Paths

All asset paths use `import.meta.url` for robust resolution on:
- GitHub Pages subpath deployments (e.g., `https://user.github.io/repo-name/`)
- Local static servers
- Any CDN or hosting environment

**DO NOT use absolute paths like `/assets/file.glb`** — they will 404 on subpath deployments.

## Verification

Test locally:
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

Check browser console for:
- ✅ "HDR loaded: ..." (200 OK)
- ✅ "Model loaded: ..." (200 OK)
- ❌ No 404 errors for climbing_gym_1k.hdr or CERA_V11_low_001_Self_optimize3.glb

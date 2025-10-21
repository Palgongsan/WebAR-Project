import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/RGBELoader.js';
import { showToast } from './utils.js';

let scene, camera, renderer, model;

// import.meta.url로 상대 경로 해결 → GitHub Pages 하위 경로 대응
const ASSETS_BASE = new URL('../assets/', import.meta.url).href;
const HDR_PATH = new URL('../assets/climbing_gym_1k.hdr', import.meta.url).href;
const MODEL_PATH = new URL('../assets/CERA_V11_low_001_Self_optimize3.glb', import.meta.url).href;
const DRACO_PATH = new URL('../libs/draco/', import.meta.url).href;

export async function initARScene() {
  const container = document.getElementById('canvas-container');

  // Scene setup
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);

  // Load HDR environment
  await loadHDREnvironment();

  // Load GLTF model with Draco
  await loadModel();

  // Animation loop
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

async function loadHDREnvironment() {
  return new Promise((resolve, reject) => {
    const rgbeLoader = new RGBELoader();

    rgbeLoader.load(
      HDR_PATH,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
        console.log('HDR loaded:', HDR_PATH);
        resolve();
      },
      undefined,
      (error) => {
        console.error('HDR load failed:', error);
        showToast('HDR 로드 실패 — 경로 확인');
        reject(error);
      }
    );
  });
}

async function loadModel() {
  return new Promise((resolve, reject) => {
    const dracoLoader = new DRACOLoader();
    // Draco decoder 경로 설정 (import.meta.url 기반)
    dracoLoader.setDecoderPath(DRACO_PATH);
    dracoLoader.setDecoderConfig({ type: 'js' }); // 'js' 또는 'wasm'

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(
      MODEL_PATH,
      (gltf) => {
        model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0, 0, -2);
        scene.add(model);
        console.log('Model loaded:', MODEL_PATH);
        resolve();
      },
      undefined,
      (error) => {
        console.error('Model load failed:', error);
        showToast('모델 로드 실패 — 경로 확인');
        reject(error);
      }
    );
  });
}

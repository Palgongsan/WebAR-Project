import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { showToast } from './utils.js';

let scene, camera, renderer, model, controls;

// import.meta.url로 상대 경로 해결 → GitHub Pages 하위 경로 대응
const ASSETS_BASE = new URL('../assets/', import.meta.url).href;
const HDR_PATH = new URL('../assets/climbing_gym_1k.hdr', import.meta.url).href;
const MODEL_PATH = new URL('../assets/CERA_V11_low_001_Self_optimize3.glb', import.meta.url).href;
const DRACO_PATH = new URL('../libs/draco/', import.meta.url).href;

export async function initARScene() {
  const container = document.getElementById('canvas-container');

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a); // 어두운 회색 배경

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // OrbitControls 추가 (모델 조작 가능)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -2);
  controls.update();

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
    controls.update(); // OrbitControls 업데이트
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
        scene.environment = texture; // 리플렉션과 조명에만 영향
        // scene.background는 설정하지 않음 (HDR 배경 숨김)
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

// AR 세션 시작 함수
export async function startARSession() {
  if (!navigator.xr) {
    showToast('WebXR을 지원하지 않는 브라우저입니다');
    console.error('WebXR not supported');
    return;
  }

  try {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
      showToast('AR 모드를 지원하지 않는 기기입니다');
      console.error('AR not supported on this device');
      return;
    }

    // AR 세션 시작
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'dom-overlay'],
      domOverlay: { root: document.body }
    });

    await renderer.xr.setSession(session);
    showToast('AR 모드 시작됨');
    console.log('AR session started');

    // AR 세션이 종료되면 일반 모드로 복귀
    session.addEventListener('end', () => {
      showToast('AR 모드 종료됨');
      console.log('AR session ended');
    });

  } catch (error) {
    console.error('AR session failed:', error);
    showToast('AR 시작 실패 — ' + error.message);
  }
}

// 랜딩 페이지 - 3D 프리뷰
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let scene, camera, renderer, controls;
let model, mixer;
let animationId;

export function initLanding() {
    const container = document.getElementById('preview-container');

    // 씬 설정
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // 카메라
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(2, 1.5, 2);

    // 렌더러 (model-viewer 스타일)
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.target.set(0, 0.5, 0);
    controls.update();

    // 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -5;
    dirLight.shadow.camera.right = 5;
    dirLight.shadow.camera.top = 5;
    dirLight.shadow.camera.bottom = -5;
    scene.add(dirLight);

    // 바닥 (그림자용)
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // HDR 환경 로딩
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load('/climbing_gym_1k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;
        texture.dispose();
        pmremGenerator.dispose();
    });

    // GLB 모델 로딩
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('/CERA_V11_low_001_Self_optimize3.glb', (gltf) => {
        model = gltf.scene;
        model.scale.set(1, 1, 1); // 실제 스케일 유지

        // 그림자 설정
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(model);

        // 애니메이션 믹서 (프리뷰에서는 기본 포즈만 표시)
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            // 첫 번째 포즈 적용 (CERA_V11_ChairMode(1)_Baked)
            const chairClip = THREE.AnimationClip.findByName(gltf.animations, 'CERA_V11_ChairMode(1)_Baked');
            if (chairClip) {
                const action = mixer.clipAction(chairClip);
                action.play();
                action.paused = true; // 정지 상태로 포즈만 표시
            }
        }
    });

    // 리사이즈 처리
    window.addEventListener('resize', onWindowResize);

    // 렌더 루프
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    animationId = requestAnimationFrame(animate);

    if (controls) controls.update();
    if (mixer) mixer.update(0.016);

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

export function cleanupLanding() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    window.removeEventListener('resize', onWindowResize);

    if (renderer) {
        const container = document.getElementById('preview-container');
        if (container && renderer.domElement) {
            container.removeChild(renderer.domElement);
        }
        renderer.dispose();
    }

    if (controls) {
        controls.dispose();
    }

    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    model = null;
    mixer = null;
}

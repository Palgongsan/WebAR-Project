// AR 모드 - WebXR 세션
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let scene, camera, renderer, gl;
let xrSession = null;
let xrRefSpace = null;
let hitTestSource = null;
let hitTestSourceRequested = false;

let reticle;
let model, mixer;
let chairAction, stretchAction;
let currentPose = 'chair'; // 'chair' or 'stretch'
let isTransitioning = false;

let isModelPlaced = false;
let modelAnchor = null;
let modelPosition = new THREE.Vector3();
let modelRotation = new THREE.Euler();

// 터치 상태
let touchStartDistance = 0;
let lastTouchX = 0;

export async function initAR() {
    // WebXR 지원 확인
    if (!navigator.xr) {
        showStatus('WebXR을 지원하지 않는 브라우저입니다', true);
        return;
    }

    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
        showStatus('AR 모드를 지원하지 않습니다', true);
        return;
    }

    setupScene();
    setupButtons();
    startARSession();
}

function setupScene() {
    // 씬
    scene = new THREE.Scene();

    // 카메라
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // 렌더러
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;

    document.getElementById('ar-view').appendChild(renderer.domElement);

    // 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(1, 3, 2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // HDR 환경
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load('/climbing_gym_1k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;
        texture.dispose();
        pmremGenerator.dispose();
    });

    // 레티클 (배치 타겟 표시)
    const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // GLB 모델 로딩
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('/CERA_V11_low_001_Self_optimize3.glb', (gltf) => {
        model = gltf.scene;
        model.scale.set(1, 1, 1); // 실제 스케일 고정
        model.visible = false;

        // 그림자
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // 그림자 평면 추가
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
            new THREE.ShadowMaterial({ opacity: 0.4 })
        );
        shadowPlane.receiveShadow = true;
        model.add(shadowPlane);

        scene.add(model);

        // 애니메이션 믹서 설정
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);

            // 두 포즈 애니메이션
            chairAction = mixer.clipAction(
                THREE.AnimationClip.findByName(gltf.animations, 'CERA_V11_ChairMode(1)_Baked')
            );
            stretchAction = mixer.clipAction(
                THREE.AnimationClip.findByName(gltf.animations, 'CERA_V11_Stretch(1)_Baked')
            );

            if (chairAction && stretchAction) {
                // 초기 설정: 의자모드 활성, 눕기모드 비활성
                chairAction.play();
                chairAction.setEffectiveWeight(1.0);
                chairAction.paused = true;

                stretchAction.play();
                stretchAction.setEffectiveWeight(0.0);
                stretchAction.paused = true;

                currentPose = 'chair';
            }
        }
    });
}

function setupButtons() {
    const chairBtn = document.getElementById('chair-mode-btn');
    const stretchBtn = document.getElementById('stretch-mode-btn');

    chairBtn.classList.add('active');

    chairBtn.addEventListener('click', () => {
        if (currentPose !== 'chair' && !isTransitioning && model && model.visible) {
            switchPose('chair');
            chairBtn.classList.add('active');
            stretchBtn.classList.remove('active');
        }
    });

    stretchBtn.addEventListener('click', () => {
        if (currentPose !== 'stretch' && !isTransitioning && model && model.visible) {
            switchPose('stretch');
            stretchBtn.classList.add('active');
            chairBtn.classList.remove('active');
        }
    });
}

// 포즈 전환 (3초 ease-in-out 크로스페이드)
function switchPose(targetPose) {
    if (!chairAction || !stretchAction || isTransitioning) return;

    isTransitioning = true;
    const duration = 3.0; // 3초
    const startTime = performance.now();

    const fromAction = targetPose === 'chair' ? stretchAction : chairAction;
    const toAction = targetPose === 'chair' ? chairAction : stretchAction;

    const startWeightFrom = fromAction.getEffectiveWeight();
    const startWeightTo = toAction.getEffectiveWeight();

    function animateTransition() {
        const elapsed = (performance.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1.0);

        // ease-in-out 커브
        const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        fromAction.setEffectiveWeight(startWeightFrom * (1 - eased));
        toAction.setEffectiveWeight(startWeightTo + (1 - startWeightTo) * eased);

        if (progress < 1.0) {
            requestAnimationFrame(animateTransition);
        } else {
            fromAction.setEffectiveWeight(0);
            toAction.setEffectiveWeight(1);
            currentPose = targetPose;
            isTransitioning = false;
        }
    }

    animateTransition();
}

async function startARSession() {
    try {
        xrSession = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test', 'anchors'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.getElementById('ar-view') }
        });

        await renderer.xr.setSession(xrSession);
        xrRefSpace = await xrSession.requestReferenceSpace('local-floor');

        // 터치 이벤트
        xrSession.addEventListener('select', onSelect);

        // 렌더 루프
        renderer.setAnimationLoop(render);

        showStatus('화면을 터치하여 배치하세요', false);
    } catch (err) {
        console.error('AR 세션 시작 실패:', err);
        showStatus('AR 세션을 시작할 수 없습니다', true);
    }
}

function onSelect(event) {
    if (!isModelPlaced && reticle.visible && model) {
        // 첫 번째 탭: 모델 배치 및 앵커링
        placeModel();
    }
}

async function placeModel() {
    if (!model || !reticle.visible) return;

    // 레티클 위치에 모델 배치
    const reticleMatrix = new THREE.Matrix4();
    reticleMatrix.fromArray(reticle.matrix);

    model.position.setFromMatrixPosition(reticleMatrix);
    model.rotation.set(0, 0, 0);
    model.visible = true;

    // 위치 저장 (회전용)
    modelPosition.copy(model.position);
    modelRotation.copy(model.rotation);

    // 앵커 생성 시도
    try {
        const frame = xrSession.requestAnimationFrame(() => {});
        if (xrRefSpace && reticle.matrix) {
            const anchorPose = new XRRigidTransform(
                { x: modelPosition.x, y: modelPosition.y, z: modelPosition.z }
            );
            // 앵커 생성 (지원 여부에 따라 fallback)
            if (xrSession.createAnchor) {
                modelAnchor = await xrSession.createAnchor(anchorPose, xrRefSpace);
            }
        }
    } catch (err) {
        console.warn('앵커 생성 실패, 위치 고정 모드 사용:', err);
    }

    isModelPlaced = true;
    reticle.visible = false;
    showStatus('', false);

    // 투핑거 회전 이벤트 (간단한 구현)
    setupRotationControls();
}

function setupRotationControls() {
    // 터치 회전 (간단한 Y축 회전)
    let rotating = false;
    let startRotation = 0;

    const canvas = renderer.domElement;

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2 && isModelPlaced) {
            rotating = true;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const angle = Math.atan2(touch2.pageY - touch1.pageY, touch2.pageX - touch1.pageX);
            startRotation = angle - modelRotation.y;
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        if (rotating && e.touches.length === 2 && isModelPlaced && model) {
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const angle = Math.atan2(touch2.pageY - touch1.pageY, touch2.pageX - touch1.pageX);
            modelRotation.y = angle - startRotation;
            model.rotation.y = modelRotation.y;
        }
    });

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            rotating = false;
        }
    });
}

function render(timestamp, frame) {
    if (frame && xrRefSpace) {
        // Hit test (배치 전에만)
        if (!isModelPlaced) {
            if (!hitTestSourceRequested) {
                requestHitTestSource();
            }

            if (hitTestSource) {
                const hitTestResults = frame.getHitTestResults(hitTestSource);
                if (hitTestResults.length > 0) {
                    const hit = hitTestResults[0];
                    const pose = hit.getPose(xrRefSpace);
                    reticle.visible = true;
                    reticle.matrix.fromArray(pose.transform.matrix);
                }
            }
        } else {
            // 앵커가 있으면 앵커 위치 추적 (선택적)
            if (modelAnchor) {
                const anchorPose = frame.getPose(modelAnchor.anchorSpace, xrRefSpace);
                if (anchorPose && model) {
                    model.position.setFromMatrixPosition(
                        new THREE.Matrix4().fromArray(anchorPose.transform.matrix)
                    );
                    // 회전은 사용자가 설정한 값 유지
                }
            }
        }

        // 애니메이션 믹서 업데이트
        if (mixer) {
            mixer.update(0.016);
        }

        renderer.render(scene, camera);
    }
}

async function requestHitTestSource() {
    if (xrSession && xrRefSpace) {
        try {
            const session = xrSession;
            hitTestSource = await session.requestHitTestSource({ space: await session.requestReferenceSpace('viewer') });
            hitTestSourceRequested = true;
        } catch (err) {
            console.error('Hit test source 요청 실패:', err);
        }
    }
}

function showStatus(message, permanent = false) {
    const statusEl = document.getElementById('ar-status');
    statusEl.textContent = message;

    if (message) {
        statusEl.classList.add('show');
        if (!permanent) {
            setTimeout(() => {
                statusEl.classList.remove('show');
            }, 3000);
        }
    } else {
        statusEl.classList.remove('show');
    }
}

export function cleanupAR() {
    if (xrSession) {
        xrSession.end();
        xrSession = null;
    }

    if (renderer) {
        renderer.setAnimationLoop(null);
        const container = document.getElementById('ar-view');
        if (container && renderer.domElement && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
        }
        renderer.dispose();
    }

    // 상태 초기화
    scene = null;
    camera = null;
    renderer = null;
    xrRefSpace = null;
    hitTestSource = null;
    hitTestSourceRequested = false;
    isModelPlaced = false;
    modelAnchor = null;
    reticle = null;
    model = null;
    mixer = null;
    chairAction = null;
    stretchAction = null;
    currentPose = 'chair';
    isTransitioning = false;
}

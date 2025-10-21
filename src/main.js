// import.meta.url 사용 이유: GitHub Pages 하위 경로 배포 시 절대 경로 '/assets/' 404 방지
import { initARScene } from './ar.js';
import { showToast } from './utils.js';

const startButton = document.getElementById('start-ar');
const loading = document.getElementById('loading');

async function init() {
  try {
    // AR 씬 초기화 (모델 & HDR 로드 포함)
    await initARScene();

    loading.style.display = 'none';
    startButton.style.display = 'block';

    startButton.addEventListener('click', () => {
      // WebXR 세션 시작 로직은 ar.js에서 처리
      showToast('AR 세션 시작');
    });
  } catch (error) {
    console.error('Initialization error:', error);
    loading.textContent = '초기화 실패';
    showToast('앱 로드 실패 — 콘솔 확인');
  }
}

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

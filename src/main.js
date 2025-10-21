// 라우팅 및 공유 상태 관리
import { initLanding, cleanupLanding } from './landing.js';
import { initAR, cleanupAR } from './ar.js';

class App {
    constructor() {
        this.currentView = null;
        this.init();
    }

    init() {
        // 라우팅 설정
        window.addEventListener('hashchange', () => this.route());

        // 초기 라우팅
        if (!window.location.hash) {
            window.location.hash = '#/landing';
        } else {
            this.route();
        }

        // 버튼 이벤트
        document.getElementById('enter-ar-btn').addEventListener('click', () => {
            window.location.hash = '#/ar';
        });

        document.getElementById('exit-ar-btn').addEventListener('click', () => {
            window.location.hash = '#/landing';
        });
    }

    route() {
        const hash = window.location.hash;

        // 이전 뷰 정리
        if (this.currentView === 'landing') {
            cleanupLanding();
        } else if (this.currentView === 'ar') {
            cleanupAR();
        }

        // 뷰 전환
        if (hash === '#/landing' || hash === '#/') {
            this.showLanding();
        } else if (hash === '#/ar') {
            this.showAR();
        }
    }

    showLanding() {
        this.currentView = 'landing';
        document.getElementById('landing-view').classList.remove('hidden');
        document.getElementById('ar-view').classList.add('hidden');
        initLanding();
    }

    showAR() {
        this.currentView = 'ar';
        document.getElementById('landing-view').classList.add('hidden');
        document.getElementById('ar-view').classList.remove('hidden');
        initAR();
    }
}

// 앱 시작
new App();

# WebAR 가구 배치 앱

Three.js + WebXR 기반 AR 가구 배치 애플리케이션

## 빠른 시작

### 로컬 실행

정적 서버가 필요합니다. 다음 중 하나를 선택하세요:

```bash
# npx serve 사용 (Node.js 필요)
npx serve

# Python 3 사용
python -m http.server 8000

# Python 2 사용
python -m SimpleHTTPServer 8000
```

브라우저에서 `http://localhost:3000` (또는 해당 포트)로 접속

### AR 테스트

- **Android**: Chrome 또는 Edge 브라우저 사용
- **iOS**: Safari 브라우저 사용 (iOS 15+)
- **개발**: Chrome의 WebXR API Emulator 확장 사용

## 파일 구조

```
/
├── index.html                              # 메인 HTML
├── styles.css                              # 스타일시트
├── README.md                               # 이 파일
├── climbing_gym_1k.hdr                     # HDR 환경맵
├── CERA_V11_low_001_Self_optimize3.glb    # 3D 모델
└── src/
    ├── main.js                             # 라우팅 & 앱 진입점
    ├── landing.js                          # 랜딩 페이지 (3D 프리뷰)
    └── ar.js                               # AR 모드 (WebXR)
```

## 기능

1. **랜딩 페이지**: 3D 프리뷰 + "AR 체험하기" 버튼
2. **AR 모드**:
   - 화면 터치로 모델 배치 및 앵커링
   - 두 손가락 회전으로 Y축 회전
   - 두 가지 포즈 전환 (의자모드 ↔ 눕기모드)
   - 3초 ease-in/out 크로스페이드 애니메이션
   - 실제 스케일 고정 (스케일링 비활성화)

## 기술 스택

- **Three.js** r160
- **WebXR** (immersive-ar)
- **PBR 렌더링**: ACES Filmic tone mapping, HDR IBL
- **Soft shadows**: PCFSoftShadowMap
- **Animation**: AnimationMixer + weight-based blending

## 다음 변경사항

이 초기 scaffold 이후 모든 변경사항은 **diff/patch 형식**으로만 제공됩니다.

// 간단한 토스트 알림 (한국어 에러 메시지용)
export function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, duration);

  console.log('[Toast]', message);
}

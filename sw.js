/**
 * 정수학 PWA 서비스 워커 (최종본)
 */

// 1. 캐시 이름 (버전을 v3로 올려서 새로운 offline.html을 강제 업데이트합니다)
const CACHE_NAME = '정수학-cache-v3';

// 2. 캐싱할 파일 (이제 로고가 HTML 안에 있으므로 이 파일 하나면 충분합니다)
const ASSETS_TO_CACHE = [
  'offline.html'
];

// [설치] 서비스 워커가 처음 설치될 때 실행
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] 정수학 오프라인 페이지 캐싱 완료');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// [활성화] 이전 캐시 삭제 및 제어권 획득
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// [요청 처리] 오프라인일 때 저장된 페이지 반환
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // 네트워크 실패 시 캐시된 offline.html 반환
        return caches.match('offline.html');
      })
    );
  } else {
    // 이미지 등 기타 리소스는 네트워크 우선, 실패 시 캐시 확인
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
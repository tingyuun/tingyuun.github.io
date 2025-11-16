// Service Worker for 黃庭筠互動網站
const CACHE_VERSION = 'v1.1.0';
const CACHE_NAME = `tingyuun-cache-${CACHE_VERSION}`;

// 需要快取的核心資源
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/gallery.html',
  '/story.html',
  '/faq.html',
  '/resources.html',
  '/disclaimer.html',
  '/404.html',
  '/css/common.css',
  '/js/common.js',
  '/manifest.json'
];

// 需要快取的圖片資源 (擴充列表以包含所有主要圖片)
const IMAGE_ASSETS = [
  '/images/favicon.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/favicon.webp',
  '/images/help/student_id.webp',
  // Profiles
  '/images/profiles/1.webp',
  '/images/profiles/2.webp',
  '/images/profiles/3.webp',
  '/images/profiles/4.webp',
  '/images/profiles/5.webp',
  '/images/profiles/6.webp',
  // Cumshots
  '/images/cum/1.webp',
  '/images/cum/2.webp',
  '/images/cum/3.webp',
  '/images/cum/4.webp',
  '/images/cum/5.webp',
  '/images/cum/6.webp',
  '/images/cum/7.webp',
  '/images/cum/8.webp',
  '/images/cum_9.webp',
  '/images/cum/10.webp',
  '/images/cum/11.webp',
  '/images/cum/12.webp',
  '/images/cum/13.webp',
  '/images/cum/14.webp'
];

// 安裝事件 - 快取核心資源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core assets');
        // 使用 { ignoreVary: true } 來避免 vary header 問題
        const requests = [...CORE_ASSETS, ...IMAGE_ASSETS].map(url => new Request(url, { cache: 'reload' }));
        return cache.addAll(requests);
      })
      .then(() => {
        console.log('[SW] Core assets cached');
        return self.skipWaiting(); // 立即啟用新 SW
      })
      .catch((error) => {
        console.error('[SW] Cache installation failed:', error);
      })
  );
});

// 啟用事件 - 清理舊快取
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('tingyuun-cache-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim(); // 立即控制所有頁面
      })
  );
});

// Fetch 事件 - 快取策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只處理同源請求
  if (url.origin !== location.origin) {
    return;
  }
  
  // 策略: Cache First (優先快取) for 靜態資源
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // 策略: Network First (優先網路) for HTML 頁面
  if (isHTMLPage(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // 策略: Stale While Revalidate for 圖片
  if (isImage(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  
  // 預設: 網路優先
  event.respondWith(fetch(request));
});

// 判斷是否為靜態資源
function isStaticAsset(pathname) {
  return pathname.endsWith('.css') || 
         pathname.endsWith('.js') || 
         pathname.endsWith('.json');
}

// 判斷是否為 HTML 頁面
function isHTMLPage(pathname) {
  return pathname.endsWith('.html') || pathname === '/';
}

// 判斷是否為圖片
function isImage(pathname) {
  return pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|ico)$/);
}

// Cache First 策略
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(request);
  
  // 快取成功的回應
  if (response.ok) {
    cache.put(request, response.clone());
  }
  
  return response;
}

// Network First 策略
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch(request);
    
    // 快取成功的回應
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // 如果是 HTML 頁面且快取也沒有,返回 404 頁面
    if (isHTMLPage(new URL(request.url).pathname)) {
      return cache.match('/404.html');
    }
    
    throw error;
  }
}

// Stale While Revalidate 策略
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  return cached || fetchPromise;
}

// 訊息處理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded');

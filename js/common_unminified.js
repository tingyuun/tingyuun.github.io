// 通用 JavaScript 文件 - 未壓縮版本 (用於維護)
// 壓縮版請使用 common.js

document.addEventListener('DOMContentLoaded', function() {
  // ===================
  // 導航菜單功能
  // ===================
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  if (navToggle && navMenu) {
    // 移動版菜單切換
    navToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
      
      // GA4 追蹤菜單開關
      if (navMenu.classList.contains('active')) {
        gtag('event', 'mobile_menu_open', {
          event_category: 'Navigation',
          event_label: 'Menu_Toggle'
        });
      } else {
        gtag('event', 'mobile_menu_close', {
          event_category: 'Navigation',
          event_label: 'Menu_Toggle'
        });
      }
    });
    
    // 點擊菜單項目後關閉菜單
    document.querySelectorAll('.nav-menu a').forEach(link => {
      link.addEventListener('click', function() {
        const linkText = this.textContent.trim();
        const linkHref = this.getAttribute('href');
        
        // GA4 追蹤導航點擊
        gtag('event', 'navigation_click', {
          event_category: 'Navigation',
          event_label: linkText,
          link_url: linkHref
        });
        
        if (window.innerWidth <= 768) {
          navMenu.classList.remove('active');
        }
      });
    });
    
    // 點擊外部關閉菜單
    document.addEventListener('click', function(event) {
      if (!navToggle.contains(event.target) && !navMenu.contains(event.target)) {
        navMenu.classList.remove('active');
      }
    });
  }
  
  // ===================
  // 導航高亮當前頁面
  // ===================
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-menu a').forEach(link => {
    const linkPath = new URL(link.href).pathname;
    if (currentPath === linkPath || (currentPath === '/' && linkPath === '/index.html')) {
      link.classList.add('active');
    }
  });
  
  // ===================
  // 平滑滾動錨點
  // ===================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const targetId = this.getAttribute('href').substring(1);
        
        // GA4 追蹤錨點跳轉
        gtag('event', 'anchor_scroll', {
          event_category: 'Navigation',
          event_label: targetId,
          action: 'smooth_scroll'
        });
        
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // ===================
  // 淡入動畫 (Intersection Observer)
  // ===================
  const fadeElements = document.querySelectorAll('.fade-in');
  const fadeOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const fadeObserver = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, fadeOptions);
  
  fadeElements.forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    fadeObserver.observe(element);
  });
  
  // ===================
  // 麵包屑追蹤
  // ===================
  document.querySelectorAll('.breadcrumb a').forEach(link => {
    link.addEventListener('click', function() {
      const breadcrumbText = this.textContent.trim();
      
      gtag('event', 'breadcrumb_click', {
        event_category: 'Navigation',
        event_label: breadcrumbText,
        action: 'breadcrumb_navigation'
      });
    });
  });
});

// ===================
// Service Worker 註冊
// ===================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Service Worker 註冊成功:', registration.scope);
        
        // 檢查更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 發現 Service Worker 更新');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('📢 新版本可用,請重新整理頁面');
            }
          });
        });
      })
      .catch(error => {
        console.error('❌ Service Worker 註冊失敗:', error);
      });
  });
}

// ===================
// 回到頂部按鈕
// ===================
function scrollToTop() {
  // GA4 追蹤回到頂部
  gtag('event', 'scroll_to_top', {
    event_category: 'User_Action',
    event_label: 'Back_To_Top',
    scroll_position: window.pageYOffset
  });
  
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

window.addEventListener('scroll', function() {
  const backToTopBtn = document.querySelector('.back-to-top');
  if (backToTopBtn) {
    if (window.pageYOffset > 300) {
      backToTopBtn.style.display = 'block';
    } else {
      backToTopBtn.style.display = 'none';
    }
  }
});

// ===================
// 頁面滾動深度追蹤
// ===================
let scrollDepthTracked = {
  '25': false,
  '50': false,
  '75': false,
  '100': false
};

window.addEventListener('scroll', function() {
  const scrollPercentage = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
  
  // 追蹤 25%, 50%, 75%, 100% 滾動深度
  ['25', '50', '75', '100'].forEach(depth => {
    const depthNum = parseInt(depth);
    if (scrollPercentage >= depthNum && !scrollDepthTracked[depth]) {
      scrollDepthTracked[depth] = true;
      
      gtag('event', 'scroll_depth', {
        event_category: 'Engagement',
        event_label: `${depth}%`,
        page_path: window.location.pathname
      });
    }
  });
});

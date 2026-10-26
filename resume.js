// ===== 공통 페이지 기능 =====

// Scroll Progress Tracker — 프레임당 최대 한 번만 DOM을 갱신합니다.
let scrollProgressTicking = false;
function updateScrollProgress() {
    const progress = document.getElementById('scrollProgress');
    if (!progress) {
        scrollProgressTicking = false;
        return;
    }
    const root = document.documentElement;
    const height = root.scrollHeight - root.clientHeight;
    const scrolled = height > 0 ? ((window.scrollY || root.scrollTop) / height) * 100 : 0;
    progress.style.width = scrolled + '%';
    scrollProgressTicking = false;
}
window.addEventListener('scroll', () => {
    if (scrollProgressTicking) return;
    scrollProgressTicking = true;
    requestAnimationFrame(updateScrollProgress);
}, { passive: true });

// Mobile Menu Toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuIcon = document.getElementById('menuIcon');
    const button = document.getElementById('mobileMenuBtn');
    if (!mobileMenu || !menuIcon || !button) return;

    if (mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.remove('hidden');
        menuIcon.className = "fa-solid fa-xmark text-xl";
        button.setAttribute('aria-expanded', 'true');
        button.setAttribute('aria-label', '모바일 메뉴 닫기');
    } else {
        mobileMenu.classList.add('hidden');
        menuIcon.className = "fa-solid fa-bars text-xl";
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', '모바일 메뉴 열기');
    }
}

// Contact Modal Controllers
function openContactModal() {
    const modal = document.getElementById('contactModal');
    if (!modal) return;
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.setAttribute('aria-hidden', 'false');
    const firstField = modal.querySelector('input, textarea, button');
    if (firstField) firstField.focus();
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    if (!modal) return;
    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.setAttribute('aria-hidden', 'true');
}

// Handle Form Submission Simulator
function handleContactSubmit(e) {
    e.preventDefault();
    closeContactModal();
    showToast("메시지가 성공적으로 전달되었습니다! 조속히 답장드리겠습니다.");
}

// Toast Notification System
let toastTimer = 0;
function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');

    // 연속 호출 시 이전 타이머가 새 토스트를 조기에 닫지 않도록 하나만 유지합니다.
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
        toastTimer = 0;
    }, 3500);
}

// Scroll to Top Helper
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('keydown', (event) => {
    const modal = document.getElementById('contactModal');
    if (event.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') {
        closeContactModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('contactModal');
    if (modal) modal.setAttribute('aria-hidden', 'true');
});

// 우주 별 배경과 워프 효과는 stars.js(공통)에서 처리합니다.

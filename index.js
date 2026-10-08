// ===== 메인 페이지 공통 기능 =====

let lastFocusedElement = null;
let scrollTicking = false;

// Scroll Progress Tracker - requestAnimationFrame으로 스크롤 중 반복 계산을 제한합니다.
function updateScrollProgress() {
    const progress = document.getElementById('scrollProgress');
    if (!progress) return;
    const winScroll = window.scrollY || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    progress.style.width = scrolled + '%';
    scrollTicking = false;
}

window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(updateScrollProgress);
    }
}, { passive: true });

// Mobile Menu Toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuIcon = document.getElementById('menuIcon');
    const button = document.getElementById('mobileMenuBtn');
    if (!mobileMenu || !menuIcon || !button) return;

    const isOpen = !mobileMenu.classList.contains('hidden');
    mobileMenu.classList.toggle('hidden', isOpen);
    menuIcon.className = isOpen ? 'fa-solid fa-bars text-xl' : 'fa-solid fa-xmark text-xl';
    button.setAttribute('aria-expanded', String(!isOpen));
    button.setAttribute('aria-label', isOpen ? '모바일 메뉴 열기' : '모바일 메뉴 닫기');
}

// Contact Modal Controllers
function openContactModal() {
    const modal = document.getElementById('contactModal');
    if (!modal) return;

    lastFocusedElement = document.activeElement;
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.removeAttribute('inert');
    modal.setAttribute('aria-hidden', 'false');

    const firstField = modal.querySelector('input, textarea, button');
    if (firstField) firstField.focus();
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    if (!modal) return;

    modal.classList.add('opacity-0', 'pointer-events-none');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
    }
    lastFocusedElement = null;
}

// Handle Form Submission Simulator
function handleContactSubmit(e) {
    e.preventDefault();
    closeContactModal();
    showToast('메시지가 성공적으로 전달되었습니다! 조속히 답장드리겠습니다.');
}

// Toast Notification System
let toastTimer;
function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
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
    if (modal) {
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('inert', '');
    }

    // 원본의 초기 스크롤 진행률을 즉시 반영합니다.
    updateScrollProgress();
});

// 우주 별 배경과 워프 효과는 stars.js(공통)에서 처리합니다.

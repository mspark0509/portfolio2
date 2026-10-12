// ===== 공통 페이지 기능 =====

// Scroll Progress Tracker
window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    const progress = document.getElementById('scrollProgress');
    if (progress) progress.style.width = scrolled + '%';
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
function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;
    toastMsg.innerText = msg;
    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');

    setTimeout(() => {
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
    if (modal) modal.setAttribute('aria-hidden', 'true');
});

// 우주 별 배경과 워프 효과는 stars.js(공통)에서 처리합니다.

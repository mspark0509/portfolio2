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

// ===== 우주 은하 별 배경 (Canvas) =====
(function () {
    const canvas = document.getElementById('stars');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const TAU = Math.PI * 2;
    const MAX_DPR = 2;
    const MOUSE_RADIUS = 150;
    const FRAME_INTERVAL = 1000 / 30; // 원본의 움직임을 유지하면서 Canvas 부담을 줄입니다.
    let stars = [];
    let starMouse = { x: -9999, y: -9999, active: false };
    let dpr = 1;
    let animationFrame = 0;
    let lastFrameTime = 0;
    let resizeTimer = 0;
    let paused = false;

    const PALETTE = [
        '225,232,248', '225,232,248', '225,232,248', '225,232,248',
        '200,190,255', '200,190,255',
        '170,200,255', '170,200,255',
        '255,214,236',
        '255,238,208'
    ];
    const pickColor = () => PALETTE[(Math.random() * PALETTE.length) | 0];
    const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73;

    const BAND_ANGLE = -24 * Math.PI / 180;
    const BAND_DIR = { x: Math.cos(BAND_ANGLE), y: Math.sin(BAND_ANGLE) };
    const BAND_NORMAL = { x: -BAND_DIR.y, y: BAND_DIR.x };

    function bandPoint(w, h) {
        const along = (Math.random() - 0.5) * Math.hypot(w, h) * 1.05;
        const across = gauss() * h * 0.12;
        return {
            x: w * 0.5 + along * BAND_DIR.x + across * BAND_NORMAL.x,
            y: h * 0.45 + along * BAND_DIR.y + across * BAND_NORMAL.y
        };
    }

    function makeStar(x, y, inBand, big) {
        const r = big
            ? 2 + Math.random() * 1.0
            : (0.4 + Math.random() * 1.4) * (inBand ? 0.85 : 1);
        return {
            x, y, ox: x, oy: y, r,
            a: big ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.55,
            phase: Math.random() * TAU,
            tw: 0.0006 + Math.random() * 0.0016,
            c: pickColor(),
            big,
            spark: big && Math.random() < 0.5
        };
    }

    function resizeStars() {
        dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 원본 약 4,500개 기준에서 정확히 절반 수준으로 줄입니다.
        const count = Math.min(2250, Math.floor(width * height / 720));
        const bigCount = Math.max(2, Math.round(count * 0.005));

        stars = Array.from({ length: count }, (_, i) => {
            const big = i < bigCount;
            if (Math.random() < 0.35) {
                const p = bandPoint(width, height);
                if (p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height) {
                    return makeStar(p.x, p.y, true, big);
                }
            }
            return makeStar(Math.random() * width, Math.random() * height, false, big);
        });
    }

    function scheduleResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeStars, 120);
    }

    function drawStars(timestamp) {
        if (paused) {
            animationFrame = requestAnimationFrame(drawStars);
            return;
        }

        if (timestamp - lastFrameTime < FRAME_INTERVAL) {
            animationFrame = requestAnimationFrame(drawStars);
            return;
        }
        lastFrameTime = timestamp;

        const width = window.innerWidth;
        const height = window.innerHeight;
        ctx.clearRect(0, 0, width, height);

        for (const s of stars) {
            let tx = s.ox;
            let ty = s.oy;
            const dx = starMouse.x - s.x;
            const dy = starMouse.y - s.y;
            const distSq = dx * dx + dy * dy;

            if (starMouse.active && distSq < MOUSE_RADIUS * MOUSE_RADIUS) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / MOUSE_RADIUS) * 0.95;
                tx = s.x + dx * force;
                ty = s.y + dy * force;
            }

            s.x += (tx - s.x) * 0.09;
            s.y += (ty - s.y) * 0.09;
            const pulse = s.a * (0.85 + 0.15 * Math.sin(timestamp * s.tw + s.phase));

            if (s.big) {
                const halo = s.r * 6;
                const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, halo);
                g.addColorStop(0, `rgba(${s.c},${pulse * 0.5})`);
                g.addColorStop(1, `rgba(${s.c},0)`);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(s.x, s.y, halo, 0, TAU);
                ctx.fill();

                if (s.spark) {
                    const len = s.r * 7 * (0.8 + 0.2 * Math.sin(timestamp * s.tw * 0.7 + s.phase));
                    ctx.strokeStyle = `rgba(${s.c},${pulse * 0.55})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(s.x - len, s.y);
                    ctx.lineTo(s.x + len, s.y);
                    ctx.moveTo(s.x, s.y - len);
                    ctx.lineTo(s.x, s.y + len);
                    ctx.stroke();
                }
            }

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, TAU);
            ctx.fillStyle = `rgba(${s.c},${pulse})`;
            ctx.fill();
        }

        animationFrame = requestAnimationFrame(drawStars);
    }

    function setPaused(nextPaused) {
        paused = nextPaused;
    }

    window.addEventListener('resize', scheduleResize, { passive: true });
    window.addEventListener('pointermove', (event) => {
        starMouse.x = event.clientX;
        starMouse.y = event.clientY;
        starMouse.active = true;
    }, { passive: true });
    window.addEventListener('pointerleave', () => {
        starMouse.active = false;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => setPaused(document.hidden));

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMotionPreference = () => {
        setPaused(reducedMotion.matches);
    };
    applyMotionPreference();
    if (typeof reducedMotion.addEventListener === 'function') {
        reducedMotion.addEventListener('change', applyMotionPreference);
    }

    resizeStars();
    animationFrame = requestAnimationFrame(drawStars);

    window.addEventListener('beforeunload', () => {
        cancelAnimationFrame(animationFrame);
        clearTimeout(resizeTimer);
    }, { once: true });
})();

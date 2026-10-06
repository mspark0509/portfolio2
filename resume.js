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


// ===== 우주 은하 별 배경 (Canvas) =====
(function () {
    const canvas = document.getElementById("stars");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const TAU = Math.PI * 2;
    let stars = [], starMouse = { x: -9999, y: -9999, active: false }, dpr = 1;

    // 별 색상(r,g,b): 푸른빛 흰색이 가장 많고 라벤더 / 하늘색 / 연분홍 / 연노랑이 조금씩 섞입니다.
    const PALETTE = [
        "225,232,248", "225,232,248", "225,232,248", "225,232,248",
        "200,190,255", "200,190,255",
        "170,200,255", "170,200,255",
        "255,214,236",
        "255,238,208"
    ];
    const pickColor = () => PALETTE[(Math.random() * PALETTE.length) | 0];

    // 평균 0, 표준편차 약 1의 정규분포 근사
    const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73;

    // 은하수 띠: CSS(.galaxy-bg::before)와 같은 중심(50%, 45%)과 각도(-24deg)
    const BAND_ANGLE = -24 * Math.PI / 180;
    const BAND_DIR = { x: Math.cos(BAND_ANGLE), y: Math.sin(BAND_ANGLE) };
    const BAND_NORMAL = { x: -BAND_DIR.y, y: BAND_DIR.x };

    function bandPoint(w, h) {
        const along = (Math.random() - .5) * Math.hypot(w, h) * 1.05;
        const across = gauss() * h * .12;
        return {
            x: w * .5 + along * BAND_DIR.x + across * BAND_NORMAL.x,
            y: h * .45 + along * BAND_DIR.y + across * BAND_NORMAL.y
        };
    }

    function makeStar(x, y, inBand, big) {
        const r = big
            ? 2 + Math.random() * 1.0                           // 큰 별: 2.0 ~ 3.0
            : (.4 + Math.random() * 1.4) * (inBand ? .85 : 1);  // 일반 별: 기존과 동일한 크기 범위
        return {
            x, y, ox: x, oy: y, r,
            a: big ? .8 + Math.random() * .2 : .3 + Math.random() * .55,
            phase: Math.random() * TAU,
            tw: .0006 + Math.random() * .0016,                  // 별마다 반짝이는 속도가 조금씩 다름
            c: pickColor(),
            big,
            spark: big && Math.random() < .5                    // 큰 별 중 절반은 십자 반짝임
        };
    }

    function resizeStars() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
        canvas.style.width = innerWidth + "px"; canvas.style.height = innerHeight + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const count = Math.min(4500, Math.floor(innerWidth * innerHeight / 360));
        // 큰 별은 전체의 약 0.5%만 (최소 4개). 위치는 랜덤이라 앞쪽 N개를 큰 별로 지정해도 무방합니다.
        const bigCount = Math.max(4, Math.round(count * .005));
        stars = Array.from({ length: count }, (_, i) => {
            const big = i < bigCount;
            // 약 35%의 별은 은하수 띠를 따라 촘촘하게, 나머지는 화면 전체에 고르게
            if (Math.random() < .35) {
                const p = bandPoint(innerWidth, innerHeight);
                if (p.x >= 0 && p.x <= innerWidth && p.y >= 0 && p.y <= innerHeight) {
                    return makeStar(p.x, p.y, true, big);
                }
            }
            return makeStar(Math.random() * innerWidth, Math.random() * innerHeight, false, big);
        });
    }

    function drawStars(t) {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (const s of stars) {
            let tx = s.ox, ty = s.oy;
            const dx = starMouse.x - s.x, dy = starMouse.y - s.y, dist = Math.hypot(dx, dy);
            // 반경 150px 안에서만 마우스 쪽으로 모여들고, 150px 밖으로 벗어나면 더 이상 따라가지 않습니다.
            if (starMouse.active && dist < 150) {
                const force = (1 - dist / 150) * .95;
                tx = s.x + dx * force; ty = s.y + dy * force;
            }
            s.x += (tx - s.x) * .09; s.y += (ty - s.y) * .09;
            const pulse = s.a * (.85 + .15 * Math.sin(t * s.tw + s.phase));

            if (s.big) {
                // 큰 별: 부드러운 후광
                const halo = s.r * 6;
                const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, halo);
                g.addColorStop(0, `rgba(${s.c},${pulse * .5})`);
                g.addColorStop(1, `rgba(${s.c},0)`);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(s.x, s.y, halo, 0, TAU); ctx.fill();

                // 일부 큰 별: 십자 모양 반짝임
                if (s.spark) {
                    const len = s.r * 7 * (.8 + .2 * Math.sin(t * s.tw * .7 + s.phase));
                    ctx.strokeStyle = `rgba(${s.c},${pulse * .55})`;
                    ctx.lineWidth = .8;
                    ctx.beginPath();
                    ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y);
                    ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len);
                    ctx.stroke();
                }
            }

            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU);
            ctx.fillStyle = `rgba(${s.c},${pulse})`; ctx.fill();
        }
        requestAnimationFrame(drawStars);
    }
    window.addEventListener("resize", resizeStars);
    window.addEventListener("pointermove", e => { starMouse.x = e.clientX; starMouse.y = e.clientY; starMouse.active = true });
    window.addEventListener("pointerleave", () => starMouse.active = false);
    resizeStars(); requestAnimationFrame(drawStars);
})();
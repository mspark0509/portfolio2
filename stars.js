// ===== 우주 은하 별 배경 + 섹션 이동 워프 효과 (모든 페이지 공통) =====
//  - 가만히 있을 때: 화면 중심을 축으로 별 전체가 아주 천천히 원형으로 회전합니다.
//  - 스크롤(섹션 이동) 시:
//      아래로 내려가면 별이 아래 → 위로, 위로 올라가면 위 → 아래로 일제히 흐르며 꼬리(워프 선)가 생깁니다.
//      가까운(큰) 별일수록 더 빠르게 움직여 깊이감이 납니다.
//  - 마우스 주변 150px 안의 별이 모여드는 기존 인터랙션은 그대로 유지합니다.
//
//  [성능] 별 점/후광/꼬리를 미리 그려 둔 스프라이트(작은 이미지)로 만들어 두고 drawImage로 찍습니다.
//        매 프레임 색 문자열 생성·그라데이션 생성·path 그리기가 사라져 렉이 크게 줄어듭니다.
(function () {
    const canvas = document.getElementById('stars');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const TAU = Math.PI * 2;
    const MAX_DPR = 1.5;                 // 별은 작고 부드러워서 1.5배면 충분합니다 (2로 올리면 더 선명, 대신 무거움)
    const MOUSE_RADIUS = 300;
    const MOUSE_ATTRACT_MS = 25;         // 별이 마우스로 모여드는 속도(ms). 작을수록 더 빠르게 달라붙음
    const MOUSE_RELEASE_MS = 90;         // 마우스가 떠난 뒤 별이 제자리로 돌아가는 속도(ms)
    const MOUSE_PULL = true;             // false로 바꾸면 마우스에 별이 붙는 효과를 끕니다

    // ── 조절용 값 ──────────────────────────────────────────────
    const SPIN_PERIOD = 300000;          // 중심 회전 한 바퀴 시간(ms) = 400초 (더 천천히: 값↑)
    const WARP_GAIN = 1;               // 스크롤 속도 → 별 이동 속도 배율 (워프 강도)
    const WARP_MAX = 3;                  // 별 이동 속도 상한 (px/ms)
    const WARP_ATTACK = 90;              // 속도가 붙는 시간(ms)
    const WARP_RELEASE = 380;            // 속도가 잦아드는 시간(ms)
    const STREAK_MS = 55;                // 꼬리 길이: 이 시간 동안 이동할 거리만큼
    const STREAK_MAX = 260;              // 꼬리 최대 길이(px)
    const WARP_EPS = 0.015;              // 이보다 느리면 정지 상태로 간주
    const RAW_SMOOTH_MS = 45;            // 프레임마다 들쭉날쭉한 스크롤량을 평균내는 시간(ms) — 워프 떨림 방지
    // ──────────────────────────────────────────────────────────

    const SPIN_SPEED = TAU / SPIN_PERIOD; // rad/ms

    const PALETTE = [
        '225,232,248', '225,232,248', '225,232,248', '225,232,248',
        '200,190,255', '200,190,255',
        '170,200,255', '170,200,255',
        '255,214,236',
        '255,238,208'
    ];
    const pickColor = () => PALETTE[(Math.random() * PALETTE.length) | 0];

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let stars = [];
    let W = 0, H = 0, cx = 0, cy = 0;
    let R = 0, L = 0;                    // 별밭(정사각형)의 반변 / 한 변. 화면 대각선 반경 이상
    let dpr = 1;
    let raf = 0;
    let resizeTimer = 0;
    let lastTs = performance.now();
    let lastScrollTs = lastTs;
    let lastScrollY = window.scrollY || 0;
    let warpV = 0;                       // 현재 별 이동 속도(px/ms, 화면 y 기준: 음수 = 위로)
    let rawV = 0;                        // 스크롤에서 측정한 속도(평균 낸 값)
    const mouse = { x: -9999, y: -9999, active: false };

    // ===== 스프라이트 (미리 그려 두는 작은 이미지) =====
    const dotCache = new Map();          // 색 × 반지름(0.2px 단위) → 별 점
    const colorCache = new Map();        // 색 → 후광 / 꼬리(아래로, 위로)

    function newCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.ceil(w));
        c.height = Math.max(1, Math.ceil(h));
        return c;
    }

    function dotSprite(color, r) {
        const bucket = Math.max(2, Math.round(r * 5));
        const key = color + '|' + bucket;
        let spr = dotCache.get(key);
        if (spr) return spr;

        const rr = bucket / 5;
        const cv = newCanvas((rr + 1) * 2 * dpr, (rr + 1) * 2 * dpr);
        const css = cv.width / dpr;
        const c = cv.getContext('2d');
        c.scale(dpr, dpr);
        c.fillStyle = `rgb(${color})`;
        c.beginPath();
        c.arc(css / 2, css / 2, rr, 0, TAU);
        c.fill();

        spr = { cv, size: css, half: css / 2 };
        dotCache.set(key, spr);
        return spr;
    }

    function colorSprites(color) {
        let cs = colorCache.get(color);
        if (cs) return cs;

        // 큰 별의 후광 (반지름 18px 기준으로 만들고 별 크기에 맞게 축소해서 사용)
        const HALO = 18;
        const halo = newCanvas(HALO * 2 * dpr, HALO * 2 * dpr);
        {
            const c = halo.getContext('2d');
            c.scale(dpr, dpr);
            const g = c.createRadialGradient(HALO, HALO, 0, HALO, HALO, HALO);
            g.addColorStop(0, `rgba(${color},1)`);
            g.addColorStop(1, `rgba(${color},0)`);
            c.fillStyle = g;
            c.fillRect(0, 0, HALO * 2, HALO * 2);
        }

        // 워프 꼬리: 머리(별) 쪽이 진하고 끝으로 갈수록 사라지는 세로 그라데이션
        const TAIL_H = 96;
        function tail(headAtTop) {
            const cv = newCanvas(2 * dpr, TAIL_H * dpr);
            const c = cv.getContext('2d');
            c.scale(dpr, dpr);
            const g = headAtTop
                ? c.createLinearGradient(0, 0, 0, TAIL_H)
                : c.createLinearGradient(0, TAIL_H, 0, 0);
            g.addColorStop(0, `rgba(${color},1)`);
            g.addColorStop(0.35, `rgba(${color},0.45)`);
            g.addColorStop(1, `rgba(${color},0)`);
            c.fillStyle = g;
            c.fillRect(0, 0, 2, TAIL_H);
            return cv;
        }

        cs = { halo, tailDown: tail(true), tailUp: tail(false) };
        colorCache.set(color, cs);
        return cs;
    }

    function makeStar(big) {
        const r = big
            ? 2 + Math.random() * 1.0
            : 0.4 + Math.random() * 1.4;
        const c = pickColor();
        return {
            // 별밭 좌표 (화면 중심 기준). 회전하는 별밭 위에 놓이고, 사각 별밭 가장자리에서 반대편으로 이어집니다.
            fx: (Math.random() * 2 - 1) * R,
            fy: (Math.random() * 2 - 1) * R,
            r,
            depth: 0.35 + r * 0.55,      // 큰 별 = 가까운 별 = 더 빠르게
            a: big ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.55,
            phase: Math.random() * TAU,
            tw: 0.0006 + Math.random() * 0.0016,
            c,
            dot: dotSprite(c, r),
            cs: colorSprites(c),
            big,
            spark: big && Math.random() < 0.5,
            mx: 0, my: 0                 // 마우스에 끌려간 정도
        };
    }

    function resizeStars() {
        dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        W = window.innerWidth;
        H = window.innerHeight;
        cx = W / 2;
        cy = H / 2;
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 회전해도 화면 구석까지 별이 차 있도록, 화면 대각선 반경을 덮는 정사각형 별밭을 만듭니다.
        R = Math.hypot(W, H) / 2 + 40;
        L = R * 2;

        // 화면에 보이는 별 밀도는 기존(약 1500개 상한)과 같게 유지
        const visible = Math.min(1500, Math.floor(W * H / 720));
        const count = Math.min(9000, Math.ceil(visible * (L * L) / (W * H)));
        const bigCount = Math.max(3, Math.round(count * 0.005));

        dotCache.clear();
        colorCache.clear();
        stars = Array.from({ length: count }, (_, i) => makeStar(i < bigCount));

        if (reducedMotion.matches) render(0, 0, 0, 0, false);
    }

    function scheduleResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeStars, 120);
    }

    function render(ts, dt, rot, vel, animate) {
        ctx.clearRect(0, 0, W, H);

        const sinR = Math.sin(rot);
        const cosR = Math.cos(rot);
        const move = vel * Math.min(dt, 50);              // 이번 프레임 이동량(깊이 1 기준)
        const trail = Math.abs(vel) * STREAK_MS;          // 꼬리 길이(깊이 1 기준)
        const tailDown = vel < 0;                         // 별이 위로 가면 꼬리는 아래쪽
        // 화면 밖이라도 꼬리가 화면 안으로 뻗는 쪽만 그리고, 반대쪽은 바로 생략
        const padX = 24;
        const tailPad = Math.min(trail * 2, STREAK_MAX);
        const padTop = tailDown ? 24 + tailPad : 24;
        const padBottom = tailDown ? 24 : 24 + tailPad;
        const r2 = MOUSE_RADIUS * MOUSE_RADIUS;
        const useMouse = MOUSE_PULL && animate && mouse.active;
        // 프레임 속도와 상관없이 같은 속도로 따라붙도록 시간 기준으로 계산
        const easeIn = 1 - Math.exp(-Math.min(dt, 50) / MOUSE_ATTRACT_MS);
        const easeOut = 1 - Math.exp(-Math.min(dt, 50) / MOUSE_RELEASE_MS);

        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];

            // 1) 워프 이동: 화면 기준 세로 이동을 별밭 좌표로 변환해 누적, 가장자리에서 반대편으로 순환
            if (move !== 0) {
                const d = move * s.depth;
                s.fx += d * sinR;
                s.fy += d * cosR;
                if (s.fx >= R) s.fx -= L; else if (s.fx < -R) s.fx += L;
                if (s.fy >= R) s.fy -= L; else if (s.fy < -R) s.fy += L;
            }

            // 2) 중심 회전을 적용한 화면 좌표
            const bx = cx + s.fx * cosR - s.fy * sinR;
            const by = cy + s.fx * sinR + s.fy * cosR;

            if (bx < -padX || bx > W + padX || by < -padTop || by > H + padBottom) {
                s.mx = 0;
                s.my = 0;
                continue;
            }

            // 3) 마우스 주변 별이 모여드는 효과 (반경/세기 동일, 부드럽게 따라가고 놓으면 복귀)
            if (useMouse || s.mx !== 0 || s.my !== 0) {
                let tmx = 0;
                let tmy = 0;
                if (useMouse) {
                    const dx = mouse.x - bx;
                    const dy = mouse.y - by;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < r2) {
                        const force = (1 - Math.sqrt(distSq) / MOUSE_RADIUS) * 0.95;
                        tmx = dx * force;
                        tmy = dy * force;
                    }
                }
                const ease = (tmx !== 0 || tmy !== 0) ? easeIn : easeOut;
                s.mx += (tmx - s.mx) * ease;
                s.my += (tmy - s.my) * ease;
                if (!useMouse && Math.abs(s.mx) < 0.01 && Math.abs(s.my) < 0.01) {
                    s.mx = 0;
                    s.my = 0;
                }
            }

            const x = bx + s.mx;
            const y = by + s.my;
            const pulse = animate
                ? s.a * (0.85 + 0.15 * Math.sin(ts * s.tw + s.phase))
                : s.a;

            if (s.big) {
                // 후광
                const halo = s.r * 6;
                ctx.globalAlpha = pulse * 0.5;
                ctx.drawImage(s.cs.halo, x - halo, y - halo, halo * 2, halo * 2);

                // 십자 반짝임 (큰 별 일부만이라 그대로 선으로 그림)
                if (s.spark) {
                    const len = s.r * 7 * (animate ? 0.8 + 0.2 * Math.sin(ts * s.tw * 0.7 + s.phase) : 1);
                    ctx.globalAlpha = 1;
                    ctx.strokeStyle = `rgba(${s.c},${pulse * 0.55})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(x - len, y);
                    ctx.lineTo(x + len, y);
                    ctx.moveTo(x, y - len);
                    ctx.lineTo(x, y + len);
                    ctx.stroke();
                }
            }

            // 4) 워프 꼬리 (빠를수록, 가까운 별일수록 길게)
            const tl = Math.min(trail * s.depth, STREAK_MAX);
            let drawDot = true;
            if (tl > 3) {
                const small = s.r < 1.0;
                const w = Math.max(0.7, s.r * 1.2);
                ctx.globalAlpha = pulse * (small ? 0.9 : 0.7);
                if (tailDown) ctx.drawImage(s.cs.tailDown, x - w / 2, y, w, tl);
                else ctx.drawImage(s.cs.tailUp, x - w / 2, y - tl, w, tl);
                // 작은 별은 꼬리 머리만으로 충분해서 본체 그리기를 생략 (그리기 횟수 절감)
                if (small && tl > 6) drawDot = false;
            }

            // 5) 별 본체
            if (drawDot) {
                ctx.globalAlpha = pulse;
                ctx.drawImage(s.dot.cv, x - s.dot.half, y - s.dot.half, s.dot.size, s.dot.size);
            }
        }

        ctx.globalAlpha = 1;
    }

    function frame(ts) {
        raf = 0;
        if (reducedMotion.matches) return;
        raf = requestAnimationFrame(frame);
        if (document.hidden) return;

        // 스크롤 속도 → 워프 속도 (아래로 스크롤 = 별은 위로)
        const sy = window.scrollY || 0;
        const sdt = Math.max(ts - lastScrollTs, 1);
        let raw = -((sy - lastScrollY) / Math.max(sdt, 8)) * WARP_GAIN;
        raw = Math.max(-WARP_MAX, Math.min(WARP_MAX, raw));
        // 1단계: 프레임마다 0, 2배처럼 튀는 스크롤량을 짧게 평균내서 속도를 안정화
        rawV += (raw - rawV) * (1 - Math.exp(-Math.min(sdt, 100) / RAW_SMOOTH_MS));
        // 2단계: 빨라질 땐 빠르게, 멈출 땐 서서히 잦아들게
        const target = rawV;
        const speedingUp = Math.abs(target) > Math.abs(warpV) || target * warpV < 0;
        const tau = speedingUp ? WARP_ATTACK : WARP_RELEASE;
        warpV += (target - warpV) * (1 - Math.exp(-Math.min(sdt, 100) / tau));
        if (Math.abs(warpV) < WARP_EPS && Math.abs(rawV) < WARP_EPS) { warpV = 0; rawV = 0; }
        lastScrollY = sy;
        lastScrollTs = ts;

        // 정지 상태에서도 매 프레임(최대 60fps) 그려 회전과 마우스 효과가 끊기지 않게 합니다.
        const dt = ts - lastTs;
        lastTs = ts;
        render(ts, dt, SPIN_SPEED * ts, warpV, true);
    }

    function start() {
        if (reducedMotion.matches || raf) return;
        lastTs = lastScrollTs = performance.now();
        lastScrollY = window.scrollY || 0;
        warpV = rawV = 0;
        raf = requestAnimationFrame(frame);
    }

    function applyMotionPreference() {
        if (reducedMotion.matches) {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            render(0, 0, 0, 0, false);      // 움직임 없이 정지된 별만 표시
        } else {
            start();
        }
    }

    window.addEventListener('resize', scheduleResize, { passive: true });
    window.addEventListener('pointermove', (event) => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
        mouse.active = true;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { mouse.active = false; }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { mouse.active = false; });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            lastTs = lastScrollTs = performance.now();
            lastScrollY = window.scrollY || 0;
            warpV = rawV = 0;
        }
    });

    if (typeof reducedMotion.addEventListener === 'function') {
        reducedMotion.addEventListener('change', applyMotionPreference);
    }

    resizeStars();
    applyMotionPreference();

    window.addEventListener('beforeunload', () => {
        if (raf) cancelAnimationFrame(raf);
        clearTimeout(resizeTimer);
    }, { once: true });
})();

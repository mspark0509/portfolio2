// ===== 모서리 행성 메뉴 + 오른쪽 별 섹션 네비 + 행성 비행 전환 (모든 페이지 공통) =====
// 행성: 목성(메인 로고) / 천왕성(프로젝트 소개) / 수성(소감&자소서) / 토성(문의하기)
// - 지금 보고 있는 페이지의 행성은 왼쪽 위 모서리에서 불이 켜진 채로, 나머지는 어둡게 다른 모서리에 걸쳐 있습니다.
// - 클릭하면 행성이 화면 주위를 한 바퀴 돌며 다가와 화면 전체로 확대된 뒤 페이지가 넘어갑니다.
// - 도착한 페이지에서는 확대된 행성이 왼쪽 위 모서리로 물러나며 본문이 나타납니다.
(function () {
    const IMG_DIR = './images/planets/';
    // 행성 크기: 메인 > 프로젝트 소개 > 자소서 > 문의 순서로 점점 작아집니다 (크기는 planets.css의 --d)
    const MENU = [
        { key: 'main',     cls: 'planet--jupiter', label: '메인',          href: 'index.html',    img: 'jupiter', nat: 1600, ar: 1,      disc: 0.875 },
        { key: 'projects', cls: 'planet--saturn',  label: '프로젝트 소개', href: 'projects.html', img: 'saturn',  nat: 2400, ar: 2.0339, disc: 0.4167 },
        { key: 'resume',   cls: 'planet--uranus',  label: '소감 & 자소서', href: 'resume.html',   img: 'uranus',  nat: 1600, ar: 1,      disc: 0.875 },
        { key: 'contact',  cls: 'planet--mercury', label: '문의하기',      href: 'contact.html',  img: 'mercury', nat: 1600, ar: 1,      disc: 0.875 }
    ];
    const BY_KEY = Object.fromEntries(MENU.map((m) => [m.key, m]));

    const LIT_FILTER = 'brightness(1.08) saturate(1.06)';
    const DIM_FILTER = 'brightness(.34) saturate(.7) contrast(1.05)';

    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const current = file === 'projects.html' ? 'projects'
        : file === 'resume.html' ? 'resume'
        : file === 'contact.html' ? 'contact'
        : 'main';

    let travelling = false;
    const planetEls = {};
    // 메뉴에 포인터가 올라오거나 키보드 포커스가 들어오면 전환용 원본 이미지를 미리 요청합니다.
    // 실제 전환 시점의 이미지 다운로드 대기를 줄이되, 모든 대형 이미지를 처음부터 동시에 받지는 않습니다.
    const planetImagePreloads = new Map();
    function preloadPlanetImage(item) {
        if (planetImagePreloads.has(item.key)) return planetImagePreloads.get(item.key);
        const image = new Image();
        image.decoding = 'async';
        image.src = IMG_DIR + item.img + '.webp';
        planetImagePreloads.set(item.key, image);
        return image;
    }

    function span(cls) {
        const s = document.createElement('span');
        s.className = cls;
        return s;
    }

    /* ---------- 모서리 자리 배정: 현재 페이지 = 왼쪽 위, 나머지는 시계 방향 ---------- */
    function assignSlots() {
        const others = ['tr', 'br', 'bl'];
        const slots = {};
        slots[current] = 'tl';
        MENU.filter((m) => m.key !== current).forEach((m, i) => { slots[m.key] = others[i]; });
        return slots;
    }

    /* ---------- 행성 메뉴 ---------- */
    function buildPlanets() {
        if (document.getElementById('planetNav')) return;
        const slots = assignSlots();
        const arriving = root.classList.contains('planet-arriving');

        const nav = document.createElement('nav');
        nav.id = 'planetNav';
        nav.className = 'planet-nav';
        nav.setAttribute('aria-label', '주 메뉴');

        MENU.forEach((item) => {
            const el = document.createElement(item.href ? 'a' : 'button');
            el.className = 'planet ' + item.cls;
            el.dataset.key = item.key;
            el.dataset.slot = slots[item.key];
            el.setAttribute('aria-label', item.label);

            if (item.href) {
                el.href = item.href;
                if (item.key === current) {
                    el.classList.add('is-active');
                    el.setAttribute('aria-current', 'page');
                    if (arriving) el.classList.add('is-arriving');
                }
            } else {
                el.type = 'button';
            }

            el.appendChild(span('planet-glow'));

            const img = document.createElement('img');
            img.className = 'planet-img';
            img.src = IMG_DIR + item.img + '-n.webp';
            img.alt = '';
            img.decoding = 'async';
            img.draggable = false;
            el.appendChild(img);

            // 행성 아래 메뉴 이름 (평소엔 꺼진 상태, 호버/선택 시 불이 켜짐)
            const lab = span('planet-label');
            lab.textContent = item.label;
            el.appendChild(lab);

            el.addEventListener('click', (e) => onPlanetClick(e, item, el));
            el.addEventListener('pointerenter', () => preloadPlanetImage(item), { passive: true });
            el.addEventListener('focus', () => preloadPlanetImage(item), { passive: true });

            planetEls[item.key] = el;
            nav.appendChild(el);
        });

        document.body.appendChild(nav);
    }


    /* ---------- 오버레이 만들기 ---------- */
    // 오버레이 이미지는 "화면을 덮는 최종 크기"로 만들어 두고 transform만 바꿉니다.
    function makeFly(item) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const diag = Math.hypot(vw, vh);
        const coverW = (diag * 1.08) / item.disc;          // 화면을 덮는 데 필요한 가로 크기
        // 이미지를 원본 해상도보다 크게 깔면 GPU 메모리만 늘고 화질은 그대로라서, 원본 크기까지만 깔고 나머지는 확대(scale)로 채웁니다.
        const W = Math.min(coverW, item.nat);
        const F = coverW / W;                              // 최종 확대 배율 (1 이상)
        const H = W / item.ar;

        const fly = document.createElement('div');
        fly.className = 'planet-fly';
        fly.setAttribute('aria-hidden', 'true');

        // 밝은 행성 위에 어두운 행성을 한 장 더 겹치고, 그 투명도만 바꿔 "어두움 → 밝음"을 표현합니다.
        // (프레임마다 CSS filter를 바꾸면 큰 이미지를 매번 다시 그려서 렉이 걸립니다.)
        const img = document.createElement('div');           // 이동/확대는 이 래퍼에만 적용
        img.className = 'fly-wrap';
        img.style.width = W + 'px';
        img.style.height = H + 'px';
        img.style.marginLeft = (-W / 2) + 'px';
        img.style.marginTop = (-H / 2) + 'px';
        // 메뉴 hover/focus로 준비한 이미지를 전환에도 재사용해 중복 이미지 디코딩을 줄입니다.
        const lit = planetImagePreloads.get(item.key) || new Image();
        lit.className = 'fly-img';
        lit.alt = '';
        lit.draggable = false;
        if (!lit.src) lit.src = IMG_DIR + item.img + '.webp';
        if (!planetImagePreloads.has(item.key)) planetImagePreloads.set(item.key, lit);
        const dark = document.createElement('img');
        dark.className = 'fly-img fly-img--dark';
        dark.alt = '';
        dark.draggable = false;
        dark.src = lit.src;
        img.appendChild(lit);
        img.appendChild(dark);
        img._ready = lit;
        fly._dark = dark;
        fly.appendChild(img);
        fly._F = F;
        img.style.transform = `scale(${F})`;
        // 행성까지 포함해 화면 전체를 덮는 어둠 막
        const dim = document.createElement('div');
        dim.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;';
        fly.appendChild(dim);
        fly._dim = dim;
        document.body.appendChild(fly);
        return { fly, img, W, H, vw, vh };
    }

    function whenReady(el, timeoutMs = 650) {
        const img = el._ready || el;
        if (img.complete) return Promise.resolve(Boolean(img.naturalWidth));
        return new Promise((resolve) => {
            let settled = false;
            const finish = (loaded) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                resolve(loaded);
            };
            const onLoad = () => finish(Boolean(img.naturalWidth));
            const onError = () => finish(false);
            const timer = window.setTimeout(() => finish(false), timeoutMs);
            img.addEventListener('load', onLoad, { once: true });
            img.addEventListener('error', onError, { once: true });
        });
    }

    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    /* ---------- 화면 주위를 한 바퀴 돌며 다가오기 ---------- */
    const DARK = 0.82;   // 행성이 다가오며 화면이 어두워지는 정도
    function orbit(fly, img, W, start, vw, vh, duration) {
        return new Promise((resolve) => {
            const s0 = start.width / W;
            const dx0 = (start.left + start.width / 2) - vw / 2;
            const dy0 = (start.top + start.height / 2) - vh / 2;
            const r0 = Math.hypot(dx0, dy0) || 1;
            const a0 = Math.atan2(dy0, dx0);
            const t0 = performance.now();

            function frame(now) {
                const p = clamp01((now - t0) / duration);
                // 한 바퀴 돌면서(끝으로 갈수록 천천히) 서서히 안쪽으로 모이고, 중반부터 부드럽게 커지다가 눈앞까지 다가옵니다.
                const sm = (v) => v * v * (3 - 2 * v);
                const angle = a0 + Math.PI * 2 * easeInOut(clamp01(p / 0.82));
                const radius = r0 * (1 - sm(clamp01((p - 0.12) / 0.88)));
                const z = sm(clamp01((p - 0.3) / 0.7));
                const scale = s0 * Math.pow(fly._F / s0, Math.pow(z, 1.5));
                const lit = sm(clamp01((p - 0.15) / 0.7));              // 다가오며 밝아짐
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                img.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
                fly._dark.style.opacity = (1 - lit).toFixed(3);
                // 어둠: 행성이 눈앞에 왔을 때만 짧게 (마지막 18%)
                const near = sm(clamp01((p - 0.82) / 0.18));
                fly._dim.style.opacity = (DARK * near).toFixed(3);
                if (near > 0.6) root.classList.add('planet-cover');
                if (p < 1) requestAnimationFrame(frame);
                else resolve();
            }
            img.style.transform = `translate3d(${dx0}px, ${dy0}px, 0) scale(${s0})`;
            requestAnimationFrame(frame);
        });
    }

    /* ---------- 화면을 덮은 행성이 모서리 자리로 물러나 앉기 ---------- */
    function settle(fly, img, W, el, lit) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const r = el.getBoundingClientRect();
        const s1 = r.width / W;
        const dx = (r.left + r.width / 2) - vw / 2;
        const dy = (r.top + r.height / 2) - vh / 2;

        const a = img.animate([
            { transform: `translate3d(0px, 0px, 0) scale(${fly._F})` },
            { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${s1})` }
        ], { duration: 800, easing: 'cubic-bezier(.5,0,.15,1)', fill: 'forwards' });
        // 멀어지며 현재 페이지 행성은 밝게, 나머지는 어둡게 자리 잡습니다.
        setTimeout(() => root.classList.remove('planet-cover'), 180);   // 화면이 밝아지기 시작하면 별 그리기 재개
        fly._dark.style.opacity = '0';
        fly._dark.animate([{ opacity: 0 }, { opacity: lit ? 0 : 1 }], { duration: 800, easing: 'ease-in', fill: 'forwards' });

        // 행성이 멀어지는 동안 화면이 다시 밝아집니다.
        fly._dim.animate([
            { opacity: DARK },
            { opacity: 0 }
        ], { duration: 420, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards' });

        return a.finished.catch(() => {}).then(() => {
            el.classList.remove('is-arriving', 'is-flying');
            return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        }).then(() => {
            const fade = fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
            return fade.finished.catch(() => {});
        }).then(() => fly.remove());
    }

    /* ---------- 클릭 ---------- */
    async function onPlanetClick(e, item, el) {
        // 새 탭/창 열기 같은 기본 동작은 그대로 둡니다.
        if (item.href && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0)) return;
        e.preventDefault();
        if (travelling) return;

        // 지금 보고 있는 페이지의 행성: 맨 위로만 올려 줍니다.
        if (item.href && item.key === current) {
            window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
            return;
        }

        if (reduce.matches) {
            if (item.href) { location.href = item.href; }
            else if (typeof window.openContactModal === 'function') { window.openContactModal(); }
            return;
        }

        travelling = true;
        const start = el.querySelector('.planet-img').getBoundingClientRect();
        const { fly, img, W, vw, vh } = makeFly(item);
        await whenReady(img, 600);

        el.classList.add('is-flying');
        root.classList.add('planet-travel');

        await orbit(fly, img, W, start, vw, vh, 1900);

        if (item.href) {
            try { sessionStorage.setItem('planetArrive', item.key); } catch (_) {}
            location.href = item.href;
            // 이동이 오래 걸려도 화면은 행성으로 가득 찬 채 유지됩니다.
        } else {
            if (typeof window.openContactModal === 'function') window.openContactModal();
            root.classList.remove('planet-travel');
            await settle(fly, img, W, el, false);
            reset();
        }
    }

    function reset() {
        travelling = false;
        root.classList.remove('planet-travel', 'planet-arriving', 'planet-reveal', 'planet-cover');
        document.querySelectorAll('.planet.is-flying, .planet.is-arriving').forEach((p) => p.classList.remove('is-flying', 'is-arriving'));
        document.querySelectorAll('.planet-fly').forEach((f) => f.remove());
        scheduleOrbitFrame();
    }

    async function playArrival() {
        let key = null;
        try { key = sessionStorage.getItem('planetArrive'); sessionStorage.removeItem('planetArrive'); } catch (_) {}
        const item = key && BY_KEY[key];
        const el = item && planetEls[item.key];
        if (!item || !el || reduce.matches) {
            orbitFrozen = false;
            root.classList.remove('planet-arriving');
            if (el) el.classList.remove('is-arriving');
            scheduleOrbitFrame();
            return;
        }
        root.classList.add('planet-cover');
        const { fly, img, W } = makeFly(item);
        fly._dim.style.opacity = DARK;
        await whenReady(img, 650);
        // 페이지 로딩(Tailwind 계산·폰트 등)이 끝난 뒤에 움직이기 시작해야 끊기지 않습니다. 너무 오래 걸리면 2.5초 뒤 그냥 시작.
        await new Promise((resolve) => {
            let settled = false;
            let timeout = 0;
            const cleanup = () => {
                window.clearTimeout(timeout);
                window.removeEventListener('load', onLoad);
            };
            const finish = () => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve();
            };
            const onLoad = () => requestAnimationFrame(() => requestAnimationFrame(finish));
            timeout = window.setTimeout(finish, 1000);
            if (document.readyState === 'complete') onLoad();
            else window.addEventListener('load', onLoad, { once: true });
        });
        // 본문이 행성 뒤에서 천천히 나타나도록
        root.classList.add('planet-reveal');
        root.classList.remove('planet-arriving');
        await settle(fly, img, W, el, item.key === current);
        orbitFrozen = false;
        root.classList.remove('planet-reveal');
        scheduleOrbitFrame();
    }

    // 뒤로가기(bfcache)로 돌아왔을 때 전환 상태를 깨끗이 되돌립니다.
    window.addEventListener('pageshow', (e) => { if (e.persisted) reset(); });

    /* ---------- 휠 섹션 이동: 별 배경의 워프와 맞춰 페이지 자체도 관성 있게 이동 ----------
       기본 휠 스크롤은 브라우저/장치마다 즉시 이동하므로, 데스크톱에서는 한 번의 휠 입력을
       다음 섹션 목표로 바꾸고 requestAnimationFrame 기반 easing으로 이동시킵니다. */
    function setupSmoothSectionWheel() {
        const desktopWheel = window.matchMedia('(min-width: 1024px)');
        const originalScrollSnapType = root.style.scrollSnapType;
        // 데스크톱에서는 JS가 섹션 이동을 직접 보간하므로 브라우저의 CSS scroll-snap과
        // 동시에 동작하지 않게 합니다. 모바일/모션 감소 설정에서는 기존 네이티브 동작을 유지합니다.
        const syncScrollSnapMode = () => {
            root.style.scrollSnapType = (!reduce.matches && desktopWheel.matches)
                ? 'none'
                : originalScrollSnapType;
        };
        let rafId = 0;
        let animating = false;
        let targetIndex = -1;
        let startTime = 0;
        let startY = 0;
        let endY = 0;
        let duration = 300;
        // 한 번의 휠 동작은 한 섹션만 이동합니다. 이동 중/관성 휠 입력은 버리고,
        // 휠 입력이 잠잠해진 뒤에만 다음 동작을 받을 수 있도록 잠금 처리합니다.
        let wheelLocked = false;
        let unlockTimer = 0;
        let lastWheelAt = 0;
        const WHEEL_IDLE_MS = 170;

        function scheduleWheelUnlock() {
            clearTimeout(unlockTimer);
            unlockTimer = setTimeout(() => {
                if (animating) {
                    scheduleWheelUnlock();
                    return;
                }
                const idleFor = performance.now() - lastWheelAt;
                if (idleFor < WHEEL_IDLE_MS) {
                    scheduleWheelUnlock();
                    return;
                }
                wheelLocked = false;
            }, WHEEL_IDLE_MS);
        }

        // 섹션 목록과 위치를 휠 이벤트마다 다시 조회하면, 입력이 빠르게 연속될 때
        // getBoundingClientRect()/offsetParent가 반복 실행되어 스타일/레이아웃 계산을 유발할 수 있습니다.
        // 페이지 레이아웃이 바뀔 때만 캐시를 무효화하고, 다음 프레임에서 한 번 갱신합니다.
        let sectionCache = { list: [], tops: [], dirty: true };
        let sectionCacheRaf = 0;

        function refreshSectionCache() {
            const list = Array.from(document.querySelectorAll('#main .page-section, #main .project-detail-spacer'))
                .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height > 0);
            const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            const tops = list.map((el) => Math.max(0, Math.min(el.getBoundingClientRect().top + window.scrollY, maxY)));
            sectionCache = { list, tops, dirty: false };
            return sectionCache;
        }

        function invalidateSectionCache() {
            sectionCache.dirty = true;
            if (sectionCacheRaf) return;
            sectionCacheRaf = requestAnimationFrame(() => {
                sectionCacheRaf = 0;
                if (!animating) refreshSectionCache();
            });
        }

        // 초기 위치를 한 번만 계산하고, 크기 변경/콘텐츠 재배치 때만 갱신합니다.
        refreshSectionCache();
        const mainForSectionCache = document.getElementById('main');
        let sectionResizeObserver = null;
        if (mainForSectionCache && 'ResizeObserver' in window) {
            sectionResizeObserver = new ResizeObserver(invalidateSectionCache);
            sectionResizeObserver.observe(mainForSectionCache);
            sectionCache.list.forEach((el) => sectionResizeObserver.observe(el));
        }
        window.addEventListener('load', invalidateSectionCache, { once: true, passive: true });
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(invalidateSectionCache).catch(() => {});
        }

        function nearestIndex(tops, y) {
            let idx = 0;
            let distance = Infinity;
            tops.forEach((top, i) => {
                const d = Math.abs(top - y);
                if (d < distance) { distance = d; idx = i; }
            });
            return idx;
        }

        function animateToIndex(list, tops, index) {
            if (!list.length) return;
            targetIndex = Math.max(0, Math.min(list.length - 1, index));
            const nextY = tops[targetIndex];
            const currentY = window.scrollY;
            if (Math.abs(nextY - currentY) < 2) {
                cancelAnimationFrame(rafId);
                animating = false;
                window.scrollTo(0, nextY);
                scheduleWheelUnlock();
                return;
            }

            cancelAnimationFrame(rafId);
            startY = currentY;
            endY = nextY;
            startTime = performance.now();
            // 반응은 즉시 시작하고, 거리가 멀어도 지나치게 느려지지 않게 제한합니다.
            duration = Math.max(240, Math.min(340, Math.abs(endY - startY) * 0.34));
            animating = true;

            const frame = (now) => {
                const t = Math.min(1, (now - startTime) / duration);
                // 빠르게 출발하고 도착 직전에 부드럽게 감속
                const eased = 1 - Math.pow(1 - t, 4);
                window.scrollTo(0, startY + (endY - startY) * eased);
                if (t < 1) {
                    rafId = requestAnimationFrame(frame);
                } else {
                    window.scrollTo(0, endY);
                    animating = false;
                    targetIndex = -1;
                    scheduleWheelUnlock();
                }
            };
            rafId = requestAnimationFrame(frame);
        }

        const handleSectionWheel = (e) => {
            // 이 핸들러는 데스크톱 커스텀 스크롤이 활성화된 경우에만 등록합니다.
            // 모바일/모션 감소 환경에 passive:false 리스너를 남겨 브라우저 스크롤을 막지 않습니다.
            if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || Math.abs(e.deltaY) < 2) return;
            if (e.target && e.target.closest('textarea, input, select, [data-native-wheel], .overflow-y-auto, .overflow-auto')) return;

            // 애니메이션/휠 관성이 끝날 때까지 입력을 소비해 추가 섹션 점프를 막습니다.
            if (wheelLocked) {
                e.preventDefault();
                lastWheelAt = performance.now();
                scheduleWheelUnlock();
                return;
            }

            const cached = sectionCache.dirty ? refreshSectionCache() : sectionCache;
            const list = cached.list;
            const tops = cached.tops;
            if (list.length < 2) return;
            const direction = e.deltaY > 0 ? 1 : -1;
            const y = window.scrollY;

            // 애니메이션 중에도 휠 방향을 즉시 반영해 목표를 갱신합니다.
            const baseIndex = animating && targetIndex >= 0 ? targetIndex : nearestIndex(tops, y);
            let nextIndex = baseIndex + direction;

            // 위로 휠을 돌렸을 때 현재 섹션의 시작점에 아직 도달하지 않았다면
            // 먼저 현재 섹션의 시작점으로 부드럽게 돌아갑니다.
            if (!animating && direction < 0) {
                const near = nearestIndex(tops, y);
                if (y - tops[near] > 36) nextIndex = near;
                else nextIndex = near - 1;
            }
            // 아래 방향은 다음 섹션으로 즉시 이동
            nextIndex = Math.max(0, Math.min(list.length - 1, nextIndex));
            if (nextIndex === baseIndex && !animating) return;

            e.preventDefault();
            wheelLocked = true;
            lastWheelAt = performance.now();
            animateToIndex(list, tops, nextIndex);
            scheduleWheelUnlock();
        };

        let wheelListenerAttached = false;
        function syncWheelMode() {
            syncScrollSnapMode();
            const shouldAttach = !reduce.matches && desktopWheel.matches;
            if (shouldAttach && !wheelListenerAttached) {
                window.addEventListener('wheel', handleSectionWheel, { passive: false });
                wheelListenerAttached = true;
            } else if (!shouldAttach && wheelListenerAttached) {
                window.removeEventListener('wheel', handleSectionWheel);
                wheelListenerAttached = false;
                cancelAnimationFrame(rafId);
                animating = false;
                targetIndex = -1;
                wheelLocked = false;
                clearTimeout(unlockTimer);
            }
        }
        syncWheelMode();
        desktopWheel.addEventListener('change', syncWheelMode);
        reduce.addEventListener('change', syncWheelMode);

        window.addEventListener('keydown', (e) => {
            if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) {
                cancelAnimationFrame(rafId);
                animating = false;
                targetIndex = -1;
                wheelLocked = false;
                clearTimeout(unlockTimer);
            }
        });
        window.addEventListener('resize', () => {
            syncWheelMode();
            invalidateSectionCache();
            if (animating) {
                cancelAnimationFrame(rafId);
                animating = false;
                targetIndex = -1;
                wheelLocked = false;
                clearTimeout(unlockTimer);
            }
        }, { passive: true });

        window.addEventListener('beforeunload', () => {
            if (sectionCacheRaf) cancelAnimationFrame(sectionCacheRaf);
            if (sectionResizeObserver) sectionResizeObserver.disconnect();
            clearTimeout(unlockTimer);
            cancelAnimationFrame(rafId);
        }, { once: true });
    }

    /* ---------- 별 섹션 네비 ---------- */
    let observer = null;
    let sections = [];
    let stars = [];
    let rebuildQueued = false;

    function visibleSections() {
        return Array.from(document.querySelectorAll('#main .page-section, #main .project-detail-spacer'))
            .filter((el) => el.offsetParent !== null);
    }

    function setActive(index) {
        stars.forEach((star, i) => {
            const on = i === index;
            star.classList.toggle('is-active', on);
            if (on) star.setAttribute('aria-current', 'true');
            else star.removeAttribute('aria-current');
        });
    }

    function buildSectionNav() {
        rebuildQueued = false;

        let nav = document.getElementById('sectionNav');
        if (!nav) {
            nav = document.createElement('nav');
            nav.id = 'sectionNav';
            nav.className = 'section-nav';
            nav.setAttribute('aria-label', '섹션 이동');
            document.body.appendChild(nav);
        }
        nav.textContent = '';
        if (observer) observer.disconnect();

        sections = visibleSections();
        nav.hidden = sections.length < 2;

        stars = sections.map((sec, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'section-star';
            btn.setAttribute('aria-label', (i + 1) + '번째 섹션으로 이동');
            btn.appendChild(span('section-star-shape'));
            btn.addEventListener('click', () => {
                sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            nav.appendChild(btn);
            return btn;
        });

        // 현재 위치: 화면 한가운데 띠에 걸친 섹션을 "지금 섹션"으로 봅니다.
        const initial = sections.findIndex((sec) => {
            const r = sec.getBoundingClientRect();
            const mid = window.innerHeight / 2;
            return r.top <= mid && r.bottom > mid;
        });
        setActive(initial < 0 ? 0 : initial);

        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) setActive(sections.indexOf(entry.target));
            });
        }, { rootMargin: '-45% 0px -45% 0px' });
        sections.forEach((sec) => observer.observe(sec));
    }

    function queueRebuild() {
        if (rebuildQueued) return;
        rebuildQueued = true;
        requestAnimationFrame(buildSectionNav);
    }


    /* ---------- 배경의 별처럼: 네 행성이 화면 가장자리를 따라 중심 기준 시계 방향(오른쪽 방향)으로 공전 ---------- */
    const BASE_OMEGA = Math.PI * 2 / 85;   // 기준 속도 (약 85초에 한 바퀴)
    const SPEED_BIAS = 0.2;                // 오른쪽 끝 = 1.2배, 왼쪽 끝 = 0.8배 (차이 1.5배)
    const N = 4;                           // 궤도 모양: 위쪽에 모인 납작한 둥근 사각형
    const deg = (v) => v * Math.PI / 180;
    // 시작 자리: 왼쪽 / 위 왼쪽 / 위 오른쪽 / 오른쪽 (화면 좌표계: 시계 방향이 +)
    // 시작 자리: 왼쪽 / 위 왼쪽 / 위 오른쪽 / 오른쪽 (화면 좌표계: 시계 방향이 +)
    const HOME = [deg(188), deg(243), deg(297), deg(352)];
    let orbitFrozen = root.classList.contains('planet-arriving');
    let amp = orbitFrozen ? 0 : 1;         // 둥둥 흔들림 세기 (도착 안착 중에는 0)
    let lastT = 0;
    let orbitRaf = 0;
    const theta = {};
    let ring = [];                         // 궤도 순서(앞사람 = 다음 항목)
    const wobble = {};

    function setupOrbit() {
        // 현재 페이지 행성은 "위 왼쪽" 자리에서 불이 켜진 채 시작합니다.
        const rest = MENU.map((m) => m.key).filter((k) => k !== current);
        const order = [rest[0], current, rest[1], rest[2]];
        order.forEach((k, i) => { theta[k] = HOME[i]; });
        ring = order;
        MENU.forEach((m, i) => {
            wobble[m.key] = {
                fx: 0.11 + i * 0.017, fy: 0.15 + i * 0.013,
                px: i * 1.7, py: i * 2.3 + 1
            };
        });
        measure();
        window.addEventListener('resize', () => { measure(); scheduleOrbitFrame(); }, { passive: true });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
        window.addEventListener('load', measure, { once: true });
        document.addEventListener('visibilitychange', scheduleOrbitFrame);
        if (typeof compact.addEventListener === 'function') compact.addEventListener('change', scheduleOrbitFrame);
        scheduleOrbitFrame();
    }

    // 크기/글자 크기는 리사이즈 때만 다시 읽습니다 (매 프레임 레이아웃 계산 방지).
    const cache = { fs: 16, w: {}, h: {}, lw: {} };
    const labelState = {};
    const compact = window.matchMedia('(max-width: 767px)');   // 모바일에서는 행성이 숨겨져 있으므로 계산 생략
    function measure() {
        cache.fs = parseFloat(getComputedStyle(root).fontSize) || 16;
        MENU.forEach((m) => {
            const el = planetEls[m.key];
            if (!el) return;
            cache.w[m.key] = el.offsetWidth;
            cache.h[m.key] = el.offsetHeight;
            const lb = el.querySelector('.planet-label');
            cache.lw[m.key] = lb ? lb.offsetWidth : 0;
        });
    }

    function scheduleOrbitFrame() {
        if (orbitRaf || document.hidden || compact.matches) return;
        orbitRaf = requestAnimationFrame(orbitFrame);
    }

    function orbitFrame(t) {
        orbitRaf = 0;
        if (document.hidden || compact.matches) { lastT = 0; return; }
        // 화면 전환 오버레이가 활성화되면 RAF 루프를 완전히 멈춥니다.
        // reset()/playArrival() 종료 시 조건을 확인해 다시 예약합니다.
        const transitionClasses = root.classList;
        if (transitionClasses.contains('planet-travel') ||
            transitionClasses.contains('planet-cover') ||
            transitionClasses.contains('planet-arriving') ||
            transitionClasses.contains('planet-reveal')) {
            lastT = 0;
            return;
        }
        const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0;
        lastT = t;
        const moving = !orbitFrozen && !travelling;
        const still = reduce.matches;
        amp += ((moving && !still ? 1 : 0) - amp) * Math.min(1, dt * 2.5);

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const fs = cache.fs;
        // 궤도: 화면 화면 중앙 기준 큰 둥근 사각형 (위쪽은 오른쪽으로, 아래쪽은 왼쪽으로 돕니다)
        const rx = vw / 2 - 5.6 * fs;
        const ry = vh / 2 - 6.2 * fs;      // 위쪽 줄이 화면 맨 위에 바짝 붙도록
        const cx = vw / 2;
        const cy = vh / 2;                 // 화면 중앙 기준으로 한 바퀴
        const geo = {};
        MENU.forEach((item) => {
            const el = planetEls[item.key];
            if (!el) return;
            const w = cache.w[item.key];
            const h = cache.h[item.key];
            const d = w * item.disc;
            const a = theta[item.key];
            const ca = Math.cos(a), sa = Math.sin(a);
            const k = 1 / Math.pow(Math.pow(Math.abs(ca), N) + Math.pow(Math.abs(sa), N), 1 / N);
            geo[item.key] = {
                el, w, h, ca,
                r: Math.max(d / 2, w * 0.42),               // 토성은 고리까지 감안
                x: cx + rx * ca * k,
                y: cy + ry * sa * k
            };
        });

        // 속도 조절: 앞 행성과 가까워지면 뒤 행성이 속도를 늦춰 서로 만나지 않게 합니다.
        const tt = t / 1000;
        ring.forEach((key, i) => {
            const me = geo[key];
            const ahead = geo[ring[(i + 1) % ring.length]];
            if (!me || !ahead) return;
            if (moving && !still) {
                const gap = Math.hypot(ahead.x - me.x, ahead.y - me.y);
                const rr = me.r + ahead.r;
                const hard = rr + 2.2 * fs;                  // 이 거리 안에서는 멈춤 (흔들림 여유 포함)
                const soft = rr + 6 * fs;                    // 이 거리부터 서서히 감속
                const slow = Math.min(1, Math.max(0, (gap - hard) / (soft - hard)));
                theta[key] += dt * BASE_OMEGA * (1 + SPEED_BIAS * me.ca) * slow;
            }
        });

        MENU.forEach((item) => {
            const g = geo[item.key];
            if (!g) return;
            const w8 = wobble[item.key];
            const bx = Math.sin(tt * w8.fx * 6.283 + w8.px) * 0.9 * fs * amp;   // 좌우 둥둥
            const by = Math.sin(tt * w8.fy * 6.283 + w8.py) * 1.3 * fs * amp;   // 위아래 둥둥
            g.el.style.transform = `translate(${(g.x - g.w / 2 + bx).toFixed(1)}px, ${(g.y - g.h / 2 + by).toFixed(1)}px)`;

            // 이름표: 행성이 화면 아래쪽에 있으면 위쪽에, 화면 가장자리에서는 안쪽으로 밀어 항상 보이게
            const key = item.key;
            const up = g.y > vh * 0.6;
            const half = (cache.lw[key] || 0) / 2 + 12;
            const lx = Math.round(Math.min(Math.max(g.x, half), vw - half) - g.x);
            const st = labelState[key] || (labelState[key] = { up: null, lx: null });
            if (st.up !== up) { st.up = up; g.el.classList.toggle('is-up', up); }
            if (st.lx !== lx) { st.lx = lx; g.el.style.setProperty('--lx', lx + 'px'); }
        });
        scheduleOrbitFrame();
    }

    /* ---------- 모바일: 오른쪽 위 햄버거 메뉴 ---------- */
    function buildBurger() {
        if (document.getElementById('navBurger')) return;
        const btn = document.createElement('button');
        btn.id = 'navBurger';
        btn.type = 'button';
        btn.className = 'nav-burger';
        btn.setAttribute('aria-label', '메뉴 열기');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', 'navSheet');
        btn.innerHTML = '<span class="nav-burger-bars" aria-hidden="true"><i></i><i></i><i></i></span>';

        const sheet = document.createElement('nav');
        sheet.id = 'navSheet';
        sheet.className = 'nav-sheet';
        sheet.setAttribute('aria-label', '주 메뉴');
        MENU.forEach((item) => {
            const a = document.createElement('a');
            a.href = item.href;
            a.appendChild(span('nav-sheet-dot'));
            const t = document.createElement('span');
            t.textContent = item.label;
            a.appendChild(t);
            if (item.key === current) a.setAttribute('aria-current', 'page');
            sheet.appendChild(a);
        });

        function setOpen(on) {
            sheet.classList.toggle('is-open', on);
            root.classList.toggle('nav-open', on);
            btn.setAttribute('aria-expanded', String(on));
            btn.setAttribute('aria-label', on ? '메뉴 닫기' : '메뉴 열기');
        }
        btn.addEventListener('click', () => setOpen(!sheet.classList.contains('is-open')));
        sheet.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (!a) { setOpen(false); return; }
            if (a.getAttribute('aria-current') === 'page') { e.preventDefault(); setOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
        window.addEventListener('resize', () => { if (window.innerWidth > 767) setOpen(false); });
        window.addEventListener('pageshow', () => setOpen(false));

        document.body.appendChild(sheet);
        document.body.appendChild(btn);
    }

    /* ---------- 맨 끝에서 더 스크롤하면 살짝 당겨졌다가 돌아오는 느낌 ---------- */
    function setupBounce() {
        const main = document.getElementById('main');
        if (!main || reduce.matches) return;
        const MAX = 64;                       // 최대로 당겨지는 거리(px)
        // 배경(별 캔버스·은하·격자)도 함께 움직입니다. 멀리 있는 배경이라 조금 덜 움직여 깊이감을 줍니다.
        const bgEls = Array.from(document.querySelectorAll('#stars, .galaxy-bg, .grid-bg'));
        let raw = 0;                          // 누적 입력
        let shown = 0;
        let timer = 0;
        let touchY = null;

        const atBottom = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
        const atTop = () => window.scrollY <= 0;

        function setAll(transition, v) {
            const wc = v ? 'transform' : '';
            main.style.willChange = wc;
            bgEls.forEach((el) => { el.style.willChange = wc; });
            main.style.transition = transition;
            main.style.transform = v ? `translate3d(0, ${v.toFixed(1)}px, 0)` : '';
            bgEls.forEach((el) => {
                el.style.transition = transition;
                el.style.transform = v ? `translate3d(0, ${(v * 0.6).toFixed(1)}px, 0)` : '';
            });
        }
        function apply(v) {
            shown = v;
            setAll('none', v);
        }
        function release() {
            raw = 0;
            if (!shown) return;
            // 살짝 넘쳤다가 돌아오는 탄성
            setAll('transform .7s cubic-bezier(.34, 1.56, .64, 1)', 0);
            shown = 0;
        }
        function pull(dir, amount) {
            // dir: +1 = 아래로 더 내리려는 중(위로 당겨짐), -1 = 위로 더 올리려는 중(아래로 당겨짐)
            raw = Math.max(0, raw + amount);
            const v = MAX * (1 - Math.exp(-raw / (MAX * 2.4)));
            apply(-dir * v);
        }

        window.addEventListener('wheel', (e) => {
            if (travelling || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
            const dir = e.deltaY > 0 ? 1 : -1;
            if ((dir > 0 && atBottom()) || (dir < 0 && atTop())) {
                if (shown && Math.sign(shown) === dir) { /* 같은 방향으로 계속 당김 */ }
                pull(dir, Math.abs(e.deltaY) * 0.6);
                clearTimeout(timer);
                timer = setTimeout(release, 110);
            } else if (shown) {
                clearTimeout(timer);
                release();
            }
        }, { passive: true });

        window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; raw = 0; }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (travelling || touchY === null) return;
            const y = e.touches[0].clientY;
            const dy = touchY - y;                 // + = 손가락을 위로 (아래로 스크롤)
            touchY = y;
            const dir = dy > 0 ? 1 : -1;
            if ((dir > 0 && atBottom()) || (dir < 0 && atTop())) {
                pull(dir, Math.abs(dy) * 0.9);
            } else if (shown) {
                release();
            }
        }, { passive: true });
        const end = () => { touchY = null; release(); };
        window.addEventListener('touchend', end, { passive: true });
        window.addEventListener('touchcancel', end, { passive: true });
    }

    function init() {
        buildPlanets();
        setupBounce();
        setupSmoothSectionWheel();
        buildBurger();
        setupOrbit();
        buildSectionNav();

        // 프로젝트 소개 페이지: 프로젝트 탭을 바꾸면 보이는 섹션이 달라지므로 다시 만듭니다.
        const watch = new MutationObserver(queueRebuild);
        document.querySelectorAll('#detail-haevichi, #detail-byheydey').forEach((el) => {
            watch.observe(el, { attributes: true, attributeFilter: ['class'] });
        });

        if (root.classList.contains('planet-arriving')) playArrival();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

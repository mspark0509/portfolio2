// ===== 우측 행성 메뉴 (모든 페이지 공통) =====
// 메인(로고) / 프로젝트 소개 / 소감&자소서 / 문의하기 — 문의하기는 문의 모달을 엽니다.
(function () {
    const MENU = [
        { key: 'main',     cls: 'planet--main',     label: '메인',          href: 'index.html',    text: 'P' },
        { key: 'projects', cls: 'planet--projects', label: '프로젝트 소개', href: 'projects.html' },
        { key: 'resume',   cls: 'planet--resume',   label: '소감 & 자소서', href: 'resume.html' },
        { key: 'contact',  cls: 'planet--contact',  label: '문의하기',      action: 'contact' }
    ];

    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const current = file === 'projects.html' ? 'projects'
        : file === 'resume.html' ? 'resume'
        : 'main';

    function build() {
        if (document.getElementById('planetNav')) return;

        const nav = document.createElement('nav');
        nav.id = 'planetNav';
        nav.className = 'planet-nav';
        nav.setAttribute('aria-label', '주 메뉴');

        MENU.forEach((item) => {
            const el = document.createElement(item.href ? 'a' : 'button');
            el.className = 'planet ' + item.cls;
            el.setAttribute('aria-label', item.label);

            if (item.href) {
                el.href = item.href;
                if (item.key === current) {
                    el.classList.add('is-active');
                    el.setAttribute('aria-current', 'page');
                }
            } else {
                el.type = 'button';
                el.addEventListener('click', () => {
                    if (typeof window.openContactModal === 'function') window.openContactModal();
                });
            }

            if (item.text) el.appendChild(document.createTextNode(item.text));

            const label = document.createElement('span');
            label.className = 'planet-label';
            label.textContent = item.label;
            el.appendChild(label);

            nav.appendChild(el);
        });

        document.body.appendChild(nav);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();

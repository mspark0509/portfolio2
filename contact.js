// 문의하기 페이지: 폼 전송(시뮬레이션) + 토스트
(function () {
    const form = document.getElementById('contactForm');
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMessage');
    let timer;
    function showToast(text) {
        if (!toast || !msg) return;
        msg.textContent = text;
        toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none'), 3500);
    }
    if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        form.reset();
        showToast('메시지가 성공적으로 전달되었습니다! 조속히 답장드리겠습니다.');
    });
})();

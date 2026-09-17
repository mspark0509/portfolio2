// Project Data Configuration
        const projectsData = {
            haevichi: {
                title: "Haevichi Hotel & Resort",
                url: "https://mspark0509.github.io/haevichi-test-server/",
                urlDisplay: "mspark0509.github.io/haevichi-test-server/"
            },
            byheydey: {
                title: "ByHeyDey Furniture & Living",
                url: "https://wjdqhal.github.io/byheydey-fin/",
                urlDisplay: "wjdqhal.github.io/byheydey-fin/"
            }
        };

        let currentActiveProject = 'haevichi';

        // Scroll Progress Tracker
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            document.getElementById('scrollProgress').style.width = scrolled + '%';
        });

        // Tab Navigation Switcher
        function switchTab(tabId, targetProject = null) {
            // Hide all tab contents
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => {
                tab.classList.add('hidden');
            });

            // Show selected tab content
            const activeTabContent = document.getElementById(`page-${tabId}`);
            if (activeTabContent) {
                activeTabContent.classList.remove('hidden');
            }

            // Update Header Nav Links
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => link.classList.remove('active'));

            const currentNavLink = document.getElementById(`nav-${tabId}`);
            if (currentNavLink) {
                currentNavLink.classList.add('active');
            }

            // If switching to projects page with specific target project
            if (tabId === 'projects' && targetProject) {
                selectProjectDetail(targetProject);
            }

            // Smooth Scroll back to top of container
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Project Sub-tab Selector
        function selectProjectDetail(projectKey) {
            currentActiveProject = projectKey;
            const data = projectsData[projectKey];

            // Update Tab Button Styles
            const btnHaevichi = document.getElementById('tab-btn-haevichi');
            const btnByheydey = document.getElementById('tab-btn-byheydey');

            if (projectKey === 'haevichi') {
                btnHaevichi.setAttribute('aria-selected', 'true');
                btnByheydey.setAttribute('aria-selected', 'false');
                btnHaevichi.className = "px-6 py-3 rounded-xl border border-white bg-white text-black font-bold text-sm transition-all flex items-center gap-3 shadow-lg shadow-white/5";
                btnByheydey.className = "px-6 py-3 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 font-medium text-sm hover:border-neutral-600 hover:text-white transition-all flex items-center gap-3";
                
                document.getElementById('detail-haevichi').classList.remove('hidden');
                document.getElementById('detail-byheydey').classList.add('hidden');
            } else {
                btnByheydey.setAttribute('aria-selected', 'true');
                btnHaevichi.setAttribute('aria-selected', 'false');
                btnByheydey.className = "px-6 py-3 rounded-xl border border-white bg-white text-black font-bold text-sm transition-all flex items-center gap-3 shadow-lg shadow-white/5";
                btnHaevichi.className = "px-6 py-3 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 font-medium text-sm hover:border-neutral-600 hover:text-white transition-all flex items-center gap-3";
                
                document.getElementById('detail-byheydey').classList.remove('hidden');
                document.getElementById('detail-haevichi').classList.add('hidden');
            }

            // Update Frame Badge and URL links
            document.getElementById('preview-title-badge').textContent = data.title;
            document.getElementById('preview-url-text').textContent = data.urlDisplay;
            document.getElementById('preview-url-link').href = data.url;
            document.getElementById('direct-site-btn').href = data.url;

            // Update Iframe Source
            const iframe = document.getElementById('project-iframe');
            iframe.src = data.url;
        }

        // Viewport Switcher (Desktop vs Mobile)
        function setViewportMode(mode) {
            const mockupContainer = document.getElementById('mockup-container');
            const btnDesktop = document.getElementById('vp-btn-desktop');
            const btnMobile = document.getElementById('vp-btn-mobile');

            if (mode === 'mobile') {
                mockupContainer.style.width = '375px';
                btnMobile.className = "px-3 py-1 rounded text-xs font-mono bg-neutral-800 text-white flex items-center gap-1.5 transition-colors";
                btnDesktop.className = "px-3 py-1 rounded text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors";
            } else {
                mockupContainer.style.width = '100%';
                btnDesktop.className = "px-3 py-1 rounded text-xs font-mono bg-neutral-800 text-white flex items-center gap-1.5 transition-colors";
                btnMobile.className = "px-3 py-1 rounded text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors";
            }
        }

        // Open Fullscreen Link
        function toggleFullscreenIframe() {
            const url = projectsData[currentActiveProject].url;
            window.open(url, '_blank', 'noopener,noreferrer');
        }

        // Mobile Menu Toggle
        function toggleMobileMenu() {
            const mobileMenu = document.getElementById('mobileMenu');
            const menuIcon = document.getElementById('menuIcon');
            
            if (mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.remove('hidden');
                menuIcon.className = "fa-solid fa-xmark text-xl";
                document.getElementById('mobileMenuBtn').setAttribute('aria-expanded', 'true');
                document.getElementById('mobileMenuBtn').setAttribute('aria-label', '모바일 메뉴 닫기');
            } else {
                mobileMenu.classList.add('hidden');
                menuIcon.className = "fa-solid fa-bars text-xl";
                document.getElementById('mobileMenuBtn').setAttribute('aria-expanded', 'false');
                document.getElementById('mobileMenuBtn').setAttribute('aria-label', '모바일 메뉴 열기');
            }
        }

        // Contact Modal Controllers
        function openContactModal() {
            const modal = document.getElementById('contactModal');
            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.setAttribute('aria-hidden', 'false');
            const firstField = modal.querySelector('input, textarea, button');
            if (firstField) firstField.focus();
        }

        function closeContactModal() {
            const modal = document.getElementById('contactModal');
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

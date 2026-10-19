/**
 * Dashboard Mobile Menu Handler
 * Manages sidebar toggle and overlay for mobile devices
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }
    
    function initMobileMenu() {
        const sidebar = document.querySelector('.dashboard-sidebar, .admin-sidebar');
        const toggle = document.querySelector('.mobile-menu-toggle, .admin-mobile-menu-toggle');
        
        if (!sidebar || !toggle) return;
        
        // Create overlay if it doesn't exist
        let overlay = document.querySelector('.sidebar-overlay, .admin-sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = sidebar.classList.contains('admin-sidebar') ? 'admin-sidebar-overlay' : 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        
        // Toggle sidebar function
        function toggleSidebar(shouldOpen) {
            const isOpen = typeof shouldOpen === 'boolean' ? shouldOpen : !sidebar.classList.contains('open');
            
            if (isOpen) {
                sidebar.classList.add('open');
                overlay.classList.add('active');
                toggle.classList.add('open');
                document.body.style.overflow = 'hidden'; // Prevent background scroll
            } else {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
                toggle.classList.remove('open');
                document.body.style.overflow = '';
            }
        }
        
        // Toggle button click
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });
        
        // Overlay click - close sidebar
        overlay.addEventListener('click', function() {
            toggleSidebar(false);
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768) {
                const isClickInsideSidebar = sidebar.contains(event.target);
                const isClickOnToggle = toggle.contains(event.target);
                
                if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('open')) {
                    toggleSidebar(false);
                }
            }
        });
        
        // Close sidebar when clicking a link (optional, for better UX)
        const sidebarLinks = sidebar.querySelectorAll('a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    // Small delay to allow navigation to start
                    setTimeout(() => toggleSidebar(false), 150);
                }
            });
        });
        
        // Close sidebar on window resize if screen becomes large
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
                    toggleSidebar(false);
                }
            }, 250);
        });
        
        // Handle escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && sidebar.classList.contains('open')) {
                toggleSidebar(false);
            }
        });
    }
})();

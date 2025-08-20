// Bibendo Platform - User Utilities
// Shared utilities for user ID management and session persistence

window.BibendeUtils = {
    /**
     * Get user ID with sessionStorage fallback
     * Prioritizes URL parameter, falls back to sessionStorage
     */
    getUserId: function() {
        const urlParams = new URLSearchParams(window.location.search);
        let userId = urlParams.get('userId');
        
        // If userId in URL, store it in sessionStorage for future use
        if (userId) {
            sessionStorage.setItem('bibendo_userId', userId);
            console.log('User ID stored in session:', userId);
        } else {
            // Fallback to sessionStorage if URL doesn't have userId
            userId = sessionStorage.getItem('bibendo_userId');
            if (userId) {
                console.log('User ID retrieved from session:', userId);
            }
        }
        
        return userId || 'anonymous';
    },

    /**
     * Propagate userId to all internal links on the current page
     */
    propagateUserIdToLinks: function(userId) {
        if (!userId || userId === 'anonymous') {
            console.log('Skipping link propagation - no valid userId');
            return;
        }

        const links = document.querySelectorAll('a[href]');
        let updatedCount = 0;
        
        links.forEach(link => {
            try {
                const url = new URL(link.href, window.location.origin);
                
                // Skip external links
                if (url.origin !== window.location.origin) return;
                
                // Skip if userId already present
                if (url.searchParams.has('userId')) return;
                
                // Skip anchor links (same page)
                if (url.pathname === window.location.pathname && url.hash) return;
                
                // Add userId parameter
                url.searchParams.set('userId', userId);
                link.href = url.toString();
                updatedCount++;
                
                console.log(`Updated link: "${link.textContent?.trim()}" → ${url.pathname}?userId=${userId}`);
            } catch (error) {
                console.warn('Failed to update link:', link.href, error);
            }
        });
        
        console.log(`User ID propagated to ${updatedCount} links`);
    },

    /**
     * Initialize userId propagation when DOM is ready
     * Call this from any page that needs user tracking
     */
    initUserTracking: function() {
        const userId = this.getUserId();
        
        // Propagate to existing links
        this.propagateUserIdToLinks(userId);
        
        // Set up observer for dynamically added links
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if the node itself is a link
                            if (node.tagName === 'A') {
                                this.propagateUserIdToLinks(userId);
                            }
                            // Check for links in added subtree
                            if (node.querySelectorAll && node.querySelectorAll('a').length > 0) {
                                this.propagateUserIdToLinks(userId);
                            }
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            console.log('User tracking initialized with dynamic link observer');
        }
        
        return userId;
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.BibendeUtils.initUserTracking(), 100);
    });
} else {
    // DOM already ready
    setTimeout(() => window.BibendeUtils.initUserTracking(), 100);
}
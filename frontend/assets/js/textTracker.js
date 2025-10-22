// Bibendo Platform - Text Tracker V2
// Simplified version focusing on page visits and navigation

class TextTracker {
    constructor() {
        this.userId = this.getUserId();
        this.pageId = this.getPageId();
        this.pageOpenTime = Date.now();

        this.init();
    }

    init() {
        this.logPageOpen();
        this.setupClickTracking();
        this.setupBeforeUnload();

        console.log('TextTracker V2 initialized for:', { userId: this.userId, pageId: this.pageId });
    }

    getUserId() {
        // Get user ID from URL parameter or sessionStorage
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get('userId');
        if (urlUserId) {
            sessionStorage.setItem('bibendo_userId', urlUserId);
            return urlUserId;
        }
        return sessionStorage.getItem('bibendo_userId') || 'anonymous';
    }

    getPageId() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        return filename;
    }

    // Log timeline event (V2 API)
    async logTimelineEvent(eventType, eventData = {}) {
        try {
            await fetch('/api/timeline/event', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    pageId: this.pageId,
                    eventType: eventType,
                    eventData: eventData
                })
            });

            console.log('Timeline event:', eventType, eventData);
        } catch (error) {
            console.error('Failed to log timeline event:', error);
        }
    }

    logPageOpen() {
        this.logTimelineEvent('page_open', {
            url: window.location.href,
            referrer: document.referrer,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        });
    }

    setupClickTracking() {
        document.addEventListener('click', (event) => {
            const target = event.target;

            // Check if it's a link or within a link
            if (target.tagName === 'A' || target.closest('a')) {
                const link = target.tagName === 'A' ? target : target.closest('a');

                const clickData = {
                    href: link.href,
                    linkText: link.textContent?.trim().substring(0, 100),
                    x: event.clientX,
                    y: event.clientY
                };

                // Extract target page from URL
                try {
                    const url = new URL(link.href);
                    const pathParts = url.pathname.split('/');
                    const fileName = pathParts[pathParts.length - 1];
                    clickData.targetPage = fileName.replace('.html', '');
                } catch (e) {
                    // Invalid URL, skip parsing
                }

                this.logTimelineEvent('link_click', clickData);
            } else {
                // Log general clicks on important elements
                const clickData = {
                    tagName: target.tagName,
                    className: target.className,
                    id: target.id,
                    text: target.textContent?.substring(0, 50) || '',
                    x: event.clientX,
                    y: event.clientY
                };

                // Only log clicks on interactive elements
                if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
                    this.logTimelineEvent('click', clickData);
                }
            }
        });
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            this.logPageClose();
        });
    }

    logPageClose() {
        const duration = Math.floor((Date.now() - this.pageOpenTime) / 1000);

        // Use sendBeacon for reliable logging on page unload
        const data = JSON.stringify({
            userId: this.userId,
            pageId: this.pageId,
            eventType: 'page_close',
            duration: duration
        });

        const blob = new Blob([data], { type: 'application/json' });

        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/timeline/event', blob);
        }

        console.log('Page close logged, duration:', duration, 'seconds');
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.textTracker = new TextTracker();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextTracker;
}

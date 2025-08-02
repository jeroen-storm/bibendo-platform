// Bibendo Platform - Text Tracking JavaScript

class TextTracker {
    constructor() {
        this.userId = this.getUserId();
        this.pageId = this.getPageId();
        this.startTime = Date.now();
        this.scrollEvents = [];
        this.lastScrollPosition = 0;
        this.lastScrollTime = Date.now();
        this.totalTime = 0;
        
        this.init();
    }
    
    init() {
        this.logPageOpen();
        this.setupScrollTracking();
        this.setupClickTracking();
        this.setupVisibilityTracking();
        this.setupBeforeUnload();
        
        console.log('TextTracker initialized for:', { userId: this.userId, pageId: this.pageId });
    }
    
    getUserId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('userId') || 'anonymous';
    }
    
    getPageId() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        return filename;
    }
    
    async logEvent(actionType, data = {}) {
        const eventData = {
            userId: this.userId,
            pageId: this.pageId,
            actionType: actionType,
            data: {
                timestamp: new Date().toISOString(),
                ...data
            }
        };
        
        try {
            await fetch('/api/logs/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData)
            });
            
            console.log('Logged event:', actionType, data);
        } catch (error) {
            console.error('Failed to log event:', error);
        }
    }
    
    logPageOpen() {
        this.logEvent('open', {
            url: window.location.href,
            userAgent: navigator.userAgent,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        });
    }
    
    setupScrollTracking() {
        let scrollTimeout;
        
        const handleScroll = () => {
            const currentTime = Date.now();
            const currentPosition = window.pageYOffset || document.documentElement.scrollTop;
            const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercentage = Math.round((currentPosition / documentHeight) * 100);
            
            // Determine scroll direction
            const direction = currentPosition > this.lastScrollPosition ? 'down' : 'up';
            
            // Only log if there's a significant change (more than 5% or more than 100px)
            const positionDiff = Math.abs(currentPosition - this.lastScrollPosition);
            const timeDiff = currentTime - this.lastScrollTime;
            
            if (positionDiff > 100 || timeDiff > 2000) {
                const scrollData = {
                    direction: direction,
                    fromPosition: this.lastScrollPosition,
                    toPosition: currentPosition,
                    fromPercentage: Math.round((this.lastScrollPosition / documentHeight) * 100),
                    toPercentage: scrollPercentage,
                    duration: timeDiff,
                    speed: Math.round(positionDiff / (timeDiff / 1000)) // pixels per second
                };
                
                this.scrollEvents.push(scrollData);
                this.logEvent('scroll', scrollData);
                
                this.lastScrollPosition = currentPosition;
                this.lastScrollTime = currentTime;
            }
            
            // Clear existing timeout and set new one for scroll end detection
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.logEvent('scroll_end', {
                    finalPosition: currentPosition,
                    finalPercentage: scrollPercentage,
                    totalScrollEvents: this.scrollEvents.length
                });
            }, 150);
        };
        
        // Throttle scroll events
        let scrollThrottle;
        window.addEventListener('scroll', () => {
            if (!scrollThrottle) {
                scrollThrottle = setTimeout(() => {
                    handleScroll();
                    scrollThrottle = null;
                }, 100);
            }
        });
    }
    
    setupClickTracking() {
        document.addEventListener('click', (event) => {
            const target = event.target;
            const clickData = {
                tagName: target.tagName,
                className: target.className,
                id: target.id,
                text: target.textContent?.substring(0, 100) || '',
                href: target.href || null,
                x: event.clientX,
                y: event.clientY,
                pageX: event.pageX,
                pageY: event.pageY
            };
            
            // Special handling for hyperlinks
            if (target.tagName === 'A' || target.closest('a')) {
                const link = target.tagName === 'A' ? target : target.closest('a');
                clickData.linkType = 'hyperlink';
                clickData.href = link.href;
                clickData.linkText = link.textContent?.trim();
                
                this.logEvent('hyperlink_click', clickData);
            } else {
                this.logEvent('click', clickData);
            }
        });
    }
    
    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page became hidden
                this.totalTime += Date.now() - this.startTime;
                this.logEvent('page_hidden', {
                    timeSpent: Math.round((Date.now() - this.startTime) / 1000),
                    totalTimeSpent: Math.round(this.totalTime / 1000)
                });
            } else {
                // Page became visible again
                this.startTime = Date.now();
                this.logEvent('page_visible', {
                    totalTimeSpent: Math.round(this.totalTime / 1000)
                });
            }
        });
    }
    
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            this.logPageClose();
        });
        
        // Also log when page loses focus
        window.addEventListener('blur', () => {
            this.logEvent('page_blur', {
                timeSpent: Math.round((Date.now() - this.startTime) / 1000)
            });
        });
        
        window.addEventListener('focus', () => {
            this.logEvent('page_focus');
        });
    }
    
    logPageClose() {
        const totalTimeSpent = this.totalTime + (Date.now() - this.startTime);
        
        const closeData = {
            totalTimeSpent: Math.round(totalTimeSpent / 1000),
            scrollEvents: this.scrollEvents.length,
            maxScrollPosition: Math.max(...this.scrollEvents.map(e => e.toPosition), 0),
            documentHeight: document.documentElement.scrollHeight,
            finalScrollPercentage: Math.round((window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100)
        };
        
        // Use sendBeacon for reliable logging on page unload
        const data = JSON.stringify({
            userId: this.userId,
            pageId: this.pageId,
            actionType: 'close',
            data: {
                timestamp: new Date().toISOString(),
                ...closeData
            }
        });
        
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/logs/text', data);
        } else {
            // Fallback for browsers that don't support sendBeacon
            this.logEvent('close', closeData);
        }
        
        console.log('Page close logged:', closeData);
    }
    
    // Method to manually track reading progress for specific sections
    trackSectionReading(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.logEvent('section_view', {
                        sectionId: sectionId,
                        sectionText: section.textContent?.substring(0, 200) || '',
                        visibilityRatio: entry.intersectionRatio
                    });
                }
            });
        }, {
            threshold: [0.1, 0.5, 0.9] // Track when 10%, 50%, and 90% visible
        });
        
        observer.observe(section);
    }
    
    // Method to get current reading statistics
    getReadingStats() {
        const currentTime = Date.now();
        const sessionTime = currentTime - this.startTime;
        const totalTime = this.totalTime + sessionTime;
        
        return {
            userId: this.userId,
            pageId: this.pageId,
            sessionTimeSeconds: Math.round(sessionTime / 1000),
            totalTimeSeconds: Math.round(totalTime / 1000),
            scrollEvents: this.scrollEvents.length,
            currentScrollPosition: window.pageYOffset,
            currentScrollPercentage: Math.round((window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100)
        };
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.textTracker = new TextTracker();
    
    // Track all sections with class 'trackable-section'
    document.querySelectorAll('.trackable-section').forEach((section, index) => {
        const sectionId = section.id || `section-${index}`;
        section.id = sectionId;
        window.textTracker.trackSectionReading(sectionId);
    });
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextTracker;
}
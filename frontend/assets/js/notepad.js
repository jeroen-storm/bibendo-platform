// Bibendo Platform - Notepad JavaScript V2
// Simplified version with timeline-based tracking

class NotepadManager {
    constructor() {
        this.userId = this.getUserId();
        this.pageId = this.getPageId();
        this.pageOpenTime = Date.now();
        this.isLoading = false;
        this.autoSaveTimer = null;
        this.autoSaveDelay = 1500; // 1.5 seconds after typing stops
        this.hasUnsavedChanges = false;

        // Exit intent configuration
        this.exitIntentConfig = {
            minCharacters: 20,
            triggerZoneHeight: 150,
            triggerZoneWidth: 150,
            debounceDelay: 500,
            showOnlyOnce: true,
            enabled: true
        };

        this.exitIntentState = {
            hasShownModal: false,
            isMouseInTriggerZone: false,
            debounceTimer: null,
            mouseLeaveTimer: null
        };

        this.init();
    }

    init() {
        this.logPageOpen();
        this.setupEventListeners();
        this.loadExistingContent();
        this.setupExitIntent();
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
        // Extract page ID from filename
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        return filename;
    }

    // Timeline event logging
    async logPageOpen() {
        try {
            await fetch('/api/timeline/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    pageId: this.pageId,
                    eventType: 'page_open'
                })
            });
        } catch (error) {
            console.error('Error logging page open:', error);
        }
    }

    async logPageClose() {
        const duration = Math.floor((Date.now() - this.pageOpenTime) / 1000);

        // Use sendBeacon for reliability on page unload
        const data = JSON.stringify({
            userId: this.userId,
            pageId: this.pageId,
            eventType: 'page_close',
            duration: duration
        });

        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon('/api/timeline/event', blob);
    }

    async logNoteSave(version) {
        try {
            await fetch('/api/timeline/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    pageId: this.pageId,
                    eventType: 'note_save',
                    eventData: { version: version }
                })
            });
        } catch (error) {
            console.error('Error logging note save:', error);
        }
    }

    setupEventListeners() {
        const textarea = document.getElementById('noteTextarea');
        const saveButton = document.getElementById('saveButton');

        // Hide the save button since we're using auto-save
        if (saveButton) {
            saveButton.style.display = 'none';
        }

        if (textarea) {
            textarea.addEventListener('input', () => {
                this.updateCharCounter();
                this.hasUnsavedChanges = true;
                this.scheduleAutoSave();
            });

            textarea.addEventListener('paste', () => {
                setTimeout(() => {
                    this.updateCharCounter();
                    this.scheduleAutoSave();
                }, 10);
            });
        }

        // Keep save button functionality as fallback (but button is hidden)
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveNote());
        }

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.hasUnsavedChanges) {
                    this.saveNote();
                }
            }
        });

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.logPageClose();
            if (this.hasUnsavedChanges) {
                // Synchronous save for beforeunload
                const textarea = document.getElementById('noteTextarea');
                if (textarea) {
                    navigator.sendBeacon('/api/notes/save', new Blob([JSON.stringify({
                        userId: this.userId,
                        pageId: this.pageId,
                        content: textarea.value
                    })], { type: 'application/json' }));
                }
            }
        });
    }

    updateCharCounter() {
        const textarea = document.getElementById('noteTextarea');
        const charCounter = document.querySelector('.char-counter');

        if (textarea && charCounter) {
            const currentLength = textarea.value.length;
            const maxLength = 1000;

            charCounter.textContent = `${currentLength}/${maxLength}`;

            // Update styling based on character count
            charCounter.classList.remove('warning', 'error');
            if (currentLength > maxLength * 0.9) {
                charCounter.classList.add('warning');
            }
            if (currentLength >= maxLength) {
                charCounter.classList.add('error');
            }

            // Prevent further input if at max length
            if (currentLength >= maxLength) {
                textarea.value = textarea.value.substring(0, maxLength);
            }
        }
    }

    scheduleAutoSave() {
        // Clear existing timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }

        // Show typing indicator
        this.showAutoSaveStatus('Aan het typen...', 'typing');

        // Schedule auto-save
        this.autoSaveTimer = setTimeout(() => {
            if (this.hasUnsavedChanges && !this.isLoading) {
                this.saveNote();
            }
        }, this.autoSaveDelay);
    }

    showAutoSaveStatus(message, type = 'info') {
        const statusMessage = document.querySelector('.status-message');
        if (statusMessage) {
            let icon = '';
            switch(type) {
                case 'typing':
                    icon = '✏️ ';
                    break;
                case 'saving':
                    icon = '💾 ';
                    break;
                case 'saved':
                    icon = '✅ ';
                    break;
                case 'error':
                    icon = '❌ ';
                    break;
                default:
                    icon = 'ℹ️ ';
            }

            statusMessage.innerHTML = icon + message;
            statusMessage.className = `status-message auto-save-status ${type}`;
            statusMessage.style.display = 'block';

            if (type === 'typing') {
                setTimeout(() => {
                    if (statusMessage.classList.contains('typing')) {
                        statusMessage.style.display = 'none';
                    }
                }, 1500);
            } else if (type === 'saved') {
                setTimeout(() => {
                    if (statusMessage.classList.contains('saved')) {
                        statusMessage.style.display = 'none';
                    }
                }, 3000);
            }
        }
    }

    async loadExistingContent() {
        try {
            const response = await fetch(`/api/notes/${this.userId}/${this.pageId}`);
            if (response.ok) {
                const data = await response.json();
                const textarea = document.getElementById('noteTextarea');
                if (textarea && data.content) {
                    textarea.value = data.content;
                    this.updateCharCounter();
                }
            }
        } catch (error) {
            console.error('Error loading existing content:', error);
        }
    }

    async saveNote() {
        const textarea = document.getElementById('noteTextarea');
        const saveButton = document.getElementById('saveButton');

        if (!textarea || this.isLoading) return;

        this.isLoading = true;

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Opslaan...';
        }

        this.showAutoSaveStatus('Opslaan...', 'saving');

        try {
            const response = await fetch('/api/notes/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    pageId: this.pageId,
                    content: textarea.value
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showAutoSaveStatus('Opgeslagen', 'saved');
                this.hasUnsavedChanges = false;

                // Log note save event to timeline
                this.logNoteSave(result.version || 1);
            } else {
                throw new Error('Failed to save note');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            this.showAutoSaveStatus('Fout bij opslaan', 'error');
        } finally {
            this.isLoading = false;
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Opslaan';
            }
        }
    }

    // Exit Intent Methods
    setupExitIntent() {
        if (!this.exitIntentConfig.enabled) return;

        // Don't show exit intent on final pages
        if (this.isFinalPage()) return;

        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
    }

    isFinalPage() {
        const pageId = this.pageId;
        return (
            pageId.includes('analysis') ||
            pageId.includes('message') ||
            pageId.includes('final_assignment')
        );
    }

    handleMouseMove(event) {
        if (this.exitIntentState.hasShownModal || !this.exitIntentConfig.enabled) return;

        const x = event.clientX;
        const y = event.clientY;

        const inTriggerZone = (
            x <= this.exitIntentConfig.triggerZoneWidth &&
            y <= this.exitIntentConfig.triggerZoneHeight
        );

        if (inTriggerZone && !this.exitIntentState.isMouseInTriggerZone) {
            this.exitIntentState.isMouseInTriggerZone = true;
            this.startExitIntentDebounce();
        } else if (!inTriggerZone && this.exitIntentState.isMouseInTriggerZone) {
            this.exitIntentState.isMouseInTriggerZone = false;
            this.clearExitIntentDebounce();
        }
    }

    handleMouseLeave(event) {
        if (this.exitIntentState.hasShownModal || !this.exitIntentConfig.enabled) return;

        if (event.clientY <= 0) {
            this.startExitIntentDebounce();
        }
    }

    startExitIntentDebounce() {
        this.clearExitIntentDebounce();

        this.exitIntentState.debounceTimer = setTimeout(() => {
            this.checkAndShowExitModal();
        }, this.exitIntentConfig.debounceDelay);
    }

    clearExitIntentDebounce() {
        if (this.exitIntentState.debounceTimer) {
            clearTimeout(this.exitIntentState.debounceTimer);
            this.exitIntentState.debounceTimer = null;
        }
    }

    checkAndShowExitModal() {
        if (this.exitIntentState.hasShownModal) return;

        const textarea = document.getElementById('noteTextarea');
        if (!textarea) return;

        const currentText = textarea.value.trim();
        const characterCount = currentText.length;

        if (characterCount < this.exitIntentConfig.minCharacters) {
            this.showExitModal(characterCount);
        }
    }

    showExitModal(currentCharCount) {
        this.exitIntentState.hasShownModal = true;

        const modalHtml = `
            <div class="exit-intent-overlay" id="exitIntentOverlay">
                <div class="exit-intent-popup">
                    <div class="exit-intent-header">
                        <img src="../../assets/images/karim_popup.png" alt="Karin" class="exit-intent-avatar">
                        <h3>Hey, weet je zeker dat je klaar bent?</h3>
                    </div>
                    <div class="exit-intent-actions">
                        <button class="exit-intent-btn-secondary" data-action="done">Sluiten</button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        const modal = modalContainer.firstElementChild;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => this.handleModalAction(e, modal));

        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        const closeBtn = modal.querySelector('.exit-intent-btn-secondary');
        if (closeBtn) {
            closeBtn.focus();
        }
    }

    handleModalAction(event, modal) {
        const action = event.target.getAttribute('data-action');

        if (action === 'done') {
            this.closeModal(modal);
            this.exitIntentConfig.enabled = false;
        }

        if (event.target.classList.contains('exit-intent-overlay')) {
            this.closeModal(modal);
            const textarea = document.getElementById('noteTextarea');
            if (textarea) {
                textarea.focus();
            }
        }
    }

    closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const isFinalPage = document.getElementById('aggregatedContent');
    console.log('Page initialization:', { isFinalPage: !!isFinalPage });

    if (isFinalPage) {
        console.log('Initializing FinalPageManager');
        new FinalPageManager();
    } else {
        console.log('Initializing NotepadManager');
        new NotepadManager();
    }
});

// Final page aggregation functionality
class FinalPageManager extends NotepadManager {
    constructor() {
        super();
        this.loadAggregatedContent();
    }

    async loadAggregatedContent() {
        try {
            const level = this.getLevel();
            console.log('Loading aggregated content for:', { userId: this.userId, level });

            const response = await fetch(`/api/notes/${this.userId}/level/${level}`);
            console.log('API response status:', response.status);

            if (response.ok) {
                const notes = await response.json();
                console.log('Received notes:', notes);
                this.displayAggregatedContent(notes);
            } else {
                console.error('API request failed:', response.status);
            }
        } catch (error) {
            console.error('Error loading aggregated content:', error);
        }
    }

    getLevel() {
        const pageId = this.pageId;
        if (pageId.includes('level1')) return 1;
        if (pageId.includes('level2')) return 2;
        if (pageId.includes('level3')) return 3;
        if (pageId === 'final_assignment') return 4;
        return 1;
    }

    displayAggregatedContent(notes) {
        console.log('Pre-filling textareas with notes:', notes);

        // Hide the aggregated content container
        const container = document.getElementById('aggregatedContent');
        if (container) {
            container.style.display = 'none';
        }

        if (!notes || !notes.length) {
            console.log('No notes to pre-fill');
            return;
        }

        // Determine textarea IDs based on page type
        const textareaIds = ['noteTextarea', 'factorsTextarea', 'futureTextarea'];
        if (this.pageId.includes('message')) {
            textareaIds[1] = 'communicationTextarea';
            textareaIds[2] = 'reactionsTextarea';
        } else if (this.pageId.includes('plan')) {
            textareaIds[1] = 'resourcesTextarea';
            textareaIds[2] = 'monitoringTextarea';
        }

        // Fill textareas with corresponding note content
        notes.forEach((note, index) => {
            if (index < textareaIds.length && note.content) {
                const textarea = document.getElementById(textareaIds[index]);
                if (textarea) {
                    textarea.value = note.content;
                    console.log(`Pre-filled ${textareaIds[index]} with: ${note.content}`);
                }
            }
        });

        // Update character counters
        textareaIds.forEach(id => {
            const textarea = document.getElementById(id);
            if (textarea && textarea.value) {
                this.updateCharCounterForTextarea(textarea);
            }
        });
    }

    updateCharCounterForTextarea(textarea) {
        const charCounter = textarea.parentNode.querySelector('.char-counter');
        if (charCounter) {
            const currentLength = textarea.value.length;
            const maxLength = 1000;
            charCounter.textContent = `${currentLength}/${maxLength}`;

            charCounter.classList.remove('warning', 'error');
            if (currentLength > maxLength * 0.9) {
                charCounter.classList.add('warning');
            }
            if (currentLength >= maxLength) {
                charCounter.classList.add('error');
            }
        }
    }
}

// Bibendo Platform - Notepad JavaScript

class NotepadManager {
    constructor() {
        this.userId = this.getUserId();
        this.pageId = this.getPageId();
        this.startTime = Date.now();
        this.editCount = 0;
        this.isLoading = false;
        this.autoSaveTimer = null;
        this.autoSaveDelay = 1500; // 1.5 seconds after typing stops
        this.hasUnsavedChanges = false;
        
        // Exit intent configuration
        this.exitIntentConfig = {
            minCharacters: 20,          // Easy to change!
            triggerZoneHeight: 150,     // Top area (where back button is)
            triggerZoneWidth: 150,      // Left area 
            debounceDelay: 500,         // Avoid false positives
            showOnlyOnce: true,         // Per session
            enabled: true
        };
        
        this.exitIntentState = {
            hasShownModal: false,       // Track if modal was shown this session
            isMouseInTriggerZone: false,
            debounceTimer: null,
            mouseLeaveTimer: null
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadExistingContent();
        this.startTimeTracking();
        this.setupExitIntent();
    }
    
    getUserId() {
        // Get user ID from URL parameter or header
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('userId') || 'anonymous';
    }
    
    getPageId() {
        // Extract page ID from filename
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        return filename;
    }
    
    setupEventListeners() {
        const textarea = document.getElementById('noteTextarea');
        const saveButton = document.getElementById('saveButton');
        const charCounter = document.querySelector('.char-counter');
        
        // Hide the save button since we're using auto-save
        if (saveButton) {
            saveButton.style.display = 'none';
        }
        
        if (textarea) {
            textarea.addEventListener('input', () => {
                this.updateCharCounter();
                this.incrementEditCount();
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
                this.saveTimeSpent();
                // Auto-save when user leaves the page
                if (this.hasUnsavedChanges) {
                    this.saveNote();
                }
            } else {
                this.startTime = Date.now();
            }
        });
        
        // Save time and auto-save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveTimeSpent();
            if (this.hasUnsavedChanges) {
                this.saveNote();
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
    
    incrementEditCount() {
        this.editCount++;
        this.hasUnsavedChanges = true;
    }
    
    scheduleAutoSave() {
        // Clear existing timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // Show saving indicator
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
            // Add icons to messages
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
            
            // Auto-hide typing indicator after short delay
            if (type === 'typing') {
                setTimeout(() => {
                    if (statusMessage.classList.contains('typing')) {
                        statusMessage.style.display = 'none';
                    }
                }, 1500);
            } else if (type === 'saved') {
                // Hide success message after longer delay
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
        
        // Update save button if it exists (though it's hidden)
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Opslaan...';
        }
        
        // Show auto-save feedback
        this.showAutoSaveStatus('Opslaan...', 'saving');
        
        try {
            const timeSpent = this.calculateTimeSpent();
            
            const response = await fetch('/api/notes/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    pageId: this.pageId,
                    content: textarea.value,
                    editCount: this.editCount,
                    timeSpent: timeSpent
                })
            });
            
            if (response.ok) {
                this.showAutoSaveStatus('Opgeslagen', 'saved');
                this.editCount = 0; // Reset edit count after successful save
                this.hasUnsavedChanges = false; // Mark as saved
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
    
    showStatusMessage(message, type = 'success') {
        const statusMessage = document.querySelector('.status-message');
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`;
            statusMessage.style.display = 'block';
            
            // Hide message after 5 seconds
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 5000);
        }
    }
    
    calculateTimeSpent() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }
    
    async saveTimeSpent() {
        const timeSpent = this.calculateTimeSpent();
        if (timeSpent < 5) return; // Don't save very short sessions
        
        try {
            await fetch('/api/logs/time', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    pageId: this.pageId,
                    timeSpent: timeSpent,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Error saving time spent:', error);
        }
    }
    
    startTimeTracking() {
        this.startTime = Date.now();
    }
    
    // Exit Intent Methods
    setupExitIntent() {
        if (!this.exitIntentConfig.enabled) return;
        
        // Don't show exit intent on final pages (analysis, message, final assignment)
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
        
        // Check if mouse is in trigger zone (top-left area)
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
        
        // Check if mouse left through top of window
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
        
        // Only show modal if user hasn't written enough
        if (characterCount < this.exitIntentConfig.minCharacters) {
            this.showExitModal(characterCount);
        }
    }
    
    showExitModal(currentCharCount) {
        this.exitIntentState.hasShownModal = true;
        
        // Create modal HTML using emma-overlay pattern
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
        
        // Add to DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        const modal = modalContainer.firstElementChild;
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.addEventListener('click', (e) => this.handleModalAction(e, modal));
        
        // Show modal with animation (like emma overlay)
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Focus trap - keep focus in modal
        const closeBtn = modal.querySelector('.exit-intent-btn-secondary');
        if (closeBtn) {
            closeBtn.focus();
        }
    }
    
    handleModalAction(event, modal) {
        const action = event.target.getAttribute('data-action');
        
        if (action === 'done') {
            // Close modal and allow natural exit behavior
            this.closeModal(modal);
            // User chose to be done, disable exit intent for this session
            this.exitIntentConfig.enabled = false;
        }
        
        // Click outside modal to close
        if (event.target.classList.contains('exit-intent-overlay')) {
            this.closeModal(modal);
            const textarea = document.getElementById('noteTextarea');
            if (textarea) {
                textarea.focus();
            }
        }
    }
    
    closeModal(modal) {
        // Use emma-overlay pattern for closing
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300); // Match transition duration
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if this is a final page by looking for aggregatedContent element
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
        
        // Hide the aggregated content container since we're pre-filling textareas
        const container = document.getElementById('aggregatedContent');
        if (container) {
            container.style.display = 'none';
        }
        
        if (!notes || !notes.length) {
            console.log('No notes to pre-fill');
            return;
        }
        
        // Pre-fill the textareas with the saved notes
        const textareaIds = ['noteTextarea', 'factorsTextarea', 'futureTextarea']; // analysis page
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
    
    getPageTitle(pageId) {
        const titles = {
            'note1': 'Notitie 1',
            'note2': 'Notitie 2', 
            'note3': 'Notitie 3'
        };
        
        for (const [key, title] of Object.entries(titles)) {
            if (pageId.includes(key)) return title;
        }
        
        return pageId;
    }
}
// Bibendo Import Tool
// Real-time feedback during data import

class BibendoImporter {
    constructor() {
        this.bearerTokenInput = document.getElementById('bearerToken');
        this.importBtn = document.getElementById('importBtn');
        this.feedbackSection = document.getElementById('feedbackSection');
        this.statusList = document.getElementById('statusList');
        this.progressFill = document.getElementById('progressFill');
        this.resultCard = document.getElementById('resultCard');
        this.errorCard = document.getElementById('errorCard');
        this.errorMessage = document.getElementById('errorMessage');
        this.resultStats = document.getElementById('resultStats');

        this.currentUserId = null;

        this.init();
    }

    init() {
        // Event listeners
        this.importBtn.addEventListener('click', () => this.startImport());

        document.getElementById('newImportBtn').addEventListener('click', () => {
            this.resetForm();
        });

        document.getElementById('retryBtn').addEventListener('click', () => {
            this.startImport();
        });

        document.getElementById('viewTimelineBtn').addEventListener('click', () => {
            if (this.currentUserId) {
                window.location.href = `user-timeline.html?userId=${this.currentUserId}`;
            }
        });
    }

    resetForm() {
        this.bearerTokenInput.value = '';
        this.feedbackSection.classList.remove('active');
        this.resultCard.classList.remove('active');
        this.errorCard.classList.remove('active');
        this.statusList.innerHTML = '';
        this.progressFill.style.width = '0%';
        this.importBtn.disabled = false;
        this.currentUserId = null;
    }

    async startImport() {
        const token = this.bearerTokenInput.value.trim();

        if (!token) {
            alert('Voer eerst een Bearer token in');
            return;
        }

        // Disable button and show feedback section
        this.importBtn.disabled = true;
        this.feedbackSection.classList.add('active');
        this.resultCard.classList.remove('active');
        this.errorCard.classList.remove('active');
        this.statusList.innerHTML = '';
        this.progressFill.style.width = '0%';

        try {
            // Step 1: Start import
            this.addStatus('🔍 Valideren van Bearer token...', 'active');
            this.addStatus('⏱️ Import kan 1-2 minuten duren bij veel runs...', 'pending');
            this.updateProgress(5);

            // Create AbortController for timeout control
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

            const response = await fetch('/api/bibendo/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bearerToken: token }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Import mislukt');
            }

            const result = await response.json();

            // Update statuses based on result
            this.updateStatus('🔍 Valideren van Bearer token...', 'success', '✅ Token gevalideerd');
            this.currentUserId = result.userId;
            this.updateProgress(20);

            this.addStatus('👤 Gebruiker ophalen...', 'active');
            await this.delay(300);
            this.updateStatus('👤 Gebruiker ophalen...', 'success', `✅ Gebruiker: ${result.userId}`);
            this.updateProgress(30);

            this.addStatus('🎮 Games ophalen...', 'active');
            await this.delay(300);
            this.updateStatus('🎮 Games ophalen...', 'success', `✅ ${result.gamesCount} games gevonden`);
            this.updateProgress(50);

            this.addStatus('🏃 Runs synchroniseren...', 'active');
            await this.delay(300);
            this.updateStatus('🏃 Runs synchroniseren...', 'success', `✅ ${result.runsCount} runs gesynchroniseerd`);
            this.updateProgress(70);

            this.addStatus('📝 Antwoorden ophalen...', 'active');
            await this.delay(300);
            this.updateStatus('📝 Antwoorden ophalen...', 'success', `✅ ${result.choicesCount} antwoorden opgeslagen`);
            this.updateProgress(90);

            this.addStatus('💾 Data opslaan...', 'active');
            await this.delay(300);
            this.updateStatus('💾 Data opslaan...', 'success', '✅ Data opgeslagen in database');
            this.updateProgress(100);

            // Show success card
            await this.delay(500);
            this.showSuccess(result);

        } catch (error) {
            console.error('Import error:', error);

            // Check if it's a timeout error
            if (error.name === 'AbortError') {
                this.showError('Import duurde te lang (>5 minuten). De data kan wel geïmporteerd zijn - check de timeline.');
            } else {
                this.showError(error.message);
            }
        } finally {
            this.importBtn.disabled = false;
        }
    }

    addStatus(message, state = 'pending') {
        const statusItem = document.createElement('div');
        statusItem.className = `status-item ${state}`;
        statusItem.innerHTML = `
            <span class="status-icon">${this.getIcon(state)}</span>
            <span class="status-text">${message}</span>
        `;
        this.statusList.appendChild(statusItem);

        // Scroll to bottom
        this.statusList.scrollTop = this.statusList.scrollHeight;
    }

    updateStatus(oldMessage, newState, newMessage) {
        const items = this.statusList.querySelectorAll('.status-item');
        for (const item of items) {
            const textSpan = item.querySelector('.status-text');
            if (textSpan && textSpan.textContent === oldMessage) {
                item.className = `status-item ${newState}`;
                item.querySelector('.status-icon').textContent = this.getIcon(newState);
                if (newMessage) {
                    textSpan.textContent = newMessage;
                }
                break;
            }
        }
    }

    getIcon(state) {
        switch (state) {
            case 'active': return '⏳';
            case 'success': return '✅';
            case 'error': return '❌';
            default: return '⭕';
        }
    }

    updateProgress(percentage) {
        this.progressFill.style.width = `${percentage}%`;
    }

    showSuccess(result) {
        this.resultCard.classList.add('active');

        // Build stats HTML
        const stats = [
            { label: 'Games', value: result.gamesCount || 0 },
            { label: 'Runs', value: result.runsCount || 0 },
            { label: 'Antwoorden', value: result.choicesCount || 0 }
        ];

        if (result.timeRange) {
            stats.push({
                label: 'Periode',
                value: `${result.timeRange.oldest} - ${result.timeRange.newest}`
            });
        }

        this.resultStats.innerHTML = stats.map(stat => `
            <div class="import-stat-item">
                <div class="stat-label">${stat.label}</div>
                <div class="stat-value">${stat.value}</div>
            </div>
        `).join('');
    }

    showError(message) {
        this.errorCard.classList.add('active');
        this.errorMessage.textContent = message;
        this.updateProgress(0);

        // Mark last status as error
        const items = this.statusList.querySelectorAll('.status-item');
        if (items.length > 0) {
            const lastItem = items[items.length - 1];
            lastItem.className = 'status-item error';
            lastItem.querySelector('.status-icon').textContent = '❌';
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BibendoImporter();
});

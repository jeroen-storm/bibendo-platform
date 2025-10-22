// Bibendo Platform - Admin Timeline Dashboard V2

class AdminTimelineDashboard {
    constructor() {
        this.userId = this.getUserIdFromURL();
        this.userData = null;
        this.contentData = [];
        this.timelineData = [];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserData();
    }

    getUserIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('userId');
    }

    setupEventListeners() {
        // Back button
        document.getElementById('backToOverview')?.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Export button
        document.getElementById('exportTimeline')?.addEventListener('click', () => {
            this.exportTimelineCSV();
        });

        // Modal close
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('assignmentModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'assignmentModal') {
                this.closeModal();
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');
    }

    async loadUserData() {
        if (!this.userId) {
            alert('Geen gebruiker ID gevonden');
            window.location.href = 'dashboard.html';
            return;
        }

        document.getElementById('userDetailLoading').style.display = 'block';

        try {
            // Load user info
            const userResponse = await fetch(`/api/admin/users`);
            if (!userResponse.ok) {
                throw new Error(`Users API failed: ${userResponse.status}`);
            }
            const allUsers = await userResponse.json();
            this.userData = allUsers.find(u => u.user_id === this.userId);

            // Load content data
            const contentResponse = await fetch(`/api/admin/user/${this.userId}/content`);
            if (!contentResponse.ok) {
                console.error('Content API failed:', contentResponse.status);
                this.contentData = [];
            } else {
                this.contentData = await contentResponse.json();
            }

            // Load timeline data
            const timelineResponse = await fetch(`/api/admin/user/${this.userId}/timeline`);
            if (!timelineResponse.ok) {
                console.error('Timeline API failed:', timelineResponse.status);
                this.timelineData = [];
            } else {
                this.timelineData = await timelineResponse.json();
            }

            this.displayUserInfo();
            this.displayContentTab();
            this.displayTimelineTab();

        } catch (error) {
            console.error('Error loading user data:', error);
            alert(`Fout bij laden van gebruiker data: ${error.message}\n\nCheck de browser console voor details.`);
        } finally {
            document.getElementById('userDetailLoading').style.display = 'none';
        }
    }

    displayUserInfo() {
        document.getElementById('userIdDisplay').textContent = this.userId;

        // Update meta stats
        document.querySelector('#contentCount .meta-value').textContent = this.contentData.length;
        document.querySelector('#timelineCount .meta-value').textContent = this.timelineData.length;

        // Calculate total time from page_close events
        const totalTime = this.timelineData
            .filter(e => e.event_type === 'page_close' && e.duration)
            .reduce((sum, e) => sum + e.duration, 0);
        document.querySelector('#totalTimeSpent .meta-value').textContent = this.formatDuration(totalTime);

        // User timestamps
        if (this.userData) {
            document.querySelector('#userCreatedAt .meta-value').textContent =
                this.formatDate(this.userData.created_at);
            document.querySelector('#userLastActive .meta-value').textContent =
                this.formatDate(this.userData.last_active);
        }
    }

    displayContentTab() {
        const container = document.getElementById('contentContainer');

        if (!this.contentData || this.contentData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>Geen content gevonden voor deze gebruiker</p>
                </div>
            `;
            return;
        }

        // Group content by level
        const levels = {
            1: { title: 'Level 1', notes: [], analysis: [] },
            2: { title: 'Level 2', notes: [], message: [] },
            3: { title: 'Level 3', notes: [], final: [] }
        };

        this.contentData.forEach(item => {
            const level = this.extractLevel(item.page_id);

            if (item.content_type === 'note') {
                levels[level]?.notes.push(item);
            } else if (item.content_type === 'analysis') {
                levels[level]?.analysis.push(item);
            } else if (item.content_type === 'message') {
                levels[level]?.message.push(item);
            } else if (item.content_type === 'assignment_field') {
                levels[3]?.final.push(item);
            }
        });

        let html = '';

        // Render each level
        Object.entries(levels).forEach(([levelNum, levelData]) => {
            const hasContent = (levelData.notes?.length || 0) > 0 ||
                             (levelData.analysis?.length || 0) > 0 ||
                             (levelData.message?.length || 0) > 0 ||
                             (levelData.final?.length || 0) > 0;

            if (!hasContent) return;

            html += `<div class="level-section">`;
            html += `<h3>${levelData.title}</h3>`;

            // Notes
            if (levelData.notes && levelData.notes.length > 0) {
                html += `<h4 style="color: #666; font-size: 14px; margin: 15px 0 10px 0;">Notities</h4>`;
                levelData.notes.forEach(note => {
                    html += this.createAccordionItem(note);
                });
            }

            // Analysis/Message
            if (levelData.analysis && levelData.analysis.length > 0) {
                html += `<h4 style="color: #666; font-size: 14px; margin: 15px 0 10px 0;">Analyse</h4>`;
                levelData.analysis.forEach(item => {
                    html += this.createAccordionItem(item);
                });
            }

            if (levelData.message && levelData.message.length > 0) {
                html += `<h4 style="color: #666; font-size: 14px; margin: 15px 0 10px 0;">Bericht</h4>`;
                levelData.message.forEach(item => {
                    html += this.createAccordionItem(item);
                });
            }

            // Final assignment
            if (levelData.final && levelData.final.length > 0) {
                html += `<h4 style="color: #666; font-size: 14px; margin: 15px 0 10px 0;">Eindopdracht</h4>`;
                html += `
                    <div class="accordion-item">
                        <div class="accordion-header" onclick="adminDashboard.showAssignmentModal()">
                            <div>
                                <div class="accordion-title">Email naar Emma (${levelData.final.length} velden)</div>
                                <div class="accordion-meta">Klik om alle velden te bekijken</div>
                            </div>
                            <span class="accordion-toggle">→</span>
                        </div>
                    </div>
                `;
            }

            html += `</div>`;
        });

        container.innerHTML = html;

        // Setup accordion click handlers
        this.setupAccordions();
    }

    createAccordionItem(item) {
        const title = this.getPageTitle(item.page_id);
        const preview = item.content ? item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '') : 'Leeg';

        return `
            <div class="accordion-item" data-id="${item.id}">
                <div class="accordion-header">
                    <div>
                        <div class="accordion-title">${title}</div>
                        <div class="accordion-meta">
                            Laatst aangepast: ${this.formatDate(item.updated_at)} |
                            Versie: ${item.version}
                        </div>
                    </div>
                    <span class="accordion-toggle">▼</span>
                </div>
                <div class="accordion-body">
                    <div class="accordion-content">
                        <div class="content-preview">${this.escapeHtml(item.content || 'Geen content')}</div>
                    </div>
                </div>
            </div>
        `;
    }

    setupAccordions() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Don't toggle if it's the assignment modal trigger
                if (header.getAttribute('onclick')) return;

                const item = header.closest('.accordion-item');
                item.classList.toggle('open');
            });
        });
    }

    showAssignmentModal() {
        const finalAssignment = this.contentData.filter(item => item.content_type === 'assignment_field');

        if (finalAssignment.length === 0) {
            alert('Geen eindopdracht data gevonden');
            return;
        }

        const fieldLabels = {
            1: 'Huidige producten SneakSpot',
            2: 'Waarom weinig jongeren',
            3: 'Sneakers die SneakSpot moet verkopen',
            4: 'Sneakerstyle van jongeren',
            5: 'Geschikte sneakerstyle voor SneakSpot',
            6: 'Waarom geschikt voor SneakSpot',
            7: 'Activiteiten Loopz analyse',
            8: 'Aanbevolen activiteiten van Sasha',
            9: 'Conclusie & aanbevelingen'
        };

        let html = '';
        finalAssignment
            .sort((a, b) => (a.field_number || 0) - (b.field_number || 0))
            .forEach(field => {
                const fieldNum = field.field_number || 0;
                const label = fieldLabels[fieldNum] || `Veld ${fieldNum}`;

                html += `
                    <div class="assignment-field">
                        <div class="assignment-field-label">${fieldNum}. ${label}</div>
                        <div class="assignment-field-content">${this.escapeHtml(field.content || 'Leeg')}</div>
                    </div>
                `;
            });

        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('assignmentModal').classList.add('show');
    }

    closeModal() {
        document.getElementById('assignmentModal').classList.remove('show');
    }

    displayTimelineTab() {
        const container = document.getElementById('timelineContainer');

        if (!this.timelineData || this.timelineData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⏱️</div>
                    <p>Geen timeline events gevonden</p>
                </div>
            `;
            return;
        }

        // Group events by date
        const eventsByDate = this.groupEventsByDate(this.timelineData);

        let html = '<div class="timeline">';

        // Render each day
        Object.entries(eventsByDate)
            .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
            .forEach(([date, events]) => {
                html += `
                    <div class="timeline-day">
                        <div class="timeline-day-header">📅 ${this.formatDateLong(date)}</div>
                        <div class="timeline-events">
                `;

                // Render events for this day
                events.forEach(event => {
                    html += this.createTimelineEvent(event);
                });

                html += `
                        </div>
                    </div>
                `;
            });

        html += '</div>';

        container.innerHTML = html;
        document.getElementById('exportTimeline').style.display = 'block';
    }

    createTimelineEvent(event) {
        const config = this.getEventConfig(event.event_type);
        const time = new Date(event.timestamp).toLocaleTimeString('nl-NL', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        let meta = this.getPageTitle(event.page_id);

        // Add specific details based on event type
        if (event.event_type === 'link_click' && event.event_data) {
            try {
                const data = JSON.parse(event.event_data);
                if (data.targetPage) {
                    meta += ` → ${this.getPageTitle(data.targetPage)}`;
                }
            } catch (e) {}
        }

        if (event.event_type === 'note_save' && event.event_data) {
            try {
                const data = JSON.parse(event.event_data);
                if (data.version) {
                    meta += ` (v${data.version})`;
                }
            } catch (e) {}
        }

        let durationHtml = '';
        if (event.duration) {
            durationHtml = `<div class="timeline-duration">⏱️ Tijd op pagina: ${this.formatDuration(event.duration)}</div>`;
        }

        return `
            <div class="timeline-event">
                <div class="timeline-time">${time}</div>
                <div class="timeline-event-content">
                    <div class="timeline-icon">${config.icon}</div>
                    <div class="timeline-details">
                        <div class="timeline-label">${config.label}</div>
                        <div class="timeline-meta">${meta}</div>
                        ${durationHtml}
                    </div>
                </div>
            </div>
        `;
    }

    getEventConfig(eventType) {
        const configs = {
            page_open: { icon: '📄', label: 'Pagina geopend' },
            page_close: { icon: '📄', label: 'Pagina verlaten' },
            note_save: { icon: '✏️', label: 'Note opgeslagen' },
            assignment_save: { icon: '💾', label: 'Eindopdracht opgeslagen' },
            link_click: { icon: '🔗', label: 'Link geklikt' },
            click: { icon: '🖱️', label: 'Click' },
            open: { icon: '📄', label: 'Pagina geopend' },
            close: { icon: '📄', label: 'Pagina gesloten' },
            hyperlink_click: { icon: '🔗', label: 'Link geklikt' }
        };

        return configs[eventType] || { icon: '•', label: eventType };
    }

    groupEventsByDate(events) {
        const grouped = {};

        events.forEach(event => {
            const date = event.timestamp.split(' ')[0]; // Get date part only
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(event);
        });

        // Sort events within each day
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) =>
                new Date(a.timestamp) - new Date(b.timestamp)
            );
        });

        return grouped;
    }

    exportTimelineCSV() {
        const csv = ['Timestamp,Event Type,Page ID,Duration,Details'];

        this.timelineData.forEach(event => {
            const row = [
                event.timestamp,
                event.event_type,
                event.page_id,
                event.duration || '',
                event.event_data || ''
            ].map(val => `"${val}"`).join(',');

            csv.push(row);
        });

        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timeline_${this.userId}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // Utility methods
    extractLevel(pageId) {
        if (pageId.includes('level1')) return 1;
        if (pageId.includes('level2')) return 2;
        if (pageId.includes('level3')) return 3;
        if (pageId.includes('final')) return 3;
        return 1;
    }

    getPageTitle(pageId) {
        const titles = {
            // Level 1
            'note1_level1': 'Note 1: Waarom weinig jongeren',
            'note2_level1': 'Note 2: Producten & Kenmerken',
            'note3_level1': 'Note 3: Toekomst/Veranderingen',
            'analysis_level1': 'Analyse Level 1',

            // Level 2
            'note1_level2': 'Note 1: Sneakerstyle',
            'note2_level2': 'Note 2: Urban Flow & Geschiktheid',
            'message_level2': 'Bericht Level 2',

            // Level 3
            'note1_level3': 'Note 1: Activiteiten',
            'note2_level3': 'Note 2: Sasha\'s activiteiten',
            'note3_level3': 'Note 3: Evenementenbureaus',
            'final_assignment': 'Eindopdracht',

            // Text pages
            'oefentekst_level1': 'Oefentekst',
            'nieuwsbericht_overzicht_level1': 'Nieuwsberichten Overzicht',
            'nieuwsbericht_1_level1': 'Nieuwsbericht 1',
            'nieuwsbericht_2_level1': 'Nieuwsbericht 2',
            'nieuwsbericht_3_level1': 'Nieuwsbericht 3',
            'assortiment_level1': 'Assortiment',
            'klantrecensies_level1': 'Klantrecensies',
            'doelgroep_level2': 'Doelgroep',
            'sneakers_jongeren_level2': 'Sneakers Jongeren',
            'sneaker_urbanflow_level2': 'Urban Flow',
            'sneaker_flexcore_level2': 'FlexCore',
            'sneaker_motionstep_level2': 'MotionStep',
            'evenement_level3': 'Evenement',
            'ervaringen_level3': 'Ervaringen',
            'evenementenbureaus_overzicht_level3': 'Evenementenbureaus',
            'evenement_urbanpulse_level3': 'Urban Pulse',
            'evenement_momentum_level3': 'Momentum',
            'evenement_nextgen_level3': 'NextGen'
        };

        return titles[pageId] || pageId;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('nl-NL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDateLong(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('nl-NL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatDuration(seconds) {
        if (!seconds) return '0s';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}u ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminTimelineDashboard();
});

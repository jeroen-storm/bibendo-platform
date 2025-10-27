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
        document.getElementById('exportData')?.addEventListener('click', () => {
            this.exportCompleteDataCSV();
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
            alert('Geen leerling ID gevonden');
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
            alert(`Fout bij laden van leerling data: ${error.message}\n\nCheck de browser console voor details.`);
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

        // User last active timestamp
        if (this.userData) {
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
                    <p>Geen content gevonden voor deze leerling</p>
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

            // Analysis/Message (combined fields)
            if (levelData.analysis && levelData.analysis.length > 0) {
                html += `<h4 style="color: #666; font-size: 14px; margin: 15px 0 10px 0;">Analyse</h4>`;
                html += this.createMultiFieldAccordion(levelData.analysis, 'Eindopdracht level ' + levelNum + ' - De analyse');
            }

            if (levelData.message && levelData.message.length > 0) {
                html += `<h4 style="color: #666; font-size: 14px; margin: 15px 0 10px 0;">Bericht</h4>`;
                html += this.createMultiFieldAccordion(levelData.message, 'Eindopdracht level ' + levelNum + ' - Het bericht');
            }

            // Final assignment
            if (levelData.final && levelData.final.length > 0) {
                html += `<h4 style="color: #666; font-size: 14px; margin: 15px 0 10px 0;">Eindopdracht</h4>`;
                html += this.createFinalAssignmentAccordion(levelData.final);
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

    createMultiFieldAccordion(items, title) {
        // Filter out items with invalid field_number (null, 0, undefined)
        const validItems = items.filter(item => item.field_number && item.field_number > 0);

        // Sort items by field_number
        const sortedItems = validItems.sort((a, b) => a.field_number - b.field_number);

        // Get the most recent update date
        const latestUpdate = sortedItems.reduce((latest, item) => {
            return !latest || new Date(item.updated_at) > new Date(latest) ? item.updated_at : latest;
        }, null);

        // Field labels for analysis and message
        const analysisLabels = {
            1: 'Waarom komen er weinig jongeren naar SneakSpot?',
            2: 'Wat verkoopt SneakSpot op dit moment?',
            3: 'Wat moet SneakSpot veranderen om meer jongeren aan te trekken?'
        };

        const messageLabels = {
            1: 'Welke sneakerstyle spreekt jongeren aan? Wat hebben de doelgroep gemeen?',
            2: 'Kenmerken van Urban Flow en waarom het past bij SneakSpot'
        };

        // Determine which labels to use based on title
        const labels = title.toLowerCase().includes('analyse') ? analysisLabels : messageLabels;

        // Build the fields HTML
        let fieldsHtml = '';
        sortedItems.forEach(item => {
            const fieldNum = item.field_number;
            const label = labels[fieldNum] || `Veld ${fieldNum}`;

            fieldsHtml += `
                <div class="multi-field-item">
                    <div class="multi-field-label">${fieldNum}. ${label}</div>
                    <div class="multi-field-content">${this.escapeHtml(item.content || 'Leeg')}</div>
                </div>
            `;
        });

        return `
            <div class="accordion-item multi-field open" data-pageId="${sortedItems[0]?.page_id}">
                <div class="accordion-header-static">
                    <div>
                        <div class="accordion-title">${title} (${sortedItems.length} velden)</div>
                        <div class="accordion-meta">
                            Laatst aangepast: ${this.formatDate(latestUpdate)}
                        </div>
                    </div>
                </div>
                <div class="accordion-body">
                    <div class="accordion-content">
                        ${fieldsHtml}
                    </div>
                </div>
            </div>
        `;
    }

    createFinalAssignmentAccordion(items) {
        // Filter out items with invalid field_number (null, 0, undefined)
        const validItems = items.filter(item => item.field_number && item.field_number > 0);

        // Sort items by field_number
        const sortedItems = validItems.sort((a, b) => a.field_number - b.field_number);

        // Get the most recent update date
        const latestUpdate = sortedItems.reduce((latest, item) => {
            return !latest || new Date(item.updated_at) > new Date(latest) ? item.updated_at : latest;
        }, null);

        // Field labels for final assignment (10 fields)
        const fieldLabels = {
            1: 'Huidige producten SneakSpot',
            2: 'Waarom weinig jongeren',
            3: 'Sneakers die SneakSpot moet verkopen',
            4: 'Sneakerstyle van jongeren',
            5: 'Geschikte sneakerstyle voor SneakSpot',
            6: 'Waarom geschikt voor SneakSpot',
            7: 'Activiteiten Loopz analyse',
            8: 'Aanbevolen activiteiten van Sasha',
            9: 'Conclusie & aanbevelingen',
            10: 'Advies evenementenbureau'
        };

        // Build the fields HTML
        let fieldsHtml = '';
        sortedItems.forEach(item => {
            const fieldNum = item.field_number;
            const label = fieldLabels[fieldNum] || `Veld ${fieldNum}`;

            fieldsHtml += `
                <div class="multi-field-item">
                    <div class="multi-field-label">${fieldNum}. ${label}</div>
                    <div class="multi-field-content">${this.escapeHtml(item.content || 'Leeg')}</div>
                </div>
            `;
        });

        return `
            <div class="accordion-item multi-field open" data-pageId="final_assignment">
                <div class="accordion-header-static">
                    <div>
                        <div class="accordion-title">Email naar Emma (${sortedItems.length} velden)</div>
                        <div class="accordion-meta">
                            Laatst aangepast: ${this.formatDate(latestUpdate)}
                        </div>
                    </div>
                </div>
                <div class="accordion-body">
                    <div class="accordion-content">
                        ${fieldsHtml}
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
        document.getElementById('exportData').style.display = 'block';
    }

    createTimelineEvent(event) {
        const config = this.getEventConfig(event.event_type);
        // Parse as UTC and convert to NL timezone
        const timestamp = event.timestamp + (event.timestamp.includes('Z') ? '' : 'Z');
        const time = new Date(timestamp).toLocaleTimeString('nl-NL', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Europe/Amsterdam'
        });

        const pageTitle = this.getPageTitle(event.page_id);

        // Build descriptive label based on event type
        let label = config.label;
        if (event.event_type === 'page_open' || event.event_type === 'open') {
            label = `Pagina geopend: ${pageTitle}`;
        } else if (event.event_type === 'page_close' || event.event_type === 'close') {
            label = `Pagina verlaten: ${pageTitle}`;
        } else if (event.event_type === 'link_click' || event.event_type === 'hyperlink_click') {
            label = `Link geklikt: ${pageTitle}`;
            if (event.event_data) {
                try {
                    const data = JSON.parse(event.event_data);
                    if (data.targetPage) {
                        label += ` → ${this.getPageTitle(data.targetPage)}`;
                    }
                } catch (e) {}
            }
        } else if (event.event_type === 'note_save') {
            label = `Notitie opgeslagen: ${pageTitle}`;
        } else if (event.event_type === 'assignment_save') {
            label = `Eindopdracht opgeslagen`;
        } else {
            // Fallback: generic action
            label = `${config.label}: ${pageTitle}`;
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
                        <div class="timeline-label">${label}</div>
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
            // Parse as UTC and convert to NL date
            const timestamp = event.timestamp + (event.timestamp.includes('Z') ? '' : 'Z');
            const date = new Date(timestamp).toLocaleDateString('en-CA', {
                timeZone: 'Europe/Amsterdam'
            }); // en-CA gives YYYY-MM-DD format

            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(event);
        });

        // Sort events within each day
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) => {
                const aTime = a.timestamp + (a.timestamp.includes('Z') ? '' : 'Z');
                const bTime = b.timestamp + (b.timestamp.includes('Z') ? '' : 'Z');
                return new Date(aTime) - new Date(bTime);
            });
        });

        return grouped;
    }

    exportCompleteDataCSV() {
        const csv = [];

        // Section 1: User Info
        csv.push('=== LEERLING INFORMATIE ===');
        csv.push(`Leerling ID,${this.userId}`);
        csv.push(`Content Items,${this.contentData.length}`);
        csv.push(`Timeline Events,${this.timelineData.length}`);
        csv.push('');

        // Section 2: Content Data
        csv.push('=== CONTENT ===');
        csv.push('Level,Type,Page ID,Page Title,Field Number,Content,Created At,Updated At');

        this.contentData.forEach(item => {
            const pageTitle = this.getPageTitle(item.page_id);
            const content = (item.content || '').replace(/"/g, '""').replace(/\n/g, ' ');
            const row = [
                this.extractLevel(item.page_id),
                item.content_type,
                item.page_id,
                pageTitle,
                item.field_number || '',
                `"${content}"`,
                item.created_at,
                item.updated_at
            ].join(',');
            csv.push(row);
        });

        csv.push('');

        // Section 3: Timeline Data
        csv.push('=== TIJDLIJN ===');
        csv.push('Timestamp,Event Type,Event Label,Page ID,Page Title,Duration,Details');

        this.timelineData.forEach(event => {
            const pageTitle = this.getPageTitle(event.page_id);
            let eventLabel = '';

            // Generate readable event label
            if (event.event_type === 'page_open' || event.event_type === 'open') {
                eventLabel = `Pagina geopend: ${pageTitle}`;
            } else if (event.event_type === 'page_close' || event.event_type === 'close') {
                eventLabel = `Pagina verlaten: ${pageTitle}`;
            } else if (event.event_type === 'link_click' || event.event_type === 'hyperlink_click') {
                eventLabel = `Link geklikt: ${pageTitle}`;
            } else if (event.event_type === 'note_save') {
                eventLabel = `Notitie opgeslagen: ${pageTitle}`;
            } else if (event.event_type === 'assignment_save') {
                eventLabel = `Eindopdracht opgeslagen`;
            } else {
                eventLabel = `${event.event_type}: ${pageTitle}`;
            }

            const details = (event.event_data || '').replace(/"/g, '""');
            const row = [
                event.timestamp,
                event.event_type,
                `"${eventLabel}"`,
                event.page_id,
                `"${pageTitle}"`,
                event.duration || '',
                `"${details}"`
            ].join(',');

            csv.push(row);
        });

        const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leerling_${this.userId}_${new Date().toISOString().split('T')[0]}.csv`;
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
            'note1_level1': 'Notitie 1 - Er komen weinig jongeren naar SneakSpot omdat...',
            'note2_level1': 'Notitie 2 - SneakSpot verkoopt op dit moment...',
            'note3_level1': 'Notitie 3 - SneakSpot moet veranderen om meer jongeren aan te trekken door...',
            'analysis_level1': 'Analyse Level 1',

            // Level 2
            'note1_level2': 'Notitie 1 - Jongeren vinden de volgende sneakerstyle aantrekkelijk...',
            'note2_level2': 'Notitie 2 - Urban Flow past bij SneakSpot omdat...',
            'message_level2': 'Bericht Level 2',

            // Level 3
            'note1_level3': 'Notitie 1 - De activiteiten die Loopz organiseert zijn...',
            'note2_level3': 'Notitie 2 - Sasha raadt de volgende activiteiten aan...',
            'note3_level3': 'Notitie 3 - Het beste evenementenbureau is... omdat...',
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
        // Parse as UTC and convert to NL timezone
        const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
        return date.toLocaleString('nl-NL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Amsterdam'
        });
    }

    formatDateLong(dateString) {
        // dateString can be YYYY-MM-DD format from groupEventsByDate
        // Just parse it directly without adding Z
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

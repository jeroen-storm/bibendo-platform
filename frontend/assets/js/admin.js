// Bibendo Platform - Admin Dashboard JavaScript

class AdminDashboard {
    constructor() {
        this.users = [];
        this.currentUserData = null;
        this.init();
    }
    
    async init() {
        console.log('Admin Dashboard initialized');
        
        // Load initial data
        await this.loadDashboardStats();
        await this.loadUsers();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    async loadDashboardStats() {
        try {
            const users = await this.fetchData('/api/admin/users');
            this.displayDashboardStats(users);
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showError('Failed to load dashboard statistics');
        }
    }
    
    async loadUsers() {
        const loadingElement = document.getElementById('usersLoading');
        const usersTableContainer = document.getElementById('usersTableContainer');
        
        if (loadingElement) loadingElement.style.display = 'block';
        
        try {
            this.users = await this.fetchData('/api/admin/users');
            this.displayUsersTable();
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users data');
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }
    
    async loadUserDetail(userId) {
        const loadingElement = document.getElementById('userDetailLoading');
        
        if (loadingElement) loadingElement.style.display = 'block';
        
        try {
            this.currentUserData = await this.fetchData(`/api/admin/user/${userId}`);
            this.displayUserDetail();
        } catch (error) {
            console.error('Error loading user detail:', error);
            this.showError('Failed to load user details');
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }
    
    async fetchData(endpoint) {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }
    
    async displayDashboardStats(users) {
        // Load all statistics from the new /api/admin/stats endpoint
        try {
            const response = await fetch('/api/admin/stats');
            if (response.ok) {
                const stats = await response.json();

                this.updateStatCard('totalUsers', stats.totalUsers, 'Geregistreerde gebruikers');
                this.updateStatCard('activeUsers', stats.activeUsers, 'Actief in laatste 24u');
                this.updateStatCard('totalContent', stats.totalContent, 'Opgeslagen content (notities, analyses)');
                this.updateStatCard('totalEvents', stats.totalEvents, 'Totaal gebeurtenissen');
                this.updateStatCard('finalAssignments', stats.finalAssignments, 'Ingeleverde eindopdrachten');
            } else {
                // Fallback to calculating from users data
                const totalUsers = users.length;
                const activeUsers = users.filter(u => {
                    const lastActive = new Date(u.last_active);
                    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return lastActive > dayAgo;
                }).length;

                this.updateStatCard('totalUsers', totalUsers, 'Geregistreerde gebruikers');
                this.updateStatCard('activeUsers', activeUsers, 'Actief in laatste 24u');
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }
    
    updateStatCard(cardId, value, description) {
        const card = document.getElementById(cardId);
        if (card) {
            const valueElement = card.querySelector('.card-value');
            const descElement = card.querySelector('.card-description');
            
            if (valueElement) valueElement.textContent = value;
            if (descElement) descElement.textContent = description;
        }
    }
    
    displayUsersTable() {
        const tableContainer = document.getElementById('usersTableContainer');
        if (!tableContainer) return;
        
        if (this.users.length === 0) {
            tableContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>Geen leerlingen gevonden</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>Leerling ID</th>
                        <th>Acties</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.users.map(user => `
                        <tr>
                            <td>
                                <div class="user-id">${user.user_id}</div>
                            </td>
                            <td>
                                <button class="btn-view-user" onclick="adminDashboard.viewUser('${user.user_id}')">
                                    Bekijk Details
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = tableHTML;
    }
    
    displayUserDetail() {
        if (!this.currentUserData) return;
        
        const userData = this.currentUserData;
        const user = userData.user[0];
        
        // Update user header
        this.updateUserHeader(user);
        
        // Update user stats
        this.updateUserStats(userData);
        
        // Display data tables
        this.displayNotesTable(userData.notes);
        this.displayTextLogsTable(userData.textLogs);
        this.displayTimeLogsTable(userData.timeLogs);
        this.displayContentOverview(userData.notes);
    }
    
    updateUserHeader(user) {
        const userIdElement = document.getElementById('userIdDisplay');
        const createdAtElement = document.getElementById('userCreatedAt');
        const lastActiveElement = document.getElementById('userLastActive');
        
        if (userIdElement) userIdElement.textContent = user.user_id;
        if (createdAtElement) createdAtElement.textContent = this.formatDateTime(user.created_at);
        if (lastActiveElement) lastActiveElement.textContent = this.formatDateTime(user.last_active);
    }
    
    updateUserStats(userData) {
        const notesCount = userData.notes.length;
        const textLogsCount = userData.textLogs.length;
        const timeLogsCount = userData.timeLogs.length;
        const totalTimeSpent = userData.timeLogs.reduce((sum, log) => sum + log.time_spent, 0);
        
        // Check final assignment status
        const finalAssignment = userData.notes.find(note => note.page_id === 'final_assignment');
        let finalAssignmentStatus = 'Niet ingeleverd';
        if (finalAssignment && finalAssignment.content) {
            try {
                const content = JSON.parse(finalAssignment.content);
                let filledFields = 0;
                for (let i = 1; i <= 10; i++) {
                    if (content[`field${i}`] && content[`field${i}`].trim()) {
                        filledFields++;
                    }
                }
                if (filledFields >= 10) {
                    finalAssignmentStatus = '✅ Volledig ingeleverd';
                } else if (filledFields >= 7) {
                    finalAssignmentStatus = `🟡 Gedeeltelijk (${filledFields}/10)`;
                } else if (filledFields > 0) {
                    finalAssignmentStatus = `🟠 Begonnen (${filledFields}/10)`;
                }
            } catch (error) {
                console.error('Error parsing final assignment content:', error);
            }
        }
        
        this.updateMetaItem('notesCount', notesCount);
        this.updateMetaItem('textLogsCount', textLogsCount);
        this.updateMetaItem('timeLogsCount', timeLogsCount);
        this.updateMetaItem('totalTimeSpent', this.formatDuration(totalTimeSpent));
        this.updateMetaItem('finalAssignmentStatus', finalAssignmentStatus);
    }
    
    updateMetaItem(itemId, value) {
        const element = document.getElementById(itemId);
        if (element) {
            const valueElement = element.querySelector('.meta-value');
            if (valueElement) valueElement.textContent = value;
        }
    }
    
    displayNotesTable(notes) {
        const container = document.getElementById('notesTableContainer');
        if (!container) return;
        
        if (notes.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Geen notities gevonden</p></div>';
            return;
        }
        
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Page ID</th>
                        <th>Level</th>
                        <th>Content Preview</th>
                        <th>Edit Count</th>
                        <th>Time Spent</th>
                        <th>Updated At</th>
                    </tr>
                </thead>
                <tbody>
                    ${notes.map(note => `
                        <tr>
                            <td><code>${note.page_id}</code></td>
                            <td>${this.formatLevelDisplay(note.level, note.page_id)}</td>
                            <td class="content-preview" title="${this.escapeHtml(this.formatContentPreview(note.content, note.page_id))}">
                                ${this.truncateText(this.formatContentPreview(note.content, note.page_id) || 'Leeg', 50)}
                            </td>
                            <td>${note.edit_count}</td>
                            <td>${this.formatDuration(note.time_spent)}</td>
                            <td class="timestamp">${this.formatDateTime(note.updated_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
    }
    
    displayTextLogsTable(logs) {
        const container = document.getElementById('textLogsTableContainer');
        if (!container) return;
        
        if (logs.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Geen tekst logs gevonden</p></div>';
            return;
        }
        
        // Show only recent logs (last 50)
        const recentLogs = logs.slice(0, 50);
        
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Page ID</th>
                        <th>Action</th>
                        <th>Data</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentLogs.map(log => `
                        <tr>
                            <td><code>${log.page_id}</code></td>
                            <td>
                                <span class="action-badge ${log.action_type}">
                                    ${log.action_type}
                                </span>
                            </td>
                            <td class="content-preview" title="${this.escapeHtml(log.data || '')}">
                                ${this.formatLogData(log.data)}
                            </td>
                            <td class="timestamp">${this.formatDateTime(log.timestamp)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${logs.length > 50 ? `<p style="text-align: center; color: #666; margin-top: 15px;">Toont laatste 50 van ${logs.length} logs</p>` : ''}
        `;
        
        container.innerHTML = tableHTML;
    }
    
    displayTimeLogsTable(logs) {
        const container = document.getElementById('timeLogsTableContainer');
        if (!container) return;
        
        if (logs.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Geen tijd logs gevonden</p></div>';
            return;
        }
        
        const tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Page ID</th>
                        <th>Time Spent</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(log => `
                        <tr>
                            <td><code>${log.page_id}</code></td>
                            <td>${this.formatDuration(log.time_spent)}</td>
                            <td class="timestamp">${this.formatDateTime(log.timestamp)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
    }
    
    displayContentOverview(notes) {
        const container = document.getElementById('contentOverviewContainer');
        if (!container) return;
        
        if (notes.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Geen content gevonden</p></div>';
            return;
        }
        
        // Group notes by level and type
        const groupedNotes = {
            level1: notes.filter(n => n.page_id.includes('level1')),
            level2: notes.filter(n => n.page_id.includes('level2')),
            level3: notes.filter(n => n.page_id.includes('level3')),
            final: notes.filter(n => n.page_id === 'final_assignment')
        };
        
        let contentHTML = '';
        
        // Level 1 - Analysis (prioritize final analysis)
        if (groupedNotes.level1.length > 0) {
            contentHTML += '<div class="content-group"><h4>📊 Level 1 - Analyse</h4>';
            
            // Show final analysis first if it exists
            const finalAnalysis = groupedNotes.level1.find(n => n.page_id === 'analysis_level1');
            if (finalAnalysis) {
                contentHTML += this.renderNoteContent(finalAnalysis, '🎯 Finale Analyse (Hoofdinhoud)');
            }
            
            // Then show individual notes
            groupedNotes.level1.filter(n => n.page_id !== 'analysis_level1').forEach(note => {
                const title = this.getPageTitle(note.page_id);
                contentHTML += this.renderNoteContent(note, title);
            });
            contentHTML += '</div>';
        }
        
        // Level 2 - Message Creation (prioritize final message)
        if (groupedNotes.level2.length > 0) {
            contentHTML += '<div class="content-group"><h4>💬 Level 2 - Bericht</h4>';
            
            // Show final message first if it exists
            const finalMessage = groupedNotes.level2.find(n => n.page_id === 'message_level2');
            if (finalMessage) {
                contentHTML += this.renderNoteContent(finalMessage, '📧 Finale Bericht aan Emma (Hoofdinhoud)');
            }
            
            // Then show individual notes
            groupedNotes.level2.filter(n => n.page_id !== 'message_level2').forEach(note => {
                const title = this.getPageTitle(note.page_id);
                contentHTML += this.renderNoteContent(note, title);
            });
            contentHTML += '</div>';
        }
        
        // Level 3 - Strategic Planning
        if (groupedNotes.level3.length > 0) {
            contentHTML += '<div class="content-group"><h4>🎯 Level 3 - Planning</h4>';
            groupedNotes.level3.forEach(note => {
                const title = this.getPageTitle(note.page_id);
                contentHTML += this.renderNoteContent(note, title);
            });
            contentHTML += '</div>';
        }
        
        // Final Assignment
        if (groupedNotes.final.length > 0) {
            contentHTML += '<div class="content-group"><h4>🎓 Eindopdracht</h4>';
            groupedNotes.final.forEach(note => {
                contentHTML += this.renderFinalAssignmentContent(note);
            });
            contentHTML += '</div>';
        }
        
        container.innerHTML = contentHTML;
    }
    
    getPageTitle(pageId) {
        const titles = {
            'note1_level1': 'Notitie 1 - Waarom weinig jongeren',
            'note2_level1': 'Notitie 2 - Factoren', 
            'note3_level1': 'Notitie 3 - Toekomst',
            'analysis_level1': 'Analyse Samenvatting',
            'note1_level2': 'Notitie 1 - Sneakerstyle jongeren',
            'note2_level2': 'Notitie 2 - Urban Flow & Geschiktheid',
            'message_level2': 'Bericht aan Emma',
            'note1_level3': 'Notitie 1 - Activiteiten',
            'note2_level3': 'Notitie 2 - Sasha\'s activiteiten',
            'note3_level3': 'Notitie 3 - Evenementenbureau',
            'plan_level3': 'Plan Level 3'
        };
        return titles[pageId] || pageId;
    }
    
    renderNoteContent(note, title) {
        const content = note.content || '';
        const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
        const isEmpty = !content.trim();
        
        return `
            <div class="note-item" style="margin-bottom: 15px; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h5 style="margin: 0; color: #00C2CB; font-size: 0.95em;">${title}</h5>
                    <small style="color: #666;">${this.formatDateTime(note.updated_at)}</small>
                </div>
                ${isEmpty ? 
                    '<p style="color: #999; font-style: italic; margin: 0;">Nog niet ingevuld</p>' :
                    `<div style="background: #f8f9fa; padding: 10px; border-radius: 3px; font-size: 0.9em; line-height: 1.4;">
                        ${this.escapeHtml(preview)}
                    </div>`
                }
            </div>
        `;
    }
    
    renderFinalAssignmentContent(note) {
        try {
            const content = JSON.parse(note.content || '{}');
            let fieldsHTML = '';
            
            const fieldLabels = [
                '1. SneakSpot verkoopt op dit moment...',
                '2. Er komen weinig jongeren naar SneakSpot, omdat...',
                '3. Om meer jongeren aan te trekken, moet SneakSpot sneakers verkopen die...',
                '4. Jongeren zijn op zoek naar een sneakerstyle...',
                '5. De sneakerstyle die volgens ons goed past bij SneakSpot is...',
                '6. Deze sneakerstyle past goed bij SneakSpot, omdat...',
                '7. Loopz activiteiten - We hebben de activiteiten van kledingwinkel Loopz bekeken...',
                '8. Sasha activiteiten - Sasha gaf aan dat de volgende activiteiten geschikt zijn...',
                '9. Conclusie - Om meer jongeren naar SneakSpot te laten komen, zouden wij adviseren om...',
                '10. Evenementenbureau - Voor de lancering zouden wij adviseren om...'
            ];

            for (let i = 1; i <= 10; i++) {
                const fieldContent = content[`field${i}`] || '';
                const isEmpty = !fieldContent.trim();
                fieldsHTML += `
                    <div style="margin-bottom: 12px;">
                        <div style="font-weight: 500; color: #555; margin-bottom: 5px; font-size: 0.9em;">
                            ${i}. ${fieldLabels[i-1]}
                        </div>
                        ${isEmpty ?
                            '<div style="color: #999; font-style: italic; font-size: 0.9em;">Nog niet ingevuld</div>' :
                            `<div style="background: #f8f9fa; padding: 8px; border-radius: 3px; font-size: 0.9em; line-height: 1.4;">
                                ${this.escapeHtml(fieldContent)}
                            </div>`
                        }
                    </div>
                `;
            }
            
            return `
                <div class="note-item" style="margin-bottom: 15px; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <h5 style="margin: 0; color: #00C2CB; font-size: 0.95em;">Plan voor Lancering - SneakSpot</h5>
                        <small style="color: #666;">${this.formatDateTime(note.updated_at)}</small>
                    </div>
                    ${fieldsHTML}
                </div>
            `;
        } catch (error) {
            return `
                <div class="note-item" style="margin-bottom: 15px; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 4px;">
                    <h5 style="margin: 0; color: #00C2CB; font-size: 0.95em;">Eindopdracht</h5>
                    <p style="color: #999; font-style: italic;">Fout bij het laden van content</p>
                </div>
            `;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    setupEventListeners() {
        // Export buttons
        const csvExportBtn = document.getElementById('exportCSV');
        const jsonExportBtn = document.getElementById('exportJSON');
        
        if (csvExportBtn) {
            csvExportBtn.addEventListener('click', () => this.exportData('csv'));
        }
        
        if (jsonExportBtn) {
            jsonExportBtn.addEventListener('click', () => this.exportData('json'));
        }
        
        // Back button on user detail page
        const backBtn = document.getElementById('backToOverview');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
        }
    }
    
    async viewUser(userId) {
        // Navigate to user timeline page
        window.location.href = `user-timeline.html?userId=${userId}`;
    }
    
    async exportData(format) {
        try {
            const allUsers = await this.fetchData('/api/admin/users');
            const allUserData = [];
            
            // Fetch detailed data for all users
            for (const user of allUsers) {
                const userData = await this.fetchData(`/api/admin/user/${user.user_id}`);
                allUserData.push(userData);
            }
            
            if (format === 'csv') {
                this.exportToCSV(allUserData);
            } else {
                this.exportToJSON(allUserData);
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Export failed. Please try again.');
        }
    }
    
    exportToCSV(data) {
        // Flatten data for CSV export
        const csvData = [];
        
        data.forEach(userData => {
            const user = userData.user[0];
            userData.notes.forEach(note => {
                csvData.push({
                    user_id: user.user_id,
                    user_created_at: user.created_at,
                    user_last_active: user.last_active,
                    data_type: 'note',
                    page_id: note.page_id,
                    level: note.level,
                    content: note.content,
                    edit_count: note.edit_count,
                    time_spent: note.time_spent,
                    created_at: note.created_at,
                    updated_at: note.updated_at
                });
            });
        });
        
        const csv = this.convertToCSV(csvData);
        this.downloadFile(csv, 'bibendo-data.csv', 'text/csv');
    }
    
    exportToJSON(data) {
        const json = JSON.stringify(data, null, 2);
        this.downloadFile(json, 'bibendo-data.json', 'application/json');
    }
    
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Escape quotes and wrap in quotes if contains comma
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\\n');
        
        return csvContent;
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    // Helper functions for display
    formatLevelDisplay(level, pageId) {
        if (level === 4 && pageId === 'final_assignment') {
            return 'Final Assignment';
        }
        return `Level ${level}`;
    }
    
    formatContentPreview(content, pageId) {
        if (pageId === 'final_assignment' && content) {
            try {
                const parsed = JSON.parse(content);
                const completedFields = Object.values(parsed).filter(v => v && v.trim()).length;
                return `${completedFields}/9 velden ingevuld`;
            } catch (e) {
                return content;
            }
        }
        return content;
    }
    
    // Utility functions
    formatDateTime(dateString) {
        if (!dateString) return 'Onbekend';
        const date = new Date(dateString);
        return date.toLocaleString('nl-NL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0s';
        
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
    
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatLogData(dataString) {
        if (!dataString) return '';
        
        try {
            const data = JSON.parse(dataString);
            
            // Format different types of log data
            if (data.direction) {
                return `Scroll ${data.direction} (${data.toPercentage || 0}%)`;
            } else if (data.href) {
                return `Click: ${data.href}`;
            } else if (data.timeSpent) {
                return `Time: ${this.formatDuration(data.timeSpent)}`;
            } else if (data.editableFields !== undefined) {
                return `Eindopdracht: ${data.editableFields} velden`;
            } else if (data.completedFields !== undefined) {
                return `Eindopdracht verzonden: ${data.completedFields}/8 velden ingevuld`;
            } else {
                return this.truncateText(dataString, 30);
            }
        } catch (error) {
            return this.truncateText(dataString, 30);
        }
    }
    
    showError(message) {
        // Create or update error message
        let errorElement = document.getElementById('errorMessage');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'errorMessage';
            errorElement.className = 'error-message';
            document.body.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});
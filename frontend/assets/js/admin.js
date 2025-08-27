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
    
    displayDashboardStats(users) {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => {
            const lastActive = new Date(u.last_active);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return lastActive > dayAgo;
        }).length;
        
        // Update stats cards
        this.updateStatCard('totalUsers', totalUsers, 'Geregistreerde gebruikers');
        this.updateStatCard('activeUsers', activeUsers, 'Actief in laatste 24u');
        
        // Calculate additional stats if we have detailed data
        this.loadAdditionalStats();
    }
    
    async loadAdditionalStats() {
        try {
            // This would require additional API endpoints for aggregated data
            // For now, we'll show basic stats
            this.updateStatCard('totalNotes', '~', 'Opgeslagen notities');
            this.updateStatCard('totalSessions', '~', 'Totaal sessies');
        } catch (error) {
            console.error('Error loading additional stats:', error);
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
                    <p>Geen gebruikers gevonden</p>
                </div>
            `;
            return;
        }
        
        const tableHTML = `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Aangemaakt</th>
                        <th>Laatst Actief</th>
                        <th>Acties</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.users.map(user => `
                        <tr>
                            <td>
                                <div class="user-id">${user.user_id}</div>
                            </td>
                            <td>${this.formatDateTime(user.created_at)}</td>
                            <td>${this.formatDateTime(user.last_active)}</td>
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
        
        this.updateMetaItem('notesCount', notesCount);
        this.updateMetaItem('textLogsCount', textLogsCount);
        this.updateMetaItem('timeLogsCount', timeLogsCount);
        this.updateMetaItem('totalTimeSpent', this.formatDuration(totalTimeSpent));
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
        // Navigate to user detail page
        window.location.href = `user-detail.html?userId=${userId}`;
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
        return `Level ${level}`;
    }
    
    formatContentPreview(content, pageId) {
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
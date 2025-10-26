// Bibendo Timeline Integration
// Voeg dit toe aan je admin.js of maak een nieuwe file

class BibendoTimelineIntegration {
  constructor() {
    this.timelineContainer = null;
    this.userId = null;
  }

  // Initialiseer de timeline met Bibendo data
  init(userId, containerId = 'timeline-container') {
    this.userId = userId;
    this.timelineContainer = document.getElementById(containerId);
    
    if (!this.timelineContainer) {
      console.error('Timeline container not found');
      return;
    }

    this.loadCombinedTimeline();
  }

  // Laad gecombineerde timeline (app events + game choices)
  async loadCombinedTimeline() {
    try {
      const response = await fetch(`/api/bibendo/timeline/${this.userId}`);
      const timeline = await response.json();
      
      this.renderTimeline(timeline);
    } catch (error) {
      console.error('Error loading timeline:', error);
      this.showError('Kon tijdlijn niet laden');
    }
  }

  // Render de complete timeline
  renderTimeline(events) {
    if (!events || events.length === 0) {
      this.timelineContainer.innerHTML = '<p>Geen events gevonden</p>';
      return;
    }

    const html = events.map(event => this.renderTimelineEvent(event)).join('');
    this.timelineContainer.innerHTML = `
      <div class="timeline-wrapper">
        ${html}
      </div>
    `;
  }

  // Render een individueel timeline event
  renderTimelineEvent(event) {
    // Check of het een Bibendo game event is
    if (event.source === 'bibendo_game') {
      return this.renderGameEvent(event);
    }
    
    // Anders is het een normale app event
    return this.renderAppEvent(event);
  }

  // Render een Bibendo game choice event
  renderGameEvent(event) {
    const timestamp = this.formatTimestamp(event.timestamp);
    const icon = this.getGameIcon(event);
    
    return `
      <div class="timeline-item bibendo-event">
        <div class="timeline-icon game-icon">
          ${icon}
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="badge badge-game">🎮 Game Keuze</span>
            <span class="timestamp">${timestamp}</span>
          </div>
          <div class="timeline-body">
            ${this.renderGameChoiceDetails(event)}
          </div>
        </div>
      </div>
    `;
  }

  // Render game choice details
  renderGameChoiceDetails(event) {
    const eventData = JSON.parse(event.event_data || '{}');
    
    let html = '';
    
    // Toon de vraag als die er is
    if (event.question_text) {
      html += `
        <div class="game-question">
          <strong>Vraag:</strong> ${this.escapeHtml(event.question_text)}
        </div>
      `;
    }
    
    // Toon het antwoord
    if (event.answer_text) {
      html += `
        <div class="game-answer">
          <strong>Antwoord:</strong> 
          <span class="${eventData.is_correct ? 'correct' : 'incorrect'}">
            ${this.escapeHtml(event.answer_text)}
          </span>
        </div>
      `;
    }
    
    // Toon punten als die er zijn
    if (eventData.points) {
      html += `
        <div class="game-points">
          <span class="points-badge">+${eventData.points} punten</span>
        </div>
      `;
    }
    
    return html;
  }

  // Render een normale app event
  renderAppEvent(event) {
    const timestamp = this.formatTimestamp(event.timestamp);
    const eventLabel = this.getEventLabel(event.event_type);
    
    return `
      <div class="timeline-item app-event">
        <div class="timeline-icon">
          📝
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="event-label">${eventLabel}</span>
            <span class="timestamp">${timestamp}</span>
          </div>
          <div class="timeline-body">
            ${this.renderEventDetails(event)}
          </div>
        </div>
      </div>
    `;
  }

  // Render event details voor app events
  renderEventDetails(event) {
    const data = JSON.parse(event.event_data || '{}');
    
    switch(event.event_type) {
      case 'page_open':
        return `Pagina geopend: ${data.page_name || 'Onbekend'}`;
      
      case 'note_saved':
        return `Notitie opgeslagen${data.note_id ? `: ${data.note_id}` : ''}`;
      
      case 'bibendo_sync':
        return `Game data gesynchroniseerd: ${data.choices_count || 0} keuzes`;
      
      default:
        return JSON.stringify(data);
    }
  }

  // Helper functies
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleString('nl-NL', options);
  }

  getGameIcon(event) {
    const data = JSON.parse(event.event_data || '{}');
    if (data.is_correct) return '✅';
    if (data.is_correct === false) return '❌';
    return '🎯';
  }

  getEventLabel(eventType) {
    const labels = {
      'page_open': 'Pagina Geopend',
      'page_close': 'Pagina Gesloten',
      'note_saved': 'Notitie Opgeslagen',
      'text_viewed': 'Tekst Bekeken',
      'bibendo_sync': 'Data Sync',
      'game_choice': 'Game Keuze'
    };
    return labels[eventType] || eventType;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    this.timelineContainer.innerHTML = `
      <div class="alert alert-danger">
        ${message}
      </div>
    `;
  }

  // Trigger manual sync
  async triggerSync() {
    try {
      const response = await fetch('/api/bibendo/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: this.userId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Synchronisatie succesvol!');
        this.loadCombinedTimeline(); // Herlaad timeline
      } else {
        alert('Synchronisatie mislukt');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Synchronisatie fout');
    }
  }
}

// CSS Styles voor Bibendo events
const bibendoStyles = `
<style>
.timeline-item.bibendo-event {
  border-left: 3px solid #6B46C1;
  background: #F3F0FF;
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 5px;
}

.timeline-icon.game-icon {
  font-size: 24px;
  margin-right: 10px;
}

.badge.badge-game {
  background: #6B46C1;
  color: white;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
}

.game-question {
  margin: 10px 0;
  padding: 10px;
  background: white;
  border-radius: 3px;
}

.game-answer {
  margin: 10px 0;
  padding: 10px;
  background: white;
  border-radius: 3px;
}

.game-answer .correct {
  color: #28A745;
  font-weight: bold;
}

.game-answer .incorrect {
  color: #DC3545;
}

.points-badge {
  background: #FFC107;
  color: #333;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 14px;
  font-weight: bold;
}

.sync-button {
  background: #6B46C1;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin: 20px 0;
}

.sync-button:hover {
  background: #553C9A;
}
</style>
`;

// Initialisatie code
document.addEventListener('DOMContentLoaded', () => {
  // Voeg styles toe
  document.head.insertAdjacentHTML('beforeend', bibendoStyles);
  
  // Haal userId uit URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  
  if (userId) {
    // Initialiseer Bibendo timeline integratie
    const bibendoTimeline = new BibendoTimelineIntegration();
    bibendoTimeline.init(userId);
    
    // Voeg sync button toe (optioneel)
    const container = document.getElementById('timeline-container');
    if (container) {
      const syncButton = document.createElement('button');
      syncButton.className = 'sync-button';
      syncButton.textContent = '🔄 Synchroniseer Game Data';
      syncButton.onclick = () => bibendoTimeline.triggerSync();
      container.parentNode.insertBefore(syncButton, container);
    }
  }
});

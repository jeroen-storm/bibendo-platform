# Development Guide - Bibendo Platform

## 🏗️ Architecture Overview

### Frontend Structure
```
frontend/
├── assets/
│   ├── css/main.css          # Global styles, responsive design
│   └── js/notepad.js         # Smart notepad functionality
├── notepad/
│   ├── level1/               # Level 1 pages (4 pages)
│   ├── level2/               # Level 2 pages (4 pages) 
│   └── level3/               # Level 3 pages (3 pages)
├── texts/     [PENDING]      # Text reading pages
├── cbm/       [PENDING]      # CBM assessment tool
└── admin/     [PENDING]      # Admin dashboard
```

### Backend Structure
```
backend/
├── server.js                 # Main Express application
├── package.json              # Dependencies and scripts
├── database/
│   ├── init.sql              # Database schema definition
│   └── bibendo.db            # SQLite database (auto-generated)
├── routes/    [FUTURE]       # Modular route handlers
├── middleware/ [FUTURE]      # Custom middleware
└── utils/     [FUTURE]       # Utility functions
```

## 🛠️ Development Setup

### Prerequisites
```bash
# Node.js version
node --version  # v14+ required

# Package manager
npm --version   # v6+ required
```

### Local Development
```bash
# 1. Install dependencies
cd backend
npm install

# 2. Start development server
npm run dev     # Uses nodemon for auto-restart
# or
npm start       # Regular start

# 3. Access application
open http://localhost:3000
```

### Environment Variables
Create `.env` file in backend directory:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database (optional, defaults to ./database/bibendo.db)
DB_PATH=./database/bibendo.db

# Security (optional, defaults shown)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100           # requests per window
```

## 📝 Code Style Guidelines

### HTML
- Use semantic HTML5 elements
- Maintain consistent indentation (2 spaces)
- Include proper meta tags for responsive design
- Use Dutch language attributes (`lang="nl"`)

### CSS
- Mobile-first responsive design
- Use CSS custom properties for colors
- Avoid complex effects (shadows, gradients)
- Maintain maximum screen estate usage

### JavaScript
- Use modern ES6+ syntax
- Prefer `const` and `let` over `var`
- Use async/await for asynchronous operations
- Include error handling for all API calls
- Add console logging for debugging

### Backend
- Use Express middleware pattern
- Implement proper error handling
- Use prepared statements for SQL queries
- Follow RESTful API conventions

## 🎨 Design System

### Colors
```css
:root {
  --primary-color: #00C2CB;      /* Teal - buttons, accents */
  --background-color: #FFFFFF;   /* White - main background */
  --text-color: #333333;         /* Dark gray - primary text */
  --border-color: #ddd;          /* Light gray - borders */
  --success-color: #00C2CB;      /* Success messages */
  --warning-color: #ff6b35;      /* Warning states */
  --error-color: #e74c3c;        /* Error states */
}
```

### Typography
```css
/* System font stack */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Font sizes */
--font-size-small: 14px;
--font-size-base: 16px;
--font-size-large: 18px;
```

### Spacing
```css
/* Consistent spacing scale */
--spacing-xs: 5px;
--spacing-sm: 10px;
--spacing-md: 20px;
--spacing-lg: 30px;
--spacing-xl: 40px;
```

## 🗃️ Database Schema

### Key Tables

#### notes
```sql
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    content TEXT,
    edit_count INTEGER DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, page_id)
);
```

#### text_logs
```sql
CREATE TABLE text_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT
);
```

### Database Operations
```javascript
// Example: Save note with error handling
db.run(
    'INSERT OR REPLACE INTO notes (user_id, page_id, content) VALUES (?, ?, ?)',
    [userId, pageId, content],
    function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to save note' });
        }
        res.json({ success: true, id: this.lastID });
    }
);
```

## 📱 Frontend Components

### NotepadManager Class
Main class handling notepad functionality:

```javascript
class NotepadManager {
    constructor() {
        this.userId = this.getUserId();
        this.pageId = this.getPageId();
        this.startTime = Date.now();
        this.editCount = 0;
    }
    
    // Key methods:
    // - loadExistingContent()
    // - saveNote()
    // - updateCharCounter()
    // - saveTimeSpent()
}
```

### FinalPageManager Class
Extends NotepadManager for final pages with pre-filling:

```javascript
class FinalPageManager extends NotepadManager {
    constructor() {
        super();
        this.loadAggregatedContent();
    }
    
    // Key methods:
    // - loadAggregatedContent()
    // - displayAggregatedContent()
    // - updateCharCounterForTextarea()
}
```

## 🔧 API Integration

### Standard API Call Pattern
```javascript
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(endpoint, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}
```

### Error Handling
```javascript
// Frontend error display
showStatusMessage(message, type = 'success') {
    const statusMessage = document.querySelector('.status-message');
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
        
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}
```

## 🧪 Testing Strategy

### Manual Testing Checklist

#### Notepad Functionality
- [ ] Note saving works across all levels
- [ ] Character counter updates correctly
- [ ] Pre-filling works on final pages
- [ ] Time tracking functions properly
- [ ] Edit counting is accurate

#### Responsive Design
- [ ] Mobile layout (320px+)
- [ ] Tablet layout (768px+)
- [ ] Desktop layout (1024px+)
- [ ] Button accessibility

#### API Testing
```bash
# Test note saving
curl -X POST http://localhost:3000/api/notes/save \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","pageId":"note1_level1","content":"test"}'

# Test note retrieval
curl http://localhost:3000/api/notes/test/note1_level1

# Test aggregation
curl http://localhost:3000/api/notes/test/level/1
```

### Automated Testing (Future)
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## 🚀 Deployment Guide

### Development Deployment
```bash
# Start development server
npm run dev

# Build for production (future)
npm run build

# Start production server
npm start
```

### Production Deployment (Pending)
Target: TransIP VPS (onderzoek.leeschallenges.nl)

```bash
# Production setup commands (to be implemented)
./deployment/setup-vps.sh
./deployment/install-dependencies.sh  
./deployment/configure-nginx.sh
./deployment/setup-ssl.sh
./deployment/setup-pm2.sh
```

## 🔍 Debugging

### Common Issues

#### CORS Errors
```javascript
// Solution: Ensure server allows origin
app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true
}));
```

#### Database Connection Issues
```bash
# Check if database file exists
ls -la backend/database/bibendo.db

# Check database tables
sqlite3 backend/database/bibendo.db ".tables"

# View table schema
sqlite3 backend/database/bibendo.db ".schema notes"
```

#### Frontend Console Errors
```javascript
// Add debug logging
console.log('Debug info:', { userId, pageId, content });

// Check API responses
console.log('API response:', response);
```

### Debug Mode
```javascript
// Enable detailed logging
const DEBUG = true;

if (DEBUG) {
    console.log('Debug mode enabled');
    // Additional logging...
}
```

## 📊 Performance Considerations

### Database Optimization
- Use indexes on frequently queried columns
- Limit query results with LIMIT clauses
- Use prepared statements for security and performance

### Frontend Optimization
- Minimize DOM manipulations
- Use event delegation for dynamic content
- Debounce frequent operations (character counting)

### API Optimization
- Implement request caching where appropriate
- Use compression middleware
- Minimize response payload sizes

## 🔒 Security Checklist

### Input Validation
- [ ] Content length limits enforced
- [ ] SQL injection prevention via prepared statements
- [ ] XSS prevention through content sanitization
- [ ] Rate limiting implemented

### Data Protection
- [ ] User data isolation
- [ ] Secure timestamp handling
- [ ] Proper error message handling (no data leakage)

### Production Security (Future)
- [ ] HTTPS enforcement
- [ ] Secure headers (Helmet.js)
- [ ] Environment variable protection
- [ ] Database backup strategy

## 📈 Monitoring & Analytics

### Current Tracking
- Time spent per page
- Edit counts per note
- User activity timestamps
- Content persistence

### Future Analytics
- User flow analysis
- Completion rates
- Performance metrics
- Error tracking

## 🤝 Contributing

### Git Workflow
```bash
# Feature development
git checkout -b feature/component-name
git commit -m "feat: add component functionality"
git push origin feature/component-name

# Bug fixes
git checkout -b fix/issue-description
git commit -m "fix: resolve issue with component"
git push origin fix/issue-description
```

### Code Review Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Address review feedback
6. Merge to main branch

## 🗺️ Roadmap

### Phase 1: ✅ Smart Notepad (Completed)
- [x] Database schema and API
- [x] Notepad pages (all 3 levels)
- [x] Pre-filling functionality
- [x] Eindopdracht snapshot system
- [x] Responsive design

### Phase 2: ✅ Text Pages (Completed)
- [x] Modern text content structure (Instagram, WhatsApp, News, Events)
- [x] Scroll tracking implementation
- [x] Time tracking on text pages
- [x] Hyperlink click tracking

### Phase 3: ⏳ CBM Tool (Pending)
- [ ] Cloze-test implementation
- [ ] 2-minute timer functionality
- [ ] Multiple choice interface
- [ ] Results tracking

### Phase 4: ✅ Admin Dashboard (Completed)
- [x] User overview interface
- [x] Data visualization
- [x] Export functionality
- [x] Analytics reporting

### Phase 5: ✅ Production Deployment (Completed)
- [x] VPS configuration
- [x] SSL certificate setup
- [x] PM2 process management
- [x] Nginx reverse proxy
- [x] Monitoring and logging
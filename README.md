# Bibendo Educational Platform - Game Editor Extension

A comprehensive web-based educational extension (add-on) for the **Bibendo Game Editor** (NBD Biblion), providing advanced educational tools including smart notepad system, text tracking, CBM assessment tools, and admin dashboard. Designed for seamless integration via Flutter webview within educational games.

**Part of the LeesEvolutie Project** - Advanced reading comprehension tools for educational gaming.

## 🔗 Related Projects
- **Bibendo Game Editor**: [www.bibendo.nl](https://www.bibendo.nl) - Main game creation platform by NBD Biblion
- **Bibendo Documentation**: [bibendo-docs-dev.readme.io](https://bibendo-docs-dev.readme.io/) - Official Bibendo developer documentation
- **LeesEvolutie Project**: [www.leesevolutie.nl](https://www.leesevolutie.nl) - Reading evolution educational initiative

## 🎮 Integration Features

This extension adds advanced educational assessment capabilities to the **Bibendo Game Editor**, enabling game creators to incorporate sophisticated learning analytics and interactive tools within their educational games.

### ✅ Extension Components

#### Smart Notepad System
- **3 Levels** with 12 total pages (9 note pages + 3 final pages)
- **Note Pages**: Simple textarea with 2000 character limit
- **Final Pages**: Pre-filled with previous notes for analysis/message/plan creation
- **User Tracking**: Time spent, edit counts, content persistence
- **Responsive Design**: Clean minimal UI with #00C2CB primary color

#### Text Pages System
- **9 Text Pages** across 3 levels with diverse content types
- **Comprehensive Tracking**: Scroll position, click events, time spent, section visibility
- **Content Types**: Email threads, news articles, social media, forum discussions
- **Real-time Analytics**: IntersectionObserver for section tracking

#### CBM Assessment Tool
- **4 Complete CBM Texts**: 1 practice text (9 exercises) + 3 main texts (72, 98, 55 exercises)
- **234 Total Cloze-Test Exercises** about sneaker trends and youth culture
- **2-Minute Timed Assessment** with automatic timer stop on completion
- **Inline Options Interface** with smooth fade animations and left-aligned text
- **Individual JSON Files** for optimized loading per text selection
- **Auto-save Functionality** every 10 seconds with visual feedback
- **WCPM Calculation** (Words Correct Per Minute) and accuracy tracking
- **Completion Popup** with simple message (no close button needed)
- **Text Selection Page** with clear categorization of practice vs main texts

#### Admin Dashboard
- **User Management**: Complete overview of all users and activity
- **Detailed Analytics**: Individual user data with all interactions
- **Data Export**: CSV and JSON export for all user data
- **CBM Results Visualization**: Performance tracking with color-coded badges
- **Real-time Statistics**: Active users, completion rates, performance metrics

#### Backend Infrastructure
- **Express.js API** with optimized SQLite database (WAL mode for concurrent access)
- **RESTful Endpoints** for notes, logs, CBM, and admin functions
- **Classroom-Ready Scaling**: Optimized for 30-50 concurrent users
- **Smart Rate Limiting**: 500 requests/15min with static file exemptions
- **Security Features**: Input sanitization, XSS prevention, CORS protection
- **Performance Optimization**: Database caching, memory temp store, efficient queries
- **Comprehensive Logging**: All user interactions tracked and stored

#### SneakSpot Game Integration (NEW)
- **Game Interface**: Responsive iframe integration with 3:4 aspect ratio (525px-675px width, 700px-900px height)
- **Challenge System**: Multi-level game progression with visual feedback
- **Level Selection**: Professional game interface with progress tracking
- **Responsive Design**: Fluid scaling between minimum and maximum dimensions while maintaining aspect ratio

#### SneakSpot Assessment Test
- **Three-question analysis interface**: Comprehensive evaluation of SneakSpot case study
- **AI-powered evaluation**: Automated assessment using official rubric criteria
- **Official scoring system**: Goud/Zilver/Brons (3/2/1 points) with final grade calculation
- **Individual question feedback**: Detailed scores per question with constructive feedback
- **Professional results page**: Clean presentation of evaluation results with next steps

## 📁 Project Structure

```
bibendo-platform/
├── backend/
│   ├── server.js              # Main Express server with all endpoints
│   ├── package.json           # Dependencies
│   ├── database/
│   │   ├── init.sql          # Complete database schema (6 tables)
│   │   └── bibendo.db        # SQLite database (auto-created)
│   ├── cbm/                  # CBM content files
│   └── server.log           # Server logs
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── main.css      # Main stylesheet
│   │   │   ├── cbm.css       # CBM-specific styles  
│   │   │   ├── admin.css     # Admin dashboard styles
│   │   │   └── textPages.css # Text page styles
│   │   ├── data/
│   │   │   ├── cbm-text-0.json # Practice text (9 exercises)
│   │   │   ├── cbm-text-1.json # Main text 1 (72 exercises)
│   │   │   ├── cbm-text-2.json # Main text 2 (98 exercises)
│   │   │   ├── cbm-text-3.json # Main text 3 (55 exercises)
│   │   │   └── cbm-texts.json  # CBM text metadata
│   │   └── js/
│   │       ├── notepad.js    # Notepad functionality
│   │       ├── textTracker.js # Text page tracking
│   │       ├── cbm.js        # CBM assessment logic (optimized)
│   │       └── admin.js      # Admin dashboard logic
│   ├── notepad/
│   │   ├── level1/           # Level 1 notepad pages (4 pages)
│   │   ├── level2/           # Level 2 notepad pages (4 pages)
│   │   └── level3/           # Level 3 notepad pages (4 pages)
│   ├── texts/
│   │   ├── level1/           # Level 1 text pages (7 pages)
│   │   ├── level2/           # Level 2 text pages (2 pages)
│   │   └── level3/           # Level 3 text pages (2 pages)
│   ├── cbm/
│   │   ├── selection.html    # CBM text selection page
│   │   └── index.html        # CBM assessment interface
│   ├── sneakspot/           # SneakSpot game integration (NEW)
│   │   ├── challenges.html   # Game challenges overview
│   │   ├── levels.html       # Level selection interface
│   │   ├── game.html         # Game iframe with responsive 3:4 aspect ratio
│   │   ├── styles.css        # SneakSpot styling
│   │   └── img/              # Game assets and images
│   ├── test/
│   │   ├── three-questions.html  # SneakSpot assessment interface
│   │   └── result.html           # Evaluation results page
│   └── admin/
│       ├── dashboard.html    # Main admin dashboard
│       └── user-detail.html  # Individual user analytics
├── docs/
│   └── assessment/
│       ├── sneakspot-beoordelingsrubric.md  # Official rubric
│       └── sneakspot-test-guide.md          # User guide
└── deploy-to-vps.sh        # VPS deployment script
```

## 🛠️ Technical Stack

**Extension Architecture:**
- **Integration**: Flutter WebView compatibility for seamless game integration
- **Backend**: Node.js, Express.js, SQLite (optimized for educational environments)
- **Frontend**: Vanilla HTML/CSS/JavaScript (framework-free for maximum compatibility)
- **Security**: Helmet, CORS, Rate Limiting, Input Sanitization
- **Design**: Responsive, minimal UI, iframe/webview-optimized
- **Analytics**: Real-time user tracking and comprehensive learning analytics
- **Deployment**: VPS-ready with classroom scalability (30-50 concurrent users)

## 🎮 Game Editor Integration

### Flutter WebView Integration
This extension is designed to be embedded within educational games created in the **Bibendo Game Editor**. The platform provides:

- **Seamless WebView Integration**: All components optimized for Flutter WebView rendering
- **Cross-Platform Compatibility**: Works across iOS, Android, and web platforms
- **Game Context Preservation**: User IDs and session data maintained between game and extension
- **Responsive Design**: Adapts to different screen sizes and orientations within games

### Integration URLs for Game Developers
```javascript
// Smart Notepad System
const notepadUrl = `https://onderzoek.leeschallenges.nl/notepad/level1/note1.html?userId=${userId}`;

// Text Analysis Pages  
const textUrl = `https://onderzoek.leeschallenges.nl/texts/level1/tekst1.html?userId=${userId}`;

// CBM Assessment Tool
const cbmUrl = `https://onderzoek.leeschallenges.nl/cbm/selection.html?userId=${userId}`;

// SneakSpot Game Integration
const sneakspotGameUrl = `https://onderzoek.leeschallenges.nl/sneakspot/game.html`;
const sneakspotChallengesUrl = `https://onderzoek.leeschallenges.nl/sneakspot/challenges.html`;
const sneakspotLevelsUrl = `https://onderzoek.leeschallenges.nl/sneakspot/levels.html`;

// SneakSpot Assessment Test
const sneakspotTestUrl = `https://onderzoek.leeschallenges.nl/test/three-questions.html`;

// Admin Dashboard (for educators)
const adminUrl = `https://onderzoek.leeschallenges.nl/admin/dashboard.html`;
```

### Educational Game Use Cases
- **Reading Comprehension Games**: Embed CBM assessments within story-based adventures
- **Note-Taking Adventures**: Use smart notepad system for puzzle-solving and reflection
- **Analytics Integration**: Real-time learning analytics feed back into game progression
- **Classroom Management**: Teachers can monitor student progress across all game sessions

## 📊 Database Schema

### Tables
- `users`: User management and activity tracking
- `notes`: Notepad content with metadata (edit counts, time spent)
- `text_logs`: Text interaction tracking (scroll, click, time)
- `time_logs`: Page session time logging
- `cbm_results`: CBM assessment results and performance data
- `sessions`: Session management and tracking

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bibendo-platform
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   ```
   http://localhost:3000
   ```

### Development Mode
```bash
npm run dev  # Uses nodemon for auto-restart
```

## 📝 System Components

### Smart Notepad System

#### URL Structure
```
http://localhost:3000/notepad/level{1-3}/{page}.html?userId={userId}
```

#### Page Types

**Level 1 (Basic Analysis)**
- `note1_level1.html` - Initial thoughts
- `note2_level1.html` - Information gathering  
- `note3_level1.html` - First reactions
- `analysis_level1.html` - Final analysis (pre-filled)

**Level 2 (Message Creation)**
- `note1_level2.html` - Complex analysis
- `note2_level2.html` - Solution exploration
- `note3_level2.html` - Pros/cons evaluation
- `message_level2.html` - Message formulation (pre-filled)

**Level 3 (Strategic Planning)**
- `note1_level3.html` - Strategic vision
- `note2_level3.html` - Success factors
- `plan_level3.html` - Action planning (pre-filled)

### Text Pages System

#### URL Structure
```
http://localhost:3000/texts/level{1-3}/{page}.html?userId={userId}
```

#### Content Types
- **Email Threads**: Multi-participant email conversations
- **News Articles**: Current events and analysis
- **Social Media**: Posts, comments, discussions
- **Forum Discussions**: Technical and educational content

#### Tracking Features
- **Scroll Tracking**: Position, direction, speed
- **Click Tracking**: All interactive elements
- **Time Tracking**: Total time and active reading time
- **Section Visibility**: Which parts were actually viewed

### CBM Assessment Tool

#### URL Structure
```
http://localhost:3000/cbm/index.html?userId={userId}&textId={textId}
```

#### Features
- **2-Minute Timer**: Precise countdown with visual progress
- **Inline Cloze-Test**: Yellow highlighted words with dropdown options
- **Smooth Animations**: Words fade in/out with user selections
- **Auto-completion**: Popup appears when all questions answered
- **Performance Metrics**: WCPM, accuracy, completion rate
- **Auto-save**: Progress saved every 10 seconds

#### Available Texts
- **Text 2**: "Nieuwe Sneakerstyle" (12 questions)
- **Text 3**: "Product Launch - SneakLab" (14 questions)

### Admin Dashboard

#### URL Structure
```
http://localhost:3000/admin/dashboard.html
```

#### Features
- **User Overview**: All registered users with activity status
- **Individual Analytics**: Detailed view per user
- **Performance Metrics**: Completion rates, time spent, scores
- **Data Export**: CSV and JSON export for analysis
- **Real-time Updates**: Live statistics and user activity
- **CBM Results**: Color-coded performance indicators

## 🔧 API Documentation

### Notes Endpoints

#### Save Note
```http
POST /api/notes/save
Content-Type: application/json

{
  "userId": "string",
  "pageId": "string", 
  "content": "string",
  "editCount": number,
  "timeSpent": number
}
```

#### Get Note
```http
GET /api/notes/{userId}/{pageId}
```

#### Get Notes by Level
```http
GET /api/notes/{userId}/level/{level}
```

### Text Tracking Endpoints

#### Log Time Spent
```http
POST /api/logs/time
Content-Type: application/json

{
  "userId": "string",
  "pageId": "string",
  "timeSpent": number,
  "timestamp": "string"
}
```

#### Log Text Interactions
```http
POST /api/logs/text
Content-Type: application/json

{
  "userId": "string",
  "pageId": "string", 
  "actionType": "string",
  "data": object
}
```

### CBM Endpoints

#### Save CBM Result
```http
POST /api/cbm/save-result
Content-Type: application/json

{
  "userId": "string",
  "textId": number,
  "textTitle": "string",
  "totalQuestions": number,
  "totalAnswered": number,
  "correctAnswers": number,
  "accuracy": number,
  "timeSpent": number,
  "wcpm": number,
  "answers": "string"
}
```

#### Get CBM Results
```http
GET /api/cbm/results/{userId}
```

#### Get CBM Statistics
```http
GET /api/cbm/stats/{userId}
```

### Admin Endpoints

#### Get All Users
```http
GET /api/admin/users
```

#### Get User Data
```http
GET /api/admin/user/{userId}
```

### Health Check
```http
GET /api/health
```

## 🎨 Design Guidelines

- **Background**: White (#FFFFFF)
- **Primary Color**: #00C2CB (buttons, accents)
- **Typography**: System fonts, clean and minimal
- **Layout**: Maximum screen estate usage, minimal margins
- **Responsive**: Mobile-first approach
- **No Effects**: No shadows, gradients, or complex styling
- **CBM Styling**: Yellow highlights (#ffeb99) for cloze-test words
- **Admin Colors**: Color-coded performance badges (green/yellow/red)

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Sanitization**: Content length limits and XSS prevention
- **SQL Injection Prevention**: Prepared statements throughout
- **CORS Configuration**: Controlled cross-origin access
- **Content Security**: Helmet middleware (disabled in development)
- **Data Privacy**: User data anonymization options

## 📱 Integration Notes

- **Webview Ready**: Optimized for iframe display in Flutter app
- **User ID Handling**: Passed via URL parameter (`?userId=xxx`)
- **Responsive Design**: Works on all screen sizes and orientations
- **Minimal Dependencies**: Vanilla JavaScript, no external frameworks
- **Performance Optimized**: Efficient tracking with throttled events

## 🧪 Testing

### Manual Testing URLs

#### Smart Notepad
- Level 1: `http://localhost:3000/notepad/level1/analysis_level1.html?userId=test123`
- Level 2: `http://localhost:3000/notepad/level2/message_level2.html?userId=test123`
- Level 3: `http://localhost:3000/notepad/level3/plan_level3.html?userId=test123`

#### Text Pages
- Level 1: `http://localhost:3000/texts/level1/oefentekst_level1.html?userId=test123`
- Level 2: `http://localhost:3000/texts/level2/oefentekst_level2.html?userId=test123`
- Level 3: `http://localhost:3000/texts/level3/oefentekst_level3.html?userId=test123`

#### CBM Assessment
- Text 2: `http://localhost:3000/cbm/index.html?userId=test123&textId=2`
- Text 3: `http://localhost:3000/cbm/index.html?userId=test123&textId=3`

#### Admin Dashboard
- Overview: `http://localhost:3000/admin/dashboard.html`
- User Detail: `http://localhost:3000/admin/user-detail.html?userId=test123`

### Test Scenarios
1. **Notepad Flow**: Create notes in sequence → verify pre-filling
2. **Text Tracking**: Scroll through texts → check admin analytics
3. **CBM Assessment**: Complete assessment → verify results in admin
4. **Data Export**: Export user data → verify CSV/JSON format
5. **Responsive Design**: Test on different screen sizes

## 🚀 Deployment

### Target Environment
- **VPS**: TransIP Ubuntu 24.04 LTS
- **Domain**: onderzoek.leeschallenges.nl
- **SSL**: Let's Encrypt
- **Process Management**: PM2
- **Web Server**: Nginx (reverse proxy)
- **Location**: Amsterdam datacenter

### Deployment Scripts
```bash
./deploy-to-vps.sh             # VPS deployment script
```

## 📋 Development Status

### Completed ✅
- [x] Project structure and setup
- [x] SQLite database with complete schema (6 tables)
- [x] Express.js API with all endpoints (notes, texts, CBM, admin)
- [x] Smart notepad system (12 pages across 3 levels)
- [x] Text pages system (9 pages with comprehensive tracking)
- [x] CBM assessment tool with 2-minute timer and inline interface
- [x] Admin dashboard with user management and analytics
- [x] Pre-filled textareas on final pages
- [x] Responsive CSS design across all components
- [x] Security middleware and rate limiting
- [x] Comprehensive user tracking and logging
- [x] Data export functionality (CSV/JSON)
- [x] Real-time performance analytics
- [x] SneakSpot Assessment Test with AI evaluation
- [x] Official rubric-based scoring system (Goud/Zilver/Brons)
- [x] VPS deployment on onderzoek.leeschallenges.nl
- [x] SSL certificate and production configuration
- [x] Complete API and user documentation

## 🚀 Production Deployment

### VPS Configuration (TransIP)
The extension is configured for deployment on **TransIP VPS** infrastructure:

- **Domain**: `onderzoek.leeschallenges.nl`
- **Server**: Ubuntu 24.04 LTS (Amsterdam datacenter)
- **Stack**: Node.js + PM2 + Nginx + Let's Encrypt SSL
- **Database**: SQLite with WAL mode for concurrent access
- **Capacity**: Optimized for 30-50 concurrent classroom users

### Deployment Process
1. **VPS Setup**: Ubuntu server configuration with security hardening
2. **Domain Configuration**: DNS setup for `onderzoek.leeschallenges.nl`  
3. **SSL Certificates**: Automated Let's Encrypt certificate generation
4. **Application Deployment**: PM2 process management with auto-restart
5. **Database Optimization**: WAL mode with automated backups
6. **Monitoring**: Server logs and performance tracking

### Game Editor Integration
Once deployed, the extension URLs can be embedded in **Bibendo Game Editor** projects. For detailed integration instructions, see the [official Bibendo documentation](https://bibendo-docs-dev.readme.io/):

```javascript
// Production URLs for game integration
const baseUrl = 'https://onderzoek.leeschallenges.nl';

// Embed in Flutter WebView within educational games
const extensionUrls = {
  notepad: `${baseUrl}/notepad/level1/note1.html?userId=${gameUserId}`,
  texts: `${baseUrl}/texts/level1/tekst1.html?userId=${gameUserId}`,
  cbm: `${baseUrl}/cbm/selection.html?userId=${gameUserId}`,
  admin: `${baseUrl}/admin/dashboard.html`
};
```

### LeesEvolutie Project Integration
This extension provides the advanced reading assessment tools needed for the **LeesEvolutie** educational initiative, enabling:

- **Game-Based CBM Assessments**: Seamless reading fluency testing within educational games
- **Interactive Note-Taking**: Context-aware notepad system for learning reflection
- **Real-Time Analytics**: Teacher dashboard for monitoring student progress across all game sessions
- **Cross-Platform Compatibility**: Consistent experience across iOS, Android, and web platforms

## 📚 Developer Resources

### Bibendo Integration Documentation
For comprehensive integration guides, API references, and best practices for embedding this extension in your educational games, visit:

**[Official Bibendo Documentation](https://bibendo-docs-dev.readme.io/)**

This documentation covers:
- **WebView Integration**: Flutter WebView setup for educational games
- **Game Engine APIs**: Communication between games and extensions  
- **User Management**: Handling user sessions across game and extension
- **Data Analytics**: Integrating learning analytics into game progression
- **Platform Guidelines**: UI/UX best practices for educational content

### Extension-Specific APIs
This platform provides RESTful APIs for seamless integration with the Bibendo Game Editor ecosystem. All endpoints are documented in the API sections below.

## 🔧 Development Notes

### Adding New CBM Texts
1. Add text data to `cbm.js` in the `cbmTexts` object
2. Include cloze-test with choices and correct answers
3. Update admin dashboard CBM text selection if needed

### Database Maintenance
- Database auto-initializes on first run
- Use SQLite browser for manual inspection
- Backup recommended before production deployment

### Performance Considerations
- Text tracking uses throttled scroll events (100ms)
- Auto-save intervals optimized (10s for CBM, on-demand for notes)
- Admin dashboard limits large result sets (50 latest logs)

## 👥 Contributing

This project is part of the Bibendo educational platform development. Contact the development team for contribution guidelines and coding standards.

## 📄 License

Private project - All rights reserved.
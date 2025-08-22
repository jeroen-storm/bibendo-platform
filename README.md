# Bibendo Educational Platform - Game Editor Extension

A comprehensive web-based educational extension (add-on) for the **Bibendo Game Editor** (NBD Biblion), providing advanced educational tools including smart notepad system, text tracking, SneakSpot game integration, and admin dashboard. Designed for seamless integration via Flutter webview within educational games.

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
- **12 Modern Text Pages** across 3 levels with diverse, engaging content types
- **Comprehensive Tracking**: Scroll position, click events, time spent, section visibility
- **Diverse Styling**: Email layouts, Instagram posts, WhatsApp chats, news sites, event plans
- **Real-time Analytics**: IntersectionObserver for section tracking
- **Mobile-First Design**: Fully responsive across all devices

#### Modern Content Types (Updated 2024)
**Level 1 (7 Pages):**
- **Email Layout**: Professional email from Emma (SneakSpot owner) seeking advice
- **Instagram Posts**: Customer reviews in authentic Instagram post format
- **News Website**: Professional news site with ANP branding and multiple articles
- **Product Showcase**: Assortment overview with product cards

**Level 2 (2 Pages):**
- **WhatsApp Chat**: Multi-participant conversation with profile pictures
- **Product Cards**: Color-coded sneaker showcases (Urban Flow, FlexCore, MotionStep)

**Level 3 (3 Pages):**
- **Email Communication**: Event feedback in professional email format
- **Event Plan**: Colorful, modern event showcase with gradient backgrounds
- **Launch Plan**: Clean, document-style business plan layout

#### Admin Dashboard
- **User Management**: Complete overview of all users and activity
- **Detailed Analytics**: Individual user data with all interactions
- **Data Export**: CSV and JSON export for all user data
- **Real-time Statistics**: Active users, completion rates, performance metrics

#### Backend Infrastructure
- **Express.js API** with optimized SQLite database (WAL mode for concurrent access)
- **RESTful Endpoints** for notes, logs, CBM, and admin functions
- **Classroom-Ready Scaling**: Optimized for 30-50 concurrent users
- **Smart Rate Limiting**: 500 requests/15min with static file exemptions
- **Security Features**: Input sanitization, XSS prevention, CORS protection
- **Performance Optimization**: Database caching, memory temp store, efficient queries
- **Comprehensive Logging**: All user interactions tracked and stored

#### SneakSpot Game Integration
- **Interactive Storyline**: "Help Emma save her sneaker store" in Dutch
- **Game Interface**: Responsive iframe integration with 3:4 aspect ratio (525px-675px width, 700px-900px height)
- **Challenge System**: Multi-level game progression with visual feedback
- **Level Selection**: Professional game interface with progress tracking
- **Responsive Design**: Fluid scaling between minimum and maximum dimensions while maintaining aspect ratio

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
│   │   │   ├── admin.css     # Admin dashboard styles
│   │   │   └── textPages.css # Text page styles
│   │   ├── js/
│   │   │   ├── notepad.js    # Notepad functionality
│   │   │   ├── textTracker.js # Text page tracking
│   │   │   ├── userUtils.js  # User ID persistence
│   │   │   └── admin.js      # Admin dashboard logic
│   │   └── images/           # All images (profile pics, product shots, logos)
│   │       ├── anp-logo.jpg  # ANP news logo
│   │       ├── karim-profile.jpg # Profile pictures for chat interfaces
│   │       ├── samira-profile.jpg
│   │       ├── jay-profile.jpg
│   │       ├── emma-profile.jpg
│   │       ├── sasha-profile.jpg
│   │       ├── loopz-event.jpg # Event imagery
│   │       ├── sneaker-trends.avif # Product imagery
│   │       └── news-item-*.jpg # News article images
│   ├── notepad/
│   │   ├── level1/           # Level 1 notepad pages (4 pages)
│   │   ├── level2/           # Level 2 notepad pages (4 pages)
│   │   └── level3/           # Level 3 notepad pages (4 pages)
│   ├── texts/
│   │   ├── level1/           # Level 1: Email, Instagram, News, Product pages
│   │   │   ├── oefentekst_level1.html        # Emma's email (enhanced)
│   │   │   ├── klantrecensies_level1.html    # Instagram customer reviews
│   │   │   ├── nieuwsbericht_overzicht_level1.html # News overview
│   │   │   ├── nieuwsbericht_[1-3]_level1.html     # Individual articles
│   │   │   └── assortiment_overzicht_level1.html   # Product showcase
│   │   ├── level2/           # Level 2: WhatsApp chat, Product cards
│   │   │   ├── doelgroep_level2.html         # WhatsApp conversation
│   │   │   └── sneakers_jongeren_level2.html # Product showcase
│   │   └── level3/           # Level 3: Email feedback, Event plans
│   │       ├── ervaringen_level3.html        # Email feedback
│   │       ├── evenement_level3.html         # Colorful event showcase
│   │       └── lancering_level3.html         # Business launch plan
│   ├── sneakspot/           # SneakSpot game integration
│   │   ├── challenges.html   # Game challenges overview
│   │   ├── levels.html       # Level selection interface
│   │   ├── game.html         # Game iframe with responsive 3:4 aspect ratio
│   │   ├── styles.css        # SneakSpot styling
│   │   └── img/              # Game assets and images
│   └── admin/
│       ├── dashboard.html    # Main admin dashboard
│       └── user-detail.html  # Individual user analytics
├── docs/
│   ├── assessment/
│   │   ├── sneakspot-beoordelingsrubric.md  # Official rubric
│   │   └── sneakspot-test-guide.md          # User guide
│   └── NGINX-TROUBLESHOOTING.md             # Nginx troubleshooting guide
├── nginx/
│   └── onderzoek.leeschallenges.nl          # Production nginx configuration
└── deploy-to-vps.sh                         # VPS deployment script
```

## 🛠️ Technical Stack

**Extension Architecture:**
- **Integration**: Flutter WebView compatibility for seamless game integration
- **Backend**: Node.js, Express.js, SQLite (optimized for educational environments)
- **Frontend**: Vanilla HTML/CSS/JavaScript (framework-free for maximum compatibility)
- **Security**: Helmet, CORS, Rate Limiting, Input Sanitization
- **Design**: Responsive, modern UI with diverse social media and business layouts
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
const textUrl = `https://onderzoek.leeschallenges.nl/texts/level1/oefentekst_level1.html?userId=${userId}`;

// SneakSpot Game Integration
const sneakspotGameUrl = `https://onderzoek.leeschallenges.nl/sneakspot/game.html`;
const sneakspotChallengesUrl = `https://onderzoek.leeschallenges.nl/sneakspot/challenges.html`;
const sneakspotLevelsUrl = `https://onderzoek.leeschallenges.nl/sneakspot/levels.html`;

// Admin Dashboard (for educators)
const adminUrl = `https://onderzoek.leeschallenges.nl/admin/dashboard.html`;
```

### Educational Game Use Cases
- **Reading Comprehension Games**: Embed modern text formats within story-based adventures
- **Note-Taking Adventures**: Use smart notepad system for puzzle-solving and reflection
- **Analytics Integration**: Real-time learning analytics feed back into game progression
- **Classroom Management**: Teachers can monitor student progress across all game sessions

## 🎨 Modern Design System

### Design Principles
- **Authentic Social Media Layouts**: Instagram posts, WhatsApp chats, email clients
- **Professional Business Documents**: News sites, event plans, launch documents
- **Mobile-First Responsive**: Perfect display across all device sizes
- **Content Preservation**: All educational content maintained during design transformations
- **Accessibility**: High contrast, readable fonts, clear navigation

### Color Schemes & Styling
- **Instagram**: Authentic Instagram UI with profile pictures and engagement elements
- **WhatsApp**: Color-coded messages per participant with profile pictures
- **News Site**: Professional ANP branding with article navigation
- **Event Plans**: Gradient backgrounds with color-coded activity sections
- **Business Documents**: Clean, minimal styling with professional typography

### Typography & Layout
- **System Fonts**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- **Serif Headers**: Georgia for formal document titles
- **Responsive Grid**: CSS Grid and Flexbox for optimal layouts
- **Image Integration**: Profile pictures, product shots, event imagery
- **Navigation**: Back-to-overview links, breadcrumbs, consistent UX

## 📊 Database Schema

### Tables
- `users`: User management and activity tracking
- `notes`: Notepad content with metadata (edit counts, time spent)
- `text_logs`: Text interaction tracking (scroll, click, time)
- `time_logs`: Page session time logging
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

### Enhanced Text Pages System

#### URL Structure
```
http://localhost:3000/texts/level{1-3}/{page}.html?userId=${userId}
```

#### Level 1 Content (7 Pages)
**Professional Email Layout**
- `oefentekst_level1.html` - Emma's request for help (enhanced readability)

**Instagram Social Media**
- `klantrecensies_level1.html` - Customer reviews as Instagram posts with profiles

**News Website Experience**
- `nieuwsbericht_overzicht_level1.html` - News overview with ANP branding
- `nieuwsbericht_1_level1.html` - "SneakSpot: waar het ooit begon"
- `nieuwsbericht_2_level1.html` - "Een sneakerwinkel voor jongeren: of toch niet?"
- `nieuwsbericht_3_level1.html` - "Online shoppen is helemaal in!"

**Product Showcase**
- `assortiment_overzicht_level1.html` - Product overview with visual cards

#### Level 2 Content (2 Pages)
**WhatsApp Chat Interface**
- `doelgroep_level2.html` - Multi-participant conversation with Karim, Samira, and Jay

**Product Showcase**
- `sneakers_jongeren_level2.html` - Color-coded sneaker showcase (Urban Flow, FlexCore, MotionStep)

#### Level 3 Content (3 Pages)
**Professional Email**
- `ervaringen_level3.html` - Sasha's event feedback email

**Event Showcase**
- `evenement_level3.html` - Colorful Loopz event plan with gradient activity sections

**Business Launch Plan**
- `lancering_level3.html` - Clean, fullscreen business plan document

#### Tracking Features
- **Scroll Tracking**: Position, direction, speed
- **Click Tracking**: All interactive elements
- **Time Tracking**: Total time and active reading time
- **Section Visibility**: Which parts were actually viewed

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
- **Enhanced Analytics**: Track engagement with modern content types

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

## 🔒 Security Features

- **Rate Limiting**: 500 requests per 15 minutes per IP
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

#### Enhanced Text Pages
- Level 1 Email: `http://localhost:3000/texts/level1/oefentekst_level1.html?userId=test123`
- Level 1 Instagram: `http://localhost:3000/texts/level1/klantrecensies_level1.html?userId=test123`
- Level 1 News: `http://localhost:3000/texts/level1/nieuwsbericht_overzicht_level1.html?userId=test123`
- Level 2 WhatsApp: `http://localhost:3000/texts/level2/doelgroep_level2.html?userId=test123`
- Level 2 Products: `http://localhost:3000/texts/level2/sneakers_jongeren_level2.html?userId=test123`
- Level 3 Event: `http://localhost:3000/texts/level3/evenement_level3.html?userId=test123`
- Level 3 Launch: `http://localhost:3000/texts/level3/lancering_level3.html?userId=test123`

#### SneakSpot Game
- Game: `http://localhost:3000/sneakspot/game.html`
- Challenges: `http://localhost:3000/sneakspot/challenges.html`
- Levels: `http://localhost:3000/sneakspot/levels.html`

#### Admin Dashboard
- Overview: `http://localhost:3000/admin/dashboard.html`
- User Detail: `http://localhost:3000/admin/user-detail.html?userId=test123`

### Test Scenarios
1. **Notepad Flow**: Create notes in sequence → verify pre-filling
2. **Text Tracking**: Scroll through diverse content types → check admin analytics
3. **Data Export**: Export user data → verify CSV/JSON format
4. **Responsive Design**: Test all layouts on different screen sizes
5. **Navigation**: Test back-to-overview links in news articles
6. **Social Media UX**: Verify Instagram posts and WhatsApp chat interfaces

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

### Nginx Configuration
The production nginx configuration is managed via git in `/nginx/onderzoek.leeschallenges.nl`. 

**Key principles**: 
- All requests are proxied to `localhost:3000` - let the Express app handle routing
- **No X-Frame-Options header** - enables iframe integration with Bibendo Game Editor
- All pages can be embedded in Bibendo games via Flutter WebView

For troubleshooting nginx issues, see: [docs/NGINX-TROUBLESHOOTING.md](docs/NGINX-TROUBLESHOOTING.md)

## 📋 Development Status

### Completed ✅
- [x] Project structure and setup
- [x] SQLite database with complete schema (6 tables)
- [x] Express.js API with all endpoints (notes, texts, admin)
- [x] Smart notepad system (12 pages across 3 levels)
- [x] **Enhanced text pages system (12 modern pages with diverse layouts)**
- [x] **Instagram posts with authentic social media styling**
- [x] **WhatsApp chat interface with profile pictures and color coding**
- [x] **Professional news website with ANP branding and navigation**
- [x] **Colorful event plans with gradient backgrounds**
- [x] **Clean business documents with fullscreen layouts**
- [x] **All images integrated (profile pics, products, logos)**
- [x] **Back-to-overview navigation for news articles**
- [x] **Enhanced email readability with improved spacing**
- [x] Admin dashboard with user management and analytics
- [x] Pre-filled textareas on final pages
- [x] **Fully responsive CSS design across all content types**
- [x] Security middleware and rate limiting
- [x] Comprehensive user tracking and logging
- [x] Data export functionality (CSV/JSON)
- [x] Real-time performance analytics
- [x] VPS deployment on onderzoek.leeschallenges.nl
- [x] SSL certificate and production configuration
- [x] Complete API and user documentation
- [x] SneakSpot game integration with Emma storyline in Dutch
- [x] Links overview page (/links.html) for development and testing
- [x] Iframe compatibility - all pages can embed in Bibendo Game Editor
- [x] Static file serving via nginx configuration
- [x] **Modern, engaging content styling with educational value preservation**

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
  texts: `${baseUrl}/texts/level1/oefentekst_level1.html?userId=${gameUserId}`,
  admin: `${baseUrl}/admin/dashboard.html`
};
```

### LeesEvolutie Project Integration
This extension provides the advanced reading assessment tools needed for the **LeesEvolutie** educational initiative, enabling:

- **Interactive Note-Taking**: Context-aware notepad system for learning reflection
- **Modern Content Engagement**: Students interact with authentic social media and business formats
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
This platform provides RESTful APIs for seamless integration with the Bibendo Game Editor ecosystem. All endpoints are documented in the API sections above.

## 🔧 Development Notes

### Database Maintenance
- Database auto-initializes on first run
- Use SQLite browser for manual inspection
- Backup recommended before production deployment

### Performance Considerations
- Text tracking uses throttled scroll events (100ms)
- Auto-save intervals optimized (1.5s delay for notepad auto-save)
- Admin dashboard limits large result sets (50 latest logs)

### Content Management
- All educational content preserved during design transformations
- Images organized in `/frontend/assets/images/` directory
- Profile pictures and branded content properly attributed
- Responsive design tested across all device sizes

## 👥 Contributing

This project is part of the Bibendo educational platform development. Contact the development team for contribution guidelines and coding standards.

## 📄 License

Private project - All rights reserved.
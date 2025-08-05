# Bibendo Integration Project Specification

## Project Overview
Build a web-based educational platform integrated with the Bibendo Flutter app via webview. The platform includes a smart notepad system, text pages with user tracking, CBM (Curriculum-Based Measurement) tool, and an admin dashboard.

## Technical Stack
- **Backend**: Node.js with Express API
- **Database**: SQLite
- **Process Management**: PM2
- **Web Server**: Nginx (reverse proxy)
- **SSL**: Let's Encrypt
- **Frontend**: HTML/CSS/JavaScript (vanilla)

## Infrastructure
- **VPS Provider**: TransIP
- **OS**: Ubuntu 24.04 LTS
- **RAM**: 1 GB
- **Storage**: 100 GB
- **Location**: Amsterdam datacenter (AMS0)
- **IP**: 84.247.14.172
- **Domain**: onderzoek.leeschallenges.nl
- **User**: stormadvies
- **Timezone**: Europe/Amsterdam (with automatic DST)

## Design Guidelines
- Separate CSS file for styling
- Minimal design: no shadows, gradients
- White background (#FFFFFF)
- Primary color: #00C2CB (buttons, accents)
- Maximum screen estate usage (minimal margins)
- Fully responsive
- Clean, simple interface optimized for iframe display

## Security Requirements
- HTTPS mandatory
- Rate limiting: 100 requests per 15 minutes
- Input sanitization
- SQL injection prevention via prepared statements
- XSS prevention
- All timestamps in UTC (converted to local time for display)

## Components to Build

### 1. Smart Notepad System

#### Structure
3 levels with no data transfer between levels, but data transfer within levels:

**Level 1:**
- note1_level1.html
- note2_level1.html
- note3_level1.html
- analysis_level1.html

**Level 2:**
- note1_level2.html
- note2_level2.html
- note3_level2.html
- message_level2.html

**Level 3:**
- note1_level3.html
- note2_level3.html
- plan_level3.html

#### Note Page Features
- Status message (hidden until action)
- Question display
- Textarea (max 2000 characters)
- Character counter
- Save button ("Opslaan")
- User can return and edit saved text

#### Final Pages (analysis/message/plan)
- Display aggregated text from notes
- 3 editable text fields with questions
- Save functionality

### 2. Text Pages System

#### Content Structure
**Level 1:**
- Oefentekst (1 page - email format)
- Nieuwsbericht (overview + 3 subpages)
- Assortiment (1 page)
- Klantrecensies (1 page)

**Level 2:**
- Doelgroep (1 page)
- Sneakers voor Jongeren (1 page)

**Level 3:**
- Voorbeeld Sneaker evenement (1 page)
- Ervaringen sneaker evenement (1 page - email format)

#### Tracking Requirements
- Scroll tracking (forward/backward + order)
- Time on text (open/reopen duration)
- Hyperlink clicks and navigation patterns

### 3. CBM Tool

#### Features
- Cloze-test methodology
- 4 texts total (1 test + 3 levels)
- 2-minute time limit per test
- 3-word multiple choice for each gap
- Smooth animations (1 sec fade out)
- Selected words can be changed
- Text disappears after completion or timeout

#### Data Collection
- Number of answers given
- Correct answers count
- Time spent on text
- Complete interaction sequences

### 4. Admin Dashboard

#### Features
- Overview page with all logged user IDs
- Detailed user data view:
  - Note inputs
  - Final page submissions
  - Text interaction logs
  - CBM performance data
- Data export capabilities

## User Identification
- User ID passed via header or URL parameter
- Persistent user tracking across all pages

## Data Logging Requirements

### Smart Notepad
- Time spent per page (cumulative if user returns)
- Edit count per page
- Final saved content (overwrite on save)

### Text Pages
- Scroll events with direction and sequence
- Total time on page
- Page open/close events
- Hyperlink interactions

### CBM Tool
- Response accuracy
- Response timing
- Completion status
- Total correct answers

## Database Schema Considerations
- Users table (user_id, created_at)
- Notes table (user_id, page_id, content, edit_count, time_spent)
- Text_logs table (user_id, page_id, action_type, timestamp, data)
- CBM_results table (user_id, test_id, answers, correct_count, time_spent)
- Sessions table (user_id, page_id, start_time, end_time)

## API Endpoints Structure
```
POST /api/notes/save
GET /api/notes/:userId/:pageId
POST /api/logs/text
POST /api/logs/cbm
GET /api/admin/users
GET /api/admin/user/:userId
```

## Development Phases
1. **Phase 1**: Backend setup (Express, SQLite, basic API)
2. **Phase 2**: Smart notepad implementation
3. **Phase 3**: Text pages with logging
4. **Phase 4**: CBM tool development
5. **Phase 5**: Admin dashboard
6. **Phase 6**: VPS deployment and SSL setup

## Testing Considerations
- CBM 2-minute timer optional during development
- Local development environment setup
- Migration scripts for production deployment

## GitHub Integration
- Version control for all code
- Separate branches for development/production
- CI/CD pipeline setup (future consideration)
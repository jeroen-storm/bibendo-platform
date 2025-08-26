# Bibendo Platform API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
No authentication required for development. User identification via `userId` parameter.

## Rate Limiting
- **Limit**: 100 requests per 15 minutes per IP
- **Response**: 429 Too Many Requests when exceeded

## Content Type
All POST requests require `Content-Type: application/json`

---

## Notes API

### Save Note
Creates or updates a note for a specific user and page.

**Endpoint**: `POST /notes/save`

**Request Body**:
```json
{
  "userId": "string",     // Required: User identifier
  "pageId": "string",     // Required: Page identifier (e.g., "note1_level1")
  "content": "string",    // Optional: Note content (max 10,000 chars)
  "editCount": number,    // Optional: Number of edits made
  "timeSpent": number     // Optional: Time spent in seconds
}
```

**Response**:
```json
{
  "success": true,
  "id": 123,
  "message": "Note saved successfully"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/notes/save \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "pageId": "note1_level1", 
    "content": "My first note content",
    "editCount": 5,
    "timeSpent": 120
  }'
```

---

### Get Note
Retrieves a specific note for a user and page.

**Endpoint**: `GET /notes/{userId}/{pageId}`

**Parameters**:
- `userId` (string): User identifier
- `pageId` (string): Page identifier

**Response**:
```json
{
  "id": 123,
  "user_id": "user123",
  "page_id": "note1_level1",
  "level": 1,
  "content": "My note content",
  "edit_count": 5,
  "time_spent": 120,
  "created_at": "2025-08-02 06:22:52",
  "updated_at": "2025-08-02 06:25:10"
}
```

**Empty Response** (no note found):
```json
{
  "content": ""
}
```

**Example**:
```bash
curl http://localhost:3000/api/notes/user123/note1_level1
```

---

### Get Notes by Level
Retrieves all notes for a user at a specific level (excluding final pages).

**Endpoint**: `GET /notes/{userId}/level/{level}`

**Parameters**:
- `userId` (string): User identifier  
- `level` (number): Level number (1, 2, or 3)

**Response**:
```json
[
  {
    "id": 123,
    "user_id": "user123", 
    "page_id": "note1_level1",
    "level": 1,
    "content": "First note content",
    "edit_count": 3,
    "time_spent": 95,
    "created_at": "2025-08-02 06:22:52",
    "updated_at": "2025-08-02 06:22:52"
  },
  {
    "id": 124,
    "user_id": "user123",
    "page_id": "note2_level1", 
    "level": 1,
    "content": "Second note content",
    "edit_count": 7,
    "time_spent": 140,
    "created_at": "2025-08-02 06:23:15",
    "updated_at": "2025-08-02 06:24:30"
  }
]
```

**Example**:
```bash
curl http://localhost:3000/api/notes/user123/level/1
```

---

## Logging API

### Log Time Spent
Records time spent on a specific page.

**Endpoint**: `POST /logs/time`

**Request Body**:
```json
{
  "userId": "string",     // Required: User identifier
  "pageId": "string",     // Required: Page identifier
  "timeSpent": number,    // Required: Time in seconds
  "timestamp": "string"   // Optional: ISO timestamp
}
```

**Response**:
```json
{
  "success": true
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/logs/time \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "pageId": "note1_level1",
    "timeSpent": 45,
    "timestamp": "2025-08-02T06:30:00.000Z"
  }'
```

---

### Log Text Interactions
Records user interactions with text content (scrolling, clicking, etc.).

**Endpoint**: `POST /logs/text`

**Request Body**:
```json
{
  "userId": "string",      // Required: User identifier  
  "pageId": "string",      // Required: Page identifier
  "actionType": "string",  // Required: Action type ("scroll", "click", "open", "close")
  "data": object          // Optional: Additional data as JSON object
}
```

**Response**:
```json
{
  "success": true
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/logs/text \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "pageId": "text_level1_news",
    "actionType": "scroll",
    "data": {
      "direction": "down",
      "position": 450,
      "percentage": 65
    }
  }'
```

---

## Admin API

### Get All Users
Retrieves list of all users with basic information.

**Endpoint**: `GET /admin/users`

**Response**:
```json
[
  {
    "user_id": "user123",
    "created_at": "2025-08-01 10:30:00",
    "last_active": "2025-08-02 06:25:10"
  },
  {
    "user_id": "user456", 
    "created_at": "2025-08-01 14:15:30",
    "last_active": "2025-08-02 05:45:20"
  }
]
```

**Example**:
```bash
curl http://localhost:3000/api/admin/users
```

---

### Get User Data
Retrieves comprehensive data for a specific user.

**Endpoint**: `GET /admin/user/{userId}`

**Parameters**:
- `userId` (string): User identifier

**Response**:
```json
{
  "user": [
    {
      "user_id": "user123",
      "created_at": "2025-08-01 10:30:00", 
      "last_active": "2025-08-02 06:25:10"
    }
  ],
  "notes": [
    {
      "id": 123,
      "user_id": "user123",
      "page_id": "note1_level1",
      "level": 1,
      "content": "Note content...",
      "edit_count": 5,
      "time_spent": 120,
      "created_at": "2025-08-02 06:22:52",
      "updated_at": "2025-08-02 06:25:10"
    }
  ],
  "textLogs": [
    {
      "id": 456,
      "user_id": "user123",
      "page_id": "text_level1",
      "action_type": "scroll",
      "timestamp": "2025-08-02 06:24:30",
      "data": "{\"direction\":\"down\",\"position\":450}"
    }
  ],
  "timeLogs": [
    {
      "id": 789,
      "user_id": "user123", 
      "page_id": "note1_level1",
      "time_spent": 45,
      "timestamp": "2025-08-02 06:30:00"
    }
  ]
}
```

**Example**:
```bash
curl http://localhost:3000/api/admin/user/user123
```

---

## Utility Endpoints

### Health Check
Simple health check endpoint to verify API availability.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "OK",
  "timestamp": "2025-08-02T06:30:00.000Z"
}
```

**Example**:
```bash
curl http://localhost:3000/api/health
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 429 Too Many Requests  
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "Something went wrong!"
}
```

---

## Database Schema Reference

### Notes Table Fields
- `id`: Auto-increment primary key
- `user_id`: User identifier (string)
- `page_id`: Page identifier (string) 
- `level`: Level number (1, 2, or 3)
- `content`: Note content (text)
- `edit_count`: Number of edits (integer)
- `time_spent`: Time spent in seconds (integer)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Text Logs Table Fields
- `id`: Auto-increment primary key
- `user_id`: User identifier (string)
- `page_id`: Page identifier (string)
- `action_type`: Action type (string)
- `timestamp`: Event timestamp
- `data`: JSON data (text)

### Time Logs Table Fields
- `id`: Auto-increment primary key
- `user_id`: User identifier (string)
- `page_id`: Page identifier (string) 
- `time_spent`: Time in seconds (integer)
- `timestamp`: Log timestamp

---

## Page ID Conventions

### Notepad Pages
- Level 1: `note1_level1`, `note2_level1`, `note3_level1`, `analysis_level1`
- Level 2: `note1_level2`, `note2_level2`, `note3_level2`, `message_level2` 
- Level 3: `note1_level3`, `note2_level3`, `mynotes_level3` (read-only overview, no save)

### Text Pages (Future)
- Level 1: `oefentekst_level1`, `nieuwsbericht_level1`, etc.
- Level 2: `doelgroep_level2`, `sneakers_level2`  
- Level 3: `evenement_level3`, `ervaringen_level3`

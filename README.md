# JobHunteR - Backend API (Decodelabs Task 2)

Job tracker application with an Express.js REST API backend.

## Setup

```bash
npm install
npm start
```

Server runs at `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Path | Description | Status Codes |
|--------|------|-------------|-------------|
| POST | `/api/auth/signup` | Create a new account | 201, 400, 409 |
| POST | `/api/auth/login` | Log in | 200, 400, 401 |
| POST | `/api/auth/logout` | Log out (requires auth) | 204, 401 |
| GET | `/api/auth/session` | Check current session | 200, 401 |

### Applications

| Method | Path | Description | Status Codes |
|--------|------|-------------|-------------|
| GET | `/api/applications` | List all user applications | 200 |
| POST | `/api/applications` | Create a new application | 201, 400 |
| GET | `/api/applications/:id` | Get a single application | 200, 404 |
| PUT | `/api/applications/:id` | Update an application | 200, 400, 404 |
| DELETE | `/api/applications/:id` | Delete an application | 204, 404 |

### Profile

| Method | Path | Description | Status Codes |
|--------|------|-------------|-------------|
| GET | `/api/profile` | Get user profile | 200 |
| PUT | `/api/profile` | Update user profile | 200, 400 |

---

## Authentication

All `/api/applications` and `/api/profile` routes require an `X-Session-Id` header. Obtain a session ID via `/api/auth/login` or `/api/auth/signup`.

---

## Request / Response Examples

### POST /api/auth/login

**Request:**
```json
{
  "email": "dummyuser1@net.com",
  "password": "Demo1234"
}
```

**Success (200):**
```json
{
  "sessionId": "abc123...",
  "user": { "id": 1, "name": "dummy user", "email": "dummyuser1@net.com" }
}
```

**Failure (401):**
```json
{ "error": "Invalid email or password" }
```

### POST /api/applications

**Request:**
```json
{
  "company": "Amazon",
  "role": "SDE",
  "location": "Bangalore",
  "date": "2026-06-25",
  "status": "Applied"
}
```

**Success (201):**
```json
{
  "id": 4,
  "company": "Amazon",
  "role": "SDE",
  "location": "Bangalore",
  "date": "2026-06-25",
  "status": "Applied",
  "userId": 1
}
```

**Validation Error (400):**
```json
{ "error": "company is required" }
```

### PUT /api/applications/:id

**Request:**
```json
{ "status": "Interview" }
```

**Success (200):** Returns the updated application object.

**Not Found (404):**
```json
{ "error": "Application not found" }
```

### DELETE /api/applications/:id

**Success (204):** Empty body.

**Not Found (404):**
```json
{ "error": "Application not found" }
```

---

## Validation Rules

### Applications
- `company` - required, non-empty string
- `role` - required, non-empty string
- `location` - required, non-empty string
- `date` - required
- `status` - must be one of: `Applied`, `Interview`, `Offer`, `Rejected` (defaults to `Applied`)

### Auth (signup)
- `name` - required, non-empty
- `email` - required, valid format
- `password` - minimum 6 characters

### Profile
- `name` - required, non-empty
- `email` - required, valid format

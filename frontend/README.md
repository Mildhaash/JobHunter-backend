# JobHunter Frontend

A vanilla HTML, CSS, and JavaScript frontend for the JobHunter job application tracker. No frameworks — just clean, lightweight code.

## Overview

JobHunter automates your job hunt. Forward your application emails and an AI agent populates your dashboard automatically. The frontend provides:

- **Landing page** with feature highlights and call-to-action
- **Authentication** — email/password, Google OAuth, and GitHub OAuth
- **Dashboard** with real-time stats and Chart.js visualizations
- **Applications table** with search, filter, add, edit, and delete
- **Gmail AI Sync** — connect Gmail to auto-detect job application emails
- **Profile management** — view and update your name and email
- **Dark/light theme** toggle with system preference detection
- **JSON export** of all application data

## Project Structure

```
frontend/
├── index.html                  # Redirects to Homepage/home.html
├── Homepage/
│   ├── home.html               # Landing page
│   ├── login.html              # Login form
│   ├── signup.html             # Signup form
│   ├── homepage.css            # Homepage styles
│   ├── auth.js                 # Auth logic (login, signup, OAuth)
│   └── theme.js                # Theme toggle logic
└── dashboard/
    ├── dashboard.html          # Stats + charts overview
    ├── applications.html       # Applications table
    ├── profile.html            # User profile
    ├── dashboard.css           # Dashboard styles
    ├── dashboard.js            # Dashboard stats + charts
    ├── applications.js         # Applications CRUD + search/filter
    ├── profile.js              # Profile update logic
    ├── nav.js                  # Shared navbar + auth helpers
    └── data.js                 # API client (all backend calls)
```

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Markup    | HTML5      |
| Styling   | CSS3 (custom properties, responsive) |
| Logic     | Vanilla ES6+ JavaScript |
| Charts    | Chart.js 4.4 (CDN) |
| Auth      | Session-based via `X-Session-Id` header |
| Backend   | Express.js (separate `/backend` directory) |
| Deployment| Vercel (static frontend) |

## Getting Started

This is a static frontend — no build step required.

1. Open `frontend/index.html` in a browser, or
2. Serve the `frontend/` directory with any static file server:

```bash
# Using Python
cd frontend && python -m http.server 8080

# Using Node.js (npx)
npx serve frontend
```

The app expects the backend API at `https://job-hunter-backend-five.vercel.app`. Update the `API_BASE` constant in `data.js` and `auth.js` to point to your own backend.

## Features

### Authentication
- Email/password signup and login
- Google and GitHub OAuth flows
- Session persistence via `localStorage`
- Auto-redirect to dashboard if already logged in

### Dashboard
- Total applications, interview rate, offer conversion, active pipeline
- Doughnut chart — applications by status
- Bar chart — monthly applications (last 6 months)
- Doughnut chart — interview progress
- Gmail AI Sync — connect, sync, and disconnect Gmail

### Applications
- Add, edit, delete applications via modal form
- Search by company or role
- Filter by status (All, Applied, Shortlisted, Interview, Offer)
- Visual progress steps per row
- Responsive card layout for mobile
- Auto-refresh every 30 seconds

### Profile
- View and edit name and email
- Form validation

### Theme
- Dark/light mode toggle
- Respects system `prefers-color-scheme`
- Persisted in `localStorage`

## API Communication

All API calls go through the `DataStore` module (`data.js`). Every request includes an `X-Session-Id` header for authentication. Key endpoints used:

| Feature | Endpoint |
|---------|----------|
| Login | `POST /api/auth/login` |
| Signup | `POST /api/auth/signup` |
| Session | `GET /api/auth/session` |
| Applications CRUD | `/api/applications` |
| Profile | `GET/PUT /api/profile` |
| Gmail connect/sync | `/api/gmail/*` |

## Environment Variables

None required. The API base URL is hardcoded in `data.js` and `auth.js`:

```javascript
const API_BASE = "https://job-hunter-backend-five.vercel.app";
```

Change this to point to your local or custom backend.

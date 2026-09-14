# BlogSpace — Blogging Platform with Comments

A complete internship-ready full-stack project based on the assignment requirements:

- User registration, login and JWT authentication
- Create, edit and delete blog posts
- Public post listing and individual post view
- Comments for user interaction
- RESTful API endpoints
- SQLite database integration
- Responsive frontend using HTML/CSS/JavaScript
- Ownership checks so users can modify only their own posts/comments

## Tech stack

**Frontend:** HTML5, CSS3, Vanilla JavaScript  
**Backend:** Node.js + Express  
**Database:** SQLite via better-sqlite3  
**Authentication:** JWT + bcryptjs

## Requirements

- Node.js 18+ recommended
- npm

## Run locally

1. Open a terminal in this folder.
2. Install dependencies:

```bash
npm install
```

3. Optional: copy `.env.example` to `.env` and change `JWT_SECRET`.
4. Start the server:

```bash
npm start
```

5. Open `http://localhost:5000`.

The SQLite database is created automatically at `data/blog.db` on first run.

## REST API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/posts` | No | List posts |
| GET | `/api/posts/:id` | No | Post + comments |
| POST | `/api/posts` | Yes | Create post |
| PUT | `/api/posts/:id` | Yes | Update own post |
| DELETE | `/api/posts/:id` | Yes | Delete own post |
| POST | `/api/posts/:id/comments` | Yes | Add comment |
| PUT | `/api/comments/:id` | Yes | Update own comment |
| DELETE | `/api/comments/:id` | Yes | Delete own comment |
| GET | `/api/health` | No | API health check |

## Suggested demo flow

1. Register a new account.
2. Create a blog post.
3. Log out and register a second account in another browser/incognito window.
4. Open the post and add a comment.
5. Demonstrate edit/delete ownership protection.
6. Show the REST endpoints and SQLite database during the internship review.

## Project structure

```text
blog-platform-internship/
├── auth.js
├── db.js
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── data/
│   └── .gitkeep
└── public/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

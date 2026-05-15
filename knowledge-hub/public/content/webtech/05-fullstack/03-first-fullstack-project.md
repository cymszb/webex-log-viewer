# First Full Stack Project — Reading List

## 🗺️ Where This Fits
> Phase 5 → Full Stack | Previous: [Deployment](02-deployment.md) | Next: [What Next?](04-what-next.md)

## ⚡ TL;DR
- You'll build a **Reading List** app: add a book (title + author), see the list, delete a book.
- Backend: Node + Express + SQLite. Frontend: plain HTML/CSS/JS. No frameworks.
- The goal is the **end-to-end flow** — frontend talks to backend, backend talks to database — not the feature set.
- This is deliberately simple. Your first full-stack app should be boring; the magic is that all the pieces fit together.
- When something breaks, the bug is almost always at the seam between two layers (frontend ↔ backend, or backend ↔ database).

---

## 📖 Deep Dive

### What is it?

A guided build of your first real full-stack app. Unlike the other topics in this knowledge base, this one is a recipe rather than a concept explanation. Follow it top to bottom and you'll have a working CRUD app with a frontend and a backend that talk to each other.

### Why does it work this way?

A reading list has the four operations every backend developer should be able to write in their sleep: **C**reate, **R**ead, **U**pdate, **D**elete (CRUD). It uses one database table, one HTML form, and one list. Once you've built it, every other app is a variation on this skeleton.

We use SQLite (a single file database) because it requires zero setup. We use plain JavaScript on the frontend because it removes the framework as a possible source of confusion. Once these foundations are solid, swapping in React or PostgreSQL is a small step.

### How to use it

#### Step 1 — Project structure

Create one folder for the whole project, then split frontend and backend:

```
reading-list/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── index.html
    └── app.js
```

```bash
mkdir reading-list && cd reading-list
mkdir backend frontend
cd backend
npm init -y
npm install express cors better-sqlite3 dotenv
```

#### Step 2 — Build the backend

`backend/.env`:

```
PORT=3000
```

`backend/server.js`:

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(express.json());

// Open (or create) the database file
const db = new Database('reading-list.db');

// Create the books table once, if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    title  TEXT NOT NULL,
    author TEXT NOT NULL
  )
`);

// READ — list all books
app.get('/books', (req, res) => {
  const books = db.prepare('SELECT * FROM books ORDER BY id DESC').all();
  res.json(books);
});

// CREATE — add a book
app.post('/books', (req, res) => {
  const { title, author } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: 'title and author are required' });
  }
  const result = db
    .prepare('INSERT INTO books (title, author) VALUES (?, ?)')
    .run(title, author);
  res.status(201).json({ id: result.lastInsertRowid, title, author });
});

// DELETE — remove a book by id
app.delete('/books/:id', (req, res) => {
  const result = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'book not found' });
  }
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
```

Start it:

```bash
node server.js
```

#### Step 3 — Test the API before touching the frontend

This is the single most useful habit in full-stack work: **prove the backend works in isolation** before wiring up a UI. If the API is broken, no amount of frontend tweaking will fix it.

With `curl` (any terminal):

```bash
# Add a book
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Dune","author":"Frank Herbert"}'

# List books
curl http://localhost:3000/books

# Delete book with id 1
curl -X DELETE http://localhost:3000/books/1
```

Or in the browser console (open any page and paste):

```js
fetch('http://localhost:3000/books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Dune', author: 'Frank Herbert' }),
}).then((r) => r.json()).then(console.log);
```

#### Step 4 — Build the frontend

`frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Reading List</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 540px; margin: 2rem auto; }
      form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
      input { flex: 1; padding: 0.5rem; }
      li { display: flex; justify-content: space-between; padding: 0.4rem 0; }
      button { cursor: pointer; }
    </style>
  </head>
  <body>
    <h1>📚 Reading List</h1>

    <form id="add-form">
      <input id="title-input" placeholder="Title" required />
      <input id="author-input" placeholder="Author" required />
      <button type="submit">Add</button>
    </form>

    <ul id="book-list"></ul>

    <script src="app.js"></script>
  </body>
</html>
```

`frontend/app.js`:

```js
const API_URL = 'http://localhost:3000';

const form = document.getElementById('add-form');
const titleInput = document.getElementById('title-input');
const authorInput = document.getElementById('author-input');
const list = document.getElementById('book-list');

async function loadBooks() {
  const res = await fetch(`${API_URL}/books`);
  const books = await res.json();
  list.innerHTML = '';
  for (const book of books) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span><strong>${book.title}</strong> — ${book.author}</span>
      <button data-id="${book.id}">Delete</button>
    `;
    list.appendChild(li);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await fetch(`${API_URL}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: titleInput.value,
      author: authorInput.value,
    }),
  });
  titleInput.value = '';
  authorInput.value = '';
  loadBooks();
});

list.addEventListener('click', async (event) => {
  if (event.target.tagName !== 'BUTTON') return;
  const id = event.target.dataset.id;
  await fetch(`${API_URL}/books/${id}`, { method: 'DELETE' });
  loadBooks();
});

loadBooks();
```

#### Step 5 — Connect frontend to backend

Open `frontend/index.html` with VS Code's **Live Server** extension (right-click → *Open with Live Server*). Make sure the backend is still running on port 3000.

If you see a CORS error in the browser console, double-check that `app.use(cors())` is in your `server.js` and that you restarted the server after adding it.

#### Step 6 — Deploy (optional)

Follow [Deployment](02-deployment.md):
- Push the project to GitHub.
- Deploy `frontend/` to Vercel.
- Deploy `backend/` to Railway (and switch SQLite to a managed database — SQLite files don't survive on Railway).
- Update `API_URL` in `frontend/app.js` to point at the live backend URL.
- Restrict `cors({ origin: 'https://your-frontend.vercel.app' })`.

### Common mistakes / gotchas

- **CORS error in the console.** The backend isn't sending the right header. Forgot `app.use(cors())`, or the server isn't running, or you're hitting the wrong URL.
- **`Failed to fetch`.** The backend isn't running, or you typed the URL wrong, or you're using `https://` against a `http://` localhost server.
- **Form submits and the page reloads.** You forgot `event.preventDefault()` in the submit handler.
- **Add a book, list doesn't update.** You forgot to call `loadBooks()` after the POST resolves.
- **`req.body` is `undefined` on the server.** You forgot `app.use(express.json())`.
- **Reading errors that span both sides.** Open *both* the browser DevTools console *and* the terminal running your server. The frontend tells you what the request was; the backend tells you what went wrong handling it. The truth is usually in one of the two.
- **SQLite file in git.** Add `*.db` to `.gitignore` so you don't commit your local data.

---

## 🔗 Related Topics
- [Node.js Basics](../04-backend/02-nodejs-basics.md) — the runtime your backend uses
- [Express & Servers](../04-backend/01-how-servers-work.md) — the routing layer
- [Databases & SQL](../04-backend/04-databases.md) — what SQLite is doing under the hood
- [REST APIs](../04-backend/03-rest-apis.md) — the shape of the endpoints you wrote
- [Connecting Frontend & Backend](01-connecting-frontend-backend.md) — CORS and env vars in depth
- [Deployment](02-deployment.md) — taking this project to the public internet

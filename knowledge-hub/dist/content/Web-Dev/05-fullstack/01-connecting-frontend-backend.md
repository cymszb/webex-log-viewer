# Connecting Frontend & Backend

## 🗺️ Where This Fits
> Phase 5 → Full Stack | Previous: [Authentication](../04-backend/05-authentication.md) | Next: [Deployment](02-deployment.md)

## ⚡ TL;DR
- A "full stack" app is just a frontend (HTML/CSS/JS in the browser) talking to a backend (a server) over HTTP.
- **CORS** (Cross-Origin Resource Sharing) is a browser security rule that blocks requests to a different domain unless the server explicitly allows it.
- Use the `cors` npm package on your Express server to allow your frontend's origin.
- **Environment variables** (loaded from a `.env` file) keep secrets and config out of your source code.
- Never commit `.env` files to git — add them to `.gitignore`.

---

## 📖 Deep Dive

### What is it?

When you open `index.html` from a local file server at `http://localhost:5500` and that page tries to `fetch('http://localhost:3000/posts')`, you've just made a **cross-origin request**. The browser sees that the page came from one origin (host + port) and the request is going to a different one — and it stops to ask permission.

Think of it like a security guard at the door of a building. You can walk into your own office (same origin) without ID, but if you want to enter the office across the street, the guard at *that* building has to wave you in. CORS is the wave.

The "connection" between frontend and backend is just HTTP requests — usually JSON over `fetch`. The frontend asks ("GET me the posts"), the backend answers (`[{id:1, title:"Hello"}]`), and the frontend renders the result.

### Why does it work this way?

CORS exists to protect *you*. Without it, a malicious site like `evil.com` could silently make a request to `yourbank.com/transfer` using your logged-in session cookies. CORS forces `yourbank.com` to opt in to which other websites are allowed to talk to it.

Crucially, **CORS is enforced by the browser, not the server**. The server happily replies — the browser just refuses to give the response to the JavaScript that asked for it. That's why server-to-server requests (like one Node app calling another) are not subject to CORS at all.

Environment variables exist because hard-coding things like API URLs, database passwords, or secret keys into your source code is dangerous. The moment that code is pushed to GitHub, the secret is leaked. A `.env` file lives only on your machine (and on the server in production), and `process.env` reads from it.

### How to use it

**1. Add CORS to an Express backend**

```bash
npm install cors dotenv
```

```js
// server.js
require('dotenv').config();          // loads .env into process.env
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());                     // allows ALL origins — fine for learning
app.use(express.json());

const posts = [
  { id: 1, title: 'Hello world' },
  { id: 2, title: 'CORS is not so scary' },
];

app.get('/posts', (req, res) => {
  res.json(posts);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
```

To restrict CORS to just your frontend origin:

```js
app.use(cors({ origin: 'http://localhost:5500' }));
```

**2. Create a `.env` file** (in the backend folder)

```
PORT=3000
API_URL=http://localhost:3000
```

And a `.gitignore`:

```
node_modules
.env
```

**3. Fetch from the frontend**

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <body>
    <h1>Posts</h1>
    <ul id="list"></ul>

    <script>
      const API_URL = 'http://localhost:3000';

      async function loadPosts() {
        const res = await fetch(`${API_URL}/posts`);
        const posts = await res.json();
        const list = document.getElementById('list');
        list.innerHTML = posts
          .map((p) => `<li>${p.title}</li>`)
          .join('');
      }

      loadPosts();
    </script>
  </body>
</html>
```

Open `index.html` with the VS Code Live Server extension (it serves on `http://localhost:5500`). The browser fetches `http://localhost:3000/posts`, the server replies with JSON, the page renders the list.

### Common mistakes / gotchas

- **"CORS error" in console** — the server didn't send the `Access-Control-Allow-Origin` header. You forgot `app.use(cors())`, or the server isn't running.
- **CORS only protects browsers.** A Python script or another Node server can hit your API freely. CORS is *not* an authentication mechanism.
- **`cors({ origin: '*' })` is fine for public read-only APIs but risky for anything authenticated.** Combined with cookies, it can leak data.
- **Opening `index.html` directly with `file://`** triggers extra CORS restrictions. Always serve it (Live Server, `python -m http.server`, etc.).
- **Committing `.env` to git** is the classic disaster. Add `.env` to `.gitignore` *before* your first commit, and use a `.env.example` (with placeholder values) to document what variables are needed.

---

## 🔗 Related Topics
- [Fetch & APIs](../03-javascript/04-fetch-and-apis.md) — how the frontend actually makes the request
- [REST APIs](../04-backend/03-rest-apis.md) — what the backend is exposing
- [Authentication](../04-backend/05-authentication.md) — why CORS matters even more once cookies and tokens are involved
- [Deployment](02-deployment.md) — origins change in production, and so does your CORS config

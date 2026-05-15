# Authentication

## 🗺️ Where This Fits
> Phase 4 → Backend | Previous: [Databases](04-databases.md) | Next: [Connecting Frontend & Backend](../05-fullstack/01-connecting-frontend-backend.md)

## ⚡ TL;DR
- **Authentication** = "who are you?" **Authorisation** = "what are you allowed to do?" Two different things, often confused.
- **Never store plain-text passwords.** Hash them with **bcrypt** (a slow, salted hash designed for passwords).
- **JWT (JSON Web Token)** is a stateless way to keep a user logged in — the server signs a token, the client sends it back on every request.
- **Sessions** are the stateful alternative — the server stores session data and gives the client a cookie with a session id.
- Store JWTs in **`httpOnly` cookies**, not `localStorage`, to defend against XSS.

---

## 📖 Deep Dive

### What is it?

Auth is the system that lets your server say "this request is from Yuan, and Yuan is allowed to delete this post." Two distinct steps:

1. **Authentication (AuthN)** — proving identity. Usually email + password, sometimes a magic link or OAuth ("Sign in with Google").
2. **Authorisation (AuthZ)** — checking permissions. "Is the logged-in user the owner of this post? Are they an admin?"

You can be authenticated but not authorised: I might know you're Yuan, but Yuan still can't delete someone else's post.

### Why does it work this way?

Auth bugs are catastrophic. A leaked password database, a weak token scheme, a missing permission check — any of these can lead to account takeovers and data breaches that make the news. The fundamentals exist *because* people kept getting them wrong:

- **Hashing** exists because plain-text passwords get leaked. A hash is a one-way function: given the password you can compute the hash, but given the hash you can't recover the password.
- **Salting** (which bcrypt does automatically) exists because attackers precompute hashes of common passwords ("rainbow tables"). A salt — a random value mixed into the hash — makes every user's hash unique even if their password is `password123`.
- **Slow hashing** (bcrypt is intentionally slow, ~100ms) exists because if a hash takes 1ms an attacker can try a billion passwords a day. At 100ms, they can try ten thousand.
- **JWTs** exist because storing session state on the server is a scaling pain. A signed token lets the server verify the user without a database lookup on every request — handy for distributed systems.

### How to use it

```bash
npm install bcrypt jsonwebtoken express better-sqlite3
```

**Registration — hash the password before storing:**

```js
// register.js
const bcrypt = require('bcrypt');
const db = require('./db'); // assume a users table exists

async function registerUser(email, plainPassword) {
  const passwordHash = await bcrypt.hash(plainPassword, 12); // cost factor 12
  const result = db.prepare(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)'
  ).run(email, passwordHash);
  return { id: result.lastInsertRowid, email };
}

module.exports = { registerUser };
```

The `12` is the **cost factor** — higher = slower = more secure. 10–12 is a sensible default in 2026.

**Login — verify the password and issue a JWT:**

```js
// login.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET; // long random string from .env

async function loginUser(email, plainPassword) {
  const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .get(email);
  if (!user) throw new Error('Invalid credentials');

  const ok = await bcrypt.compare(plainPassword, user.password_hash);
  if (!ok) throw new Error('Invalid credentials');

  // Issue a short-lived token
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
  return token;
}

module.exports = { loginUser };
```

> Notice the error message is the same whether the email or password is wrong. This prevents attackers from probing which emails exist.

**A JWT is three Base64-encoded parts joined by dots:** `header.payload.signature`. Anyone can decode the header and payload — it's not encryption. The signature is what proves the server issued it.

**Protecting a route with middleware:**

```js
// auth-middleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // make user info available to handlers
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;
```

Use it in a route:

```js
// app.js
const express = require('express');
const requireAuth = require('./auth-middleware');
const app = express();

app.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.sub, email: req.user.email });
});
```

The client sends the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Sessions — the stateful alternative.** Instead of a self-contained token, the server creates a session record and gives the client a cookie with the session id:

```js
// sessions.js
const express = require('express');
const session = require('express-session');

const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // requires HTTPS — set to false for http://localhost in development
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60
  }
}));

app.post('/login', async (req, res) => {
  // ...verify password...
  // (user is the record returned from your database after verifying credentials)
  req.session.userId = user.id; // stored server-side; client only sees session cookie
  res.json({ ok: true });
});
```

Sessions trade scalability (server must look up the session) for the ability to **invalidate** a session instantly — useful for "log out everywhere" features.

### Common mistakes / gotchas

- **Rolling your own crypto.** Don't. Use `bcrypt` (or `argon2`) for passwords, `jsonwebtoken` for JWTs, `crypto` (built-in) for randomness. Hand-rolled auth is how you make the news.
- **Using MD5 or SHA1 for passwords.** They're far too fast — an attacker can try billions of guesses per second on a GPU. Bcrypt's slowness is a feature.
- **Storing JWTs in `localStorage`.** Any XSS vulnerability lets an attacker steal the token. Use `httpOnly` cookies (which JavaScript can't read) instead.
- **Long-lived JWTs.** A JWT can't be revoked before it expires (that's the price of being stateless). Keep access tokens short (15 minutes) and use **refresh tokens** for longer sessions.
- **Logging passwords or tokens.** Be paranoid about your logs. A common mistake is logging `req.body` in middleware — which means every login request logs the plaintext password.
- **Forgetting to authorise.** Just because the user is logged in doesn't mean they can do *this* action. Check ownership: `if (post.userId !== req.user.sub) return res.sendStatus(403);`
- **Weak `JWT_SECRET`.** Use a long random string (e.g. `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`). A guessable secret means anyone can forge tokens.

---

## 🔗 Related Topics
- [Databases](04-databases.md) — where users and password hashes live
- [REST APIs](03-rest-apis.md) — auth middleware protects your endpoints
- [Connecting Frontend & Backend](../05-fullstack/01-connecting-frontend-backend.md) — how the browser sends tokens or cookies

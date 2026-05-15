# Databases

## 🗺️ Where This Fits
> Phase 4 → Backend | Previous: [REST APIs](03-rest-apis.md) | Next: [Authentication](05-authentication.md)

## ⚡ TL;DR
- A **database** persistently stores your app's data so it survives server restarts.
- **SQL databases** organise data in **tables** of rows and columns, with strict schemas and relationships.
- The four core operations are **CRUD**: **C**reate (`INSERT`), **R**ead (`SELECT`), **U**pdate (`UPDATE`), **D**elete (`DELETE`).
- **SQLite** is a SQL database stored in a single file — zero install, zero config — perfect for learning and small apps.
- Always use **parameterised queries** to defend against SQL injection. Never concatenate user input into SQL strings.

---

## 📖 Deep Dive

### What is it?

Without a database, every piece of data lives in memory. The moment your server restarts (a deploy, a crash, a power cut), it's all gone. A database fixes that — it writes data to disk in a structured way, lets multiple users read and write simultaneously, and answers complex queries quickly.

A **relational** (SQL) database stores data in **tables**. A table is like a spreadsheet:

| id | title       | author   | published_at |
|----|-------------|----------|--------------|
| 1  | Hello world | Yuan     | 2026-04-29   |
| 2  | About REST  | Yuan     | 2026-04-30   |

Each row is a record. Each column has a defined type (text, integer, date). You query with **SQL** (Structured Query Language), a 50-year-old declarative language that's still the dominant way to talk to databases.

### Why does it work this way?

The relational model (Edgar F. Codd, 1970) had one big insight: data has **relationships**. A post has an author. An order has many items. A user has many orders. SQL databases let you enforce these relationships with **foreign keys** and **constraints**, so it's impossible to (for example) create a post pointing to a user who doesn't exist.

This rigour is exactly what most business apps need. NoSQL databases (MongoDB, DynamoDB) trade that rigour for flexibility — useful in some scenarios, but SQL remains the default for a reason.

**SQLite** in particular is special: the entire database is a single file (e.g. `app.db`). No server process, no network port, no config. You'll outgrow it for large multi-user apps, but for learning and small projects it's perfect — and the SQL you learn transfers directly to PostgreSQL, MySQL, etc.

### How to use it

Install the `better-sqlite3` package — fast, synchronous, and beginner-friendly:

```bash
npm install better-sqlite3
```

**Set up the database and a table:**

```js
// db.js
const Database = require('better-sqlite3');
const db = new Database('app.db'); // creates the file if it doesn't exist

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body  TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
```

**The four CRUD operations:**

```js
// crud.js
const db = require('./db');

// CREATE — INSERT
const insert = db.prepare('INSERT INTO posts (title, body) VALUES (?, ?)');
const info = insert.run('Hello world', 'My first post');
console.log('New post id:', info.lastInsertRowid);

// READ — SELECT (all)
const allPosts = db.prepare('SELECT * FROM posts').all();
console.log(allPosts);

// READ — SELECT (one with WHERE)
const onePost = db.prepare('SELECT * FROM posts WHERE id = ?').get(1);
console.log(onePost);

// UPDATE
db.prepare('UPDATE posts SET title = ? WHERE id = ?')
  .run('Hello, world!', 1);

// DELETE
db.prepare('DELETE FROM posts WHERE id = ?').run(2);
```

Notice the `?` placeholders. You pass the actual values to `.run()` / `.get()` / `.all()` and the library safely escapes them — this is **parameterised queries**, your defence against SQL injection.

**Wiring it into an Express route:**

```js
// server.js
const express = require('express');
const db = require('./db');

const app = express();
app.use(express.json());

app.get('/posts', (req, res) => {
  const posts = db.prepare('SELECT id, title, body FROM posts').all();
  res.json(posts);
});

app.get('/posts/:id', (req, res) => {
  const post = db.prepare('SELECT id, title, body FROM posts WHERE id = ?')
    .get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

app.post('/posts', (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  const result = db.prepare('INSERT INTO posts (title, body) VALUES (?, ?)')
    .run(title, body);
  const created = db.prepare('SELECT id, title, body FROM posts WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

### Common mistakes / gotchas

- **String-concatenating user input into SQL.** This is **SQL injection**, the classic web vulnerability. Never write:
  ```js
  // NEVER do this
  db.exec(`SELECT * FROM users WHERE name = '${req.query.name}'`);
  ```
  A user passing `name=' OR '1'='1` would dump the whole table. Always use `?` placeholders.
- **`SELECT *` in production.** Fine for learning, but in real apps select only the columns you need — it makes queries faster and prevents accidentally leaking new sensitive columns later (e.g. a `password_hash` column added next month).
- **Forgetting indexes.** As tables grow, queries that filter on un-indexed columns get slow. `CREATE INDEX idx_posts_created ON posts(created_at)` for columns you query on often (e.g. queries that filter by date).
- **Not closing connections.** With network databases (Postgres, MySQL), open connections are a finite resource. Use a connection pool. (SQLite via `better-sqlite3` is fine — it's just a file handle.)
- **Mixing schema changes with code.** In real projects use **migrations** (libraries like `knex`, `prisma`, `node-pg-migrate`) so schema changes are version-controlled and replayable.
- **Storing passwords in plain text.** Never. See the next topic — Authentication — for hashing.

---

## 🔗 Related Topics
- [Node.js Basics](02-nodejs-basics.md) — how you install and require the database driver
- [REST APIs](03-rest-apis.md) — your routes will read and write to the database
- [Authentication](05-authentication.md) — usernames and password hashes live in the database

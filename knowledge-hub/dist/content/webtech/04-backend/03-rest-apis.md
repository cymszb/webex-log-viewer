# REST APIs

## 🗺️ Where This Fits
> Phase 4 → Backend | Previous: [Node.js Basics](02-nodejs-basics.md) | Next: [Databases](04-databases.md)

## ⚡ TL;DR
- **REST** is a *convention* for designing HTTP APIs — not a protocol or library.
- **Resources are nouns** (`/users`, `/posts`, `/orders`); **HTTP verbs are actions** (`GET` read, `POST` create, `PUT`/`PATCH` update, `DELETE` remove).
- Use **standard HTTP status codes** so clients know what happened: `200`, `201`, `400`, `404`, `500`.
- A consistent, predictable API means any client (web, mobile, third-party service) can integrate without bespoke docs for every endpoint.
- Always **validate input** and **never include sensitive data** (passwords, tokens) in responses.

---

## 📖 Deep Dive

### What is it?

REST stands for **Representational State Transfer**. The name is academic but the idea is simple: model your application as a collection of **resources** (things) and let clients act on them using the standard HTTP verbs.

If your app has blog posts, the RESTful API for them looks like this:

| Verb     | URL              | Purpose                           |
|----------|------------------|-----------------------------------|
| `GET`    | `/posts`         | List all posts                    |
| `GET`    | `/posts/:id`     | Get one post by id                |
| `POST`   | `/posts`         | Create a new post                 |
| `PUT`    | `/posts/:id`     | Replace a post                    |
| `PATCH`  | `/posts/:id`     | Partially update a post           |
| `DELETE` | `/posts/:id`     | Delete a post                     |

It's almost boring how predictable it is — and that's the point.

### Why does it work this way?

Before REST, every API was a snowflake: `/getUserById`, `/fetchAllProductsForCategory`, `/doLoginNow`. Every team invented their own naming, their own error formats, their own conventions. Integrating with someone's API meant reading hundreds of pages of docs.

REST piggy-backs on what HTTP *already* gives you:

- HTTP already has verbs (GET, POST, etc.) — use them.
- HTTP already has status codes — use them.
- URLs already identify resources — make them clean and noun-based.

The result: a developer can guess most of your API after seeing two endpoints. That's a huge productivity win.

### How to use it

A CRUD API for posts using Express. Save as `posts-api.js`:

```js
// posts-api.js
const express = require('express');
const app = express();
app.use(express.json());

// In-memory "database" for the example
let posts = [
  { id: 1, title: 'Hello world', body: 'My first post' }
];
let nextId = 2;

// GET /posts — list (with optional ?sort=date query)
app.get('/posts', (req, res) => {
  const sort = req.query.sort;
  const result = sort === 'title'
    ? [...posts].sort((a, b) => a.title.localeCompare(b.title))
    : posts;
  res.status(200).json(result);
});

// GET /posts/:id — read one
app.get('/posts/:id', (req, res) => {
  const post = posts.find(p => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.status(200).json(post);
});

// POST /posts — create
app.post('/posts', (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }
  const newPost = { id: nextId++, title, body };
  posts.push(newPost);
  res.status(201).json(newPost); // 201 Created + return the new resource
});

// PUT /posts/:id — replace
app.put('/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Post not found' });
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }
  posts[idx] = { id, title, body };
  res.status(200).json(posts[idx]);
});

// DELETE /posts/:id
app.delete('/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = posts.length;
  posts = posts.filter(p => p.id !== id);
  if (posts.length === before) return res.status(404).json({ error: 'Post not found' });
  res.status(204).send(); // 204 No Content
});

app.listen(3000, () => console.log('API on http://localhost:3000'));
```

**Organising routes with `express.Router`.** As your app grows, a single file becomes unwieldy. Split routes by resource:

```js
// routes/posts.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => { /* list posts */ });
router.get('/:id', (req, res) => { /* read one */ });
router.post('/', (req, res) => { /* create */ });

module.exports = router;
```

```js
// index.js
const express = require('express');
const postsRouter = require('./routes/posts');
const app = express();
app.use(express.json());
app.use('/posts', postsRouter); // mounts the router under /posts
app.listen(3000);
```

**Status codes you'll use most:**

| Code | Meaning              | When to use                                |
|------|----------------------|--------------------------------------------|
| 200  | OK                   | Successful GET/PUT/PATCH                   |
| 201  | Created              | Successful POST that created a resource    |
| 204  | No Content           | Successful DELETE (no body returned)       |
| 400  | Bad Request          | Client sent invalid input                  |
| 401  | Unauthorized         | No or invalid auth token                   |
| 403  | Forbidden            | Authenticated, but not allowed             |
| 404  | Not Found            | Resource doesn't exist                     |
| 500  | Internal Server Error| Your server crashed                        |

### Common mistakes / gotchas

- **Putting verbs in URLs.** `/getPosts` or `/createUser` is anti-REST. The verb is the HTTP method; the URL is the noun.
- **Returning sensitive data.** Never include `password`, `passwordHash`, `apiKey`, or session tokens in a response. Strip them before serialising.
- **Forgetting to return the created/updated resource.** A `POST` should return the new object (with its server-assigned `id`) so the client doesn't need a second request to find out what got created.
- **Trusting the client.** *Always* validate `req.body`, `req.params`, and `req.query`. Anyone can send anything — assume malicious input.
- **Wrong status codes.** Returning `200 OK` with `{"error": "not found"}` confuses clients. Use `404`. The status code IS the API contract.
- **Inconsistent URL pluralisation.** Pick one — typically plural nouns (`/posts`, not `/post`) — and stick to it across the whole API.

---

## 🔗 Related Topics
- [HTTP & Browsers](../01-foundations/02-http-and-browsers.md) — REST is built on HTTP
- [Fetch & APIs](../03-javascript/04-fetch-and-apis.md) — the client side of the same conversation
- [How Servers Work](01-how-servers-work.md) — what's hosting your endpoints

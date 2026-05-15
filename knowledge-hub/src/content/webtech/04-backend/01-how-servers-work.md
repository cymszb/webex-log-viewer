# How Servers Work

## 🗺️ Where This Fits
> Phase 4 → Backend | Previous: [Modern JS](../03-javascript/05-modern-js.md) | Next: [Node.js Basics](02-nodejs-basics.md)

## ⚡ TL;DR
- A **server** is just a program that listens for incoming HTTP requests and sends back responses — nothing magical.
- A **port** is like a door number on a building. Your server picks a door (commonly `3000`, `8080`, or `443` for HTTPS) and waits for visitors there.
- **Middleware** is code that runs *between* the request arriving and the response being sent — used for logging, authentication, parsing JSON, etc.
- The **request/response cycle** is the heartbeat of every backend: a client asks, the server answers, and the connection closes.
- In Node.js, the framework **Express** removes most of the boilerplate so you can focus on writing route handlers.

---

## 📖 Deep Dive

### What is it?

Think of a web server like the front desk of a hotel. Guests (browsers, mobile apps, other servers) walk up and ask for things — "Give me the homepage", "Book me room 12", "Tell me my bill". The desk clerk (your server) reads the request, decides what to do, and hands back a response.

The server is *always running*, *always listening* on a specific port. The port is just a number that tells the operating system, "any network traffic for door 3000, hand it to me." A single computer can run many servers at once, each on a different port.

In code, a server in Node.js is literally a JavaScript program that never exits — it sits in a loop waiting for HTTP requests.

### Why does it work this way?

The web was designed around a **client–server** model. The client is "dumb" by default — it can only ask. The server is the source of truth: it owns the data, runs the business logic, and decides what each user is allowed to see.

Why not let the browser do everything? Two reasons:

1. **Trust.** You can't trust the browser. A user can open dev tools and change anything. Sensitive logic ("does Yuan own this post?") *must* live on the server.
2. **Shared state.** Multiple users need to see the same data. The server is the central place that holds it.

**Middleware** exists because most requests need the same preliminary work: parse the JSON body, check the auth token, log the request, etc. Instead of repeating that in every route, you stack middleware functions and each request flows through them in order — like a conveyor belt with stations.

### How to use it

Let's build the smallest possible Express server.

```bash
mkdir my-server
cd my-server
npm init -y
npm install express
```

Create `index.js`:

```js
// index.js
const express = require('express');
const app = express();

// Middleware: parse JSON bodies on incoming requests
app.use(express.json());

// Middleware: log every request
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // hand off to the next middleware/route
});

// A route: GET /hello
app.get('/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

// A route that reads a request body
app.post('/echo', (req, res) => {
  res.status(200).json({ youSent: req.body });
});

// Error-handling middleware MUST come last and take 4 args
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something broke' });
});

// Start listening on port 3000
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

Run it:

```bash
node index.js
```

Then visit `http://localhost:3000/hello` in your browser, or use `curl`:

```bash
curl http://localhost:3000/hello
curl -X POST http://localhost:3000/echo -H "Content-Type: application/json" -d '{"name":"Yuan"}'
```

**The request object (`req`)** gives you everything about the incoming call:
- `req.method` — `"GET"`, `"POST"`, etc.
- `req.url` — the path, like `/hello`
- `req.headers` — an object of header name/value pairs
- `req.body` — the parsed body (only after `express.json()` middleware runs)
- `req.params` — URL path parameters (e.g. `:id`)
- `req.query` — querystring values (e.g. `?sort=date`)

**The response object (`res`)** is how you reply:
- `res.status(201)` — set the HTTP status code
- `res.json({...})` — send a JSON body
- `res.send('text')` — send plain text or HTML
- `res.set('X-Custom', 'value')` — add a header

### Common mistakes / gotchas

- **Forgetting to send a response.** If a route handler runs but never calls `res.send()`, `res.json()`, or `res.end()`, the request hangs until the client times out. Every code path inside a handler must end with a response.
- **Middleware order matters.** Middleware runs top-to-bottom. If you put your auth check *after* a route, the route runs unprotected. Error handlers must be the *last* `app.use()` call and must take four arguments `(err, req, res, next)`.
- **Forgetting `next()`.** Non-error middleware that doesn't end the response must call `next()` to pass control on. Forgetting it is the same bug as forgetting to send a response.
- **Restarting manually after every save.** Install `nodemon` (`npm install --save-dev nodemon`) and run `npx nodemon index.js`. It restarts your server automatically when files change.
- **Hard-coding the port.** Use `process.env.PORT || 3000` so hosting platforms (Heroku, Render) can override it.

---

## 🔗 Related Topics
- [HTTP & Browsers](../01-foundations/02-http-and-browsers.md) — the protocol your server speaks
- [Node.js Basics](02-nodejs-basics.md) — the runtime your server runs on
- [REST APIs](03-rest-apis.md) — how to design the routes your server exposes

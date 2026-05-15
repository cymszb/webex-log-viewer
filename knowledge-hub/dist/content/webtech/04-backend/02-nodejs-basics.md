# Node.js Basics

## 🗺️ Where This Fits
> Phase 4 → Backend | Previous: [How Servers Work](01-how-servers-work.md) | Next: [REST APIs](03-rest-apis.md)

## ⚡ TL;DR
- **Node.js** lets you run JavaScript outside the browser — on your laptop, on a server, anywhere.
- **npm** (Node Package Manager) installs and manages third-party libraries from a public registry of millions of packages.
- **`package.json`** is your project's identity card — it lists the name, version, scripts, and dependencies.
- Node ships with built-in modules for filesystem (`fs`), paths (`path`), HTTP (`http`), and more — no install required.
- Using JavaScript on both the frontend and backend means **one language for the whole stack**.

---

## 📖 Deep Dive

### What is it?

Node.js is a **JavaScript runtime** built on Chrome's V8 engine — the same engine that runs JS inside Chrome. Someone took V8, ripped it out of the browser, and bolted on the ability to read files, listen on network sockets, and talk to the operating system. The result: the same JavaScript you use in the browser now works as a general-purpose programming language.

If the browser is a sandbox where JS plays with HTML and the DOM, Node is JS let loose on the whole computer.

### Why does it work this way?

Before Node (created in 2009), backend developers used Python, Ruby, PHP, Java, etc. — and frontend devs used JavaScript. Switching languages every time you crossed the network was painful.

Node's other big idea was **non-blocking I/O**. Traditional servers spawn one thread per request — slow if you have 10,000 users waiting on database calls. Node uses a single thread plus an *event loop*: when you ask for a file or a database row, Node starts the operation and immediately moves on to handle the next request. When the result is ready, your callback runs. This makes Node excellent for I/O-heavy workloads like web servers and APIs.

### How to use it

Check Node is installed:

```bash
node --version
npm --version
```

Create a project:

```bash
mkdir my-app
cd my-app
npm init -y          # generates package.json with default values
npm install express  # adds express to dependencies
```

Your `package.json` will now look something like:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
```

**Two module systems exist.** Older Node code uses CommonJS:

```js
// commonjs.js
const fs = require('fs');
module.exports = function greet(name) {
  return `Hello, ${name}`;
};
```

Modern Node supports ES Modules (set `"type": "module"` in `package.json` or use a `.mjs` extension):

```js
// esm.mjs
import { readFile } from 'node:fs/promises';

export function greet(name) {
  return `Hello, ${name}`;
}
```

**Reading a file (async, the recommended way):**

```js
// read-file.js
const fs = require('fs/promises');

async function main() {
  const text = await fs.readFile('hello.txt', 'utf8');
  console.log(text);
}

main().catch(console.error);
```

**Run a script via npm:**

```bash
npm start          # runs the "start" script
npm run dev        # runs any custom script
```

**Environment variables with `dotenv`.** Never hard-code secrets:

```bash
npm install dotenv
```

Create a `.env` file (and add it to `.gitignore`):

```
DATABASE_URL=postgres://localhost/mydb
JWT_SECRET=super-secret-value
```

Load it at the top of your entry file:

```js
// index.js
require('dotenv').config();

console.log(process.env.DATABASE_URL); // available everywhere
```

### Common mistakes / gotchas

- **Committing `node_modules/`.** This folder can be hundreds of MB. Always add it to `.gitignore`. Anyone cloning your repo runs `npm install` to recreate it.
- **NOT committing `package-lock.json`.** This file pins the exact version of every dependency (and its sub-dependencies). Commit it so teammates get *identical* installs.
- **Mixing `require` and `import` carelessly.** A single file is either CommonJS or ESM, not both. The choice is set by the file extension or `"type"` field in `package.json`.
- **Using sync filesystem methods in a server.** `fs.readFileSync` blocks the entire event loop — every other request waits. Use the async versions (`fs.promises.readFile`) inside servers.
- **Storing secrets in code.** Anything in `process.env` belongs in `.env` locally and in your hosting provider's dashboard in production. Never hard-code an API key.
- **Confusing `npm install <pkg>` with `npm install --save-dev <pkg>`.** Runtime libraries (express) go in `dependencies`. Build tools (nodemon, eslint) go in `devDependencies`.

---

## 🔗 Related Topics
- [How Servers Work](01-how-servers-work.md) — the runtime is where your server lives
- [REST APIs](03-rest-apis.md) — what you build with Node + Express
- [Modern JS](../03-javascript/05-modern-js.md) — the language Node executes

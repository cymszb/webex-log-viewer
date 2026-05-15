# What Next?

## 🗺️ Where This Fits
> Phase 5 → Full Stack | Previous: [First Full Stack Project](03-first-fullstack-project.md) | Next: End of curriculum 🎉

## ⚡ TL;DR
- You've covered the fundamentals: HTML, CSS, JavaScript, Node, Express, databases, REST, auth, deployment.
- The most employable next step is a **frontend framework** — and **React** has the most jobs.
- **TypeScript** adds type safety to JavaScript and is now the default in serious codebases.
- Frameworks are conventions on top of the fundamentals you already know — nothing here gets thrown away.
- Don't framework-hop. Pick one ecosystem, build three real projects, then expand.

---

## 📖 Deep Dive

### What is it?

This file is a map, not a tutorial. By now you can build a working full-stack app from scratch. The web ecosystem is enormous, and the question "what should I learn next?" has many reasonable answers. Below are the paths most learners take and what each one is good for.

### Why does it work this way?

Frameworks exist because building a non-trivial UI in plain JS gets painful fast. Three problems show up over and over:

1. **Reusable components** — you find yourself copying the same `<div>` structure with slightly different data. Frameworks let you define a component once and use it everywhere.
2. **State management** — keeping the UI in sync with data (a cart count, a logged-in user, a fetched list) is fiddly. Frameworks track state and re-render automatically.
3. **The Virtual DOM (or similar)** — touching the real DOM is slow. Frameworks compute the minimum set of changes and apply them in a batch.

You don't *need* a framework. You need one when your app gets big enough that not having one costs you more time than learning one.

### How to use it

#### Frontend frameworks

| Framework | Why pick it |
|---|---|
| **React** | Largest job market, biggest ecosystem, most learning resources. Default choice if you want a job. |
| **Vue** | Gentler learning curve, excellent docs, popular outside the US. Great for solo developers. |
| **Svelte** | Simplest syntax, no virtual DOM, compiles to plain JS. Smallest bundle sizes. Loved by everyone who tries it. |

Start with **React** unless you have a specific reason not to. Use **Vite** to scaffold the project (`npm create vite@latest`).

#### TypeScript

JavaScript with types. Instead of:

```js
function greet(user) {
  return 'Hello ' + user.name.toUpperCase();
}
```

you write:

```ts
type User = { name: string };

function greet(user: User): string {
  return 'Hello ' + user.name.toUpperCase();
}
```

The benefit: the compiler catches `greet(null)` or `greet({ nam: 'Sam' })` *before* you run the code. In a 50-file codebase this saves hours per week. Every serious team uses it now. Start by adding it to a small project — `npm install -D typescript` and rename `.js` files to `.ts` one at a time.

> Run `npx tsc --init` to generate a `tsconfig.json`, and use `ts-node` or `tsx` to run TypeScript files directly: `npm install -D tsx` then `npx tsx index.ts`.

#### Backend frameworks

Express is what you learned, and it's still everywhere. When you outgrow it, look at:

- **Fastify** — same shape as Express, ~2x faster, better validation built in.
- **NestJS** — opinionated, structured, TypeScript-first. Feels like Angular for the backend. Great for big teams.
- **Hono** — tiny, runs on every JS runtime (Node, Bun, Cloudflare Workers, Deno).

#### Databases

You used SQLite. In production, the next step is usually:

- **PostgreSQL** — the default relational database. Powerful, free, runs anywhere.
- **MongoDB** — pick this if your data is genuinely document-shaped (deeply nested, schema-fluid). Most apps don't need it.

Talk to databases through an **ORM** so you write JS/TS instead of raw SQL strings:

- **Prisma** — most popular, beautiful schema language, great auto-complete.
- **Drizzle** — lighter, closer to SQL, faster cold starts.

Example with Prisma:

```ts
const newBook = await prisma.book.create({
  data: { title: 'Dune', author: 'Frank Herbert' },
});

const all = await prisma.book.findMany({ orderBy: { id: 'desc' } });
```

#### Testing

You can ship without tests. You shouldn't.

- **Vitest** or **Jest** — unit-test your functions.
- **React Testing Library** — test React components the way users actually use them.
- **Supertest** — fire HTTP requests at your Express app inside a test:

```js
const request = require('supertest');
const app = require('./server');

test('GET /books returns an array', async () => {
  const res = await request(app).get('/books');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});
```

> **Note:** For this to work, your `server.js` (or `app.js`) must export the app without auto-starting: add `module.exports = app;` at the bottom, and guard your listener: `if (require.main === module) { app.listen(3000); }`

- **Playwright** — drive a real browser to test the whole app end-to-end.

#### Tooling

- **Vite** — modern frontend bundler. Replaces webpack for almost all new projects.
- **ESLint** — catches likely bugs (unused variables, accidental globals).
- **Prettier** — auto-formats your code so you stop arguing about semicolons.
- **Git + GitHub** — you should be using this already; if not, start today.

#### How to keep learning

1. **Build projects.** Three real projects teach you more than thirty tutorials. Pick something you actually want to use.
2. **Read source code.** Find a small open-source library you use and read it end to end.
3. **Contribute to open source.** Start with documentation fixes. Move up to bug fixes. The skills you gain (reading other people's code, working with maintainers) matter more than the commits themselves.
4. **Write about what you learn.** A blog post forces you to actually understand something. It also doubles as a portfolio.
5. **Join a community.** Discord servers for React/Vue/Svelte, the dev.to forum, your local meetup. Programming alone is harder than it needs to be.

### Common mistakes / gotchas

- **Framework-hopping.** Spending two weeks on React, two on Vue, two on Svelte teaches you nothing well. Pick one and go deep for at least six months.
- **Tutorial purgatory.** Watching a course feels productive but builds nothing. Build first, look up answers as you hit walls.
- **Learning ten things at once.** TypeScript + React + Next.js + Prisma + tRPC + Tailwind + Docker is overwhelming. Add one tool at a time.
- **Chasing every new shiny thing.** A new "React killer" launches every month. Most are gone in a year. Stick with mainstream tools until you have a concrete reason to switch.
- **Forgetting the fundamentals.** When the framework breaks, the people who can fix it are the ones who understand the HTTP request, the DOM, and the JavaScript event loop underneath. Keep these sharp.

---

## 🔗 Related Topics
- [Phase 1 — Foundations](../01-foundations/README.md) — how the web works
- [Phase 2 — Frontend](../02-frontend/README.md) — HTML, CSS, layout
- [Phase 3 — JavaScript](../03-javascript/README.md) — the language of the web
- [Phase 4 — Backend](../04-backend/README.md) — Node, Express, databases, auth
- [Phase 5 — Full Stack](README.md) — connecting it all and shipping it

You're done. Now go build something. 🚀

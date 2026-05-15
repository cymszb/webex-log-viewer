# Deployment

## 🗺️ Where This Fits
> Phase 5 → Full Stack | Previous: [Connecting Frontend & Backend](01-connecting-frontend-backend.md) | Next: [First Full Stack Project](03-first-fullstack-project.md)

## ⚡ TL;DR
- **Deployment** = putting your app on a server on the internet so other people can use it.
- Static frontends (plain HTML/CSS/JS, or built React/Vue output) go to **Vercel** or **Netlify** — free.
- Node/Express backends go to **Railway**, **Render**, or **Fly.io** — generous free tiers.
- Set environment variables on the hosting platform. Never commit `.env` to git.
- Always use `process.env.PORT` for your server — hosts assign the port dynamically.

---

## 📖 Deep Dive

### What is it?

Up to now, your app has been running on `localhost` — a server on your machine, accessible only to you. Deployment is moving that app to a computer in a data centre that's always on, has a public IP, and lives behind a domain name.

A useful mental picture: your laptop is a notebook on your desk. Deployment is photocopying the relevant pages and posting them to a public library where anyone can read them. The original stays where you can keep editing it; the published copy is what the world sees.

There are two halves to deploy:
- **Frontend** (HTML/CSS/JS) — just files. They sit on a CDN (a global network of servers close to users) and are served instantly.
- **Backend** (Node/Express + database) — a long-running process. It needs a host that will keep it alive, restart it when it crashes, and route traffic to it.

### Why does it work this way?

The split exists because the two halves have very different needs. Static files are cheap to serve — copy them everywhere. A backend has *state*: open database connections, in-memory caches, running code. It needs a real machine.

The free tiers exist because hosting providers want you to start with them and stick around as your app grows. They earn money when your traffic exceeds the free limits, or when you add a managed database.

The reason `process.env.PORT` matters is that your laptop lets you pick port 3000, but in production the host runs many apps on one machine and assigns each one a port. If you hard-code 3000, the host can't route traffic to you and your app appears dead.

### How to use it

**1. The `start` script in `package.json`**

Hosting platforms run `npm start` to boot your backend. So your `package.json` needs:

```json
{
  "name": "my-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5"
  }
}
```

**2. Use the host-assigned port**

```js
// server.js
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello from production!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
```

`process.env.PORT` is set by the host. The `|| 3000` fallback lets it still work locally.

**3. Deploy a static frontend to Vercel**

1. Push your frontend folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), sign in with GitHub.
3. Click **Add New → Project**, pick the repo, click **Deploy**.
4. You get a URL like `https://my-app.vercel.app` within ~30 seconds.
5. Every `git push` to `main` triggers an auto-deploy.

**4. Deploy a Node backend to Railway**

1. Push your backend folder to GitHub.
2. Go to [railway.app](https://railway.app), **New Project → Deploy from GitHub repo**.
3. Railway detects Node, runs `npm install`, then `npm start`.
4. Open **Variables** and add your env vars (anything that was in `.env`):
   ```
   API_URL=https://my-api.up.railway.app
   JWT_SECRET=some-long-random-string
   ```
5. Click **Settings → Networking → Generate Domain** to get a public URL.

**5. Connect frontend to deployed backend**

In your frontend, swap `http://localhost:3000` for the live URL:

```js
const API_URL = 'https://my-api.up.railway.app';
fetch(`${API_URL}/posts`).then(/* … */);
```

And update CORS on the backend to allow the deployed frontend:

```js
app.use(cors({ origin: 'https://my-app.vercel.app' }));
```

**6. Custom domains (briefly)**

Both Vercel and Railway let you point your own domain (e.g. `myapp.com`) at the deployment. You buy a domain from a registrar (Namecheap, Cloudflare), then add a DNS record in their dashboard pointing at the host. The host handles HTTPS certificates automatically.

### Common mistakes / gotchas

- **Hard-coded port** — `app.listen(3000)` works locally and silently fails in production. Always `process.env.PORT || 3000`.
- **SQLite on ephemeral filesystems** — platforms like Railway and Render wipe the disk on every redeploy. Your `database.sqlite` file will vanish. For production, use a managed database (Railway PostgreSQL, Supabase, Neon).
- **Missing `start` script** — without `"start": "node server.js"`, the host has no idea how to launch your app.
- **Forgot to set env vars** — your app boots, then crashes because `process.env.JWT_SECRET` is `undefined`. Set every variable from `.env` in the host's dashboard.
- **CORS still pointing at localhost** — the deployed frontend can't talk to the deployed backend until you update the allowed origin.
- **Build steps not configured** — for frameworks like React/Vue, you need a build command (`npm run build`) and an output directory (`dist/` or `build/`). Vercel auto-detects most; for others, set them in the platform settings.

---

## 🔗 Related Topics
- [Node.js Basics](../04-backend/02-nodejs-basics.md) — what's actually being deployed
- [Connecting Frontend & Backend](01-connecting-frontend-backend.md) — env vars and CORS, which production breaks first
- [First Full Stack Project](03-first-fullstack-project.md) — try deploying the project from this topic

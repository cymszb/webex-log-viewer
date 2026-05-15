# How the Web Works

## 🗺️ Where This Fits
> Phase 1 → Foundations | Previous: Start | Next: [HTTP & Browsers](02-http-and-browsers.md)

## ⚡ TL;DR
- When you type a URL, your browser first asks **DNS** to convert the domain name into an IP address — like looking up a phone number.
- Your browser opens a connection to that IP and sends an **HTTP request** — basically asking "give me this page".
- The server sends back a **response**: a status code plus the HTML content.
- Your browser reads the HTML and **renders** it into the page you actually see.
- "The web" and "the internet" are **not the same thing**. The internet is the infrastructure; the web is one service that runs on top of it.

---

## 📖 Deep Dive

### What is it?

Think about ordering pizza by phone.

- **You** are the *client* — you want something.
- The **restaurant** is the *server* — it has what you want.
- You looked up the restaurant's number in a directory — that's **DNS** (turning a name into a number you can actually dial).
- You **call and place an order** — that's an **HTTP request**.
- The restaurant **prepares and delivers your order** — that's the **HTTP response**.
- The **phone network** that carries your call is the **internet**.
- The whole **pizza-ordering service** running over those phone lines is the **web**.

This distinction matters: the *internet* is wires, routers, and protocols moving raw data between computers. The *web* is just one of many services that uses that infrastructure — alongside email, video calls, online games, and so on.

### Why does it work this way?

The internet started in the late 1960s as **ARPANET**, a US military research network. Its key design principle: **no single point of failure**. If one chunk of the network was destroyed, traffic should reroute around the damage. That's why the internet is decentralised — there's no "main server" you can switch off.

The **web** came much later, in **1989**, invented by **Tim Berners-Lee** at CERN, the European particle physics lab. He needed a way for scientists in different institutions to share documents that linked to each other. He invented three things to make it work:

1. **HTTP** — a simple protocol for asking for documents and getting them back.
2. **HTML** — a markup language for writing those documents with links between them.
3. **URLs** — a uniform way to address any document, anywhere on the internet.

He layered all three on top of the *existing* internet, which is why the web could spread so quickly: the wires were already there.

### How to use it

Here's exactly what happens when you type `https://example.com` into your browser and hit Enter:

1. **Cache check.** Your browser first asks itself: have I been here recently? If so, it might already have the IP address (and even some of the page) cached.
2. **DNS lookup.** If not cached, the browser asks a **DNS server**: "What's the IP address for `example.com`?" The DNS server replies with something like `93.184.216.34`. (DNS = Domain Name System — basically the internet's phone book.)
3. **TCP connection.** The browser opens a network connection to that IP address on **port 443** (the standard port for HTTPS).
4. **TLS handshake.** Because we're using HTTPS, the browser and server now agree on encryption keys so nobody can eavesdrop on the conversation.
5. **HTTP request.** The browser sends a request that essentially says `GET / HTTP/1.1` along with some headers describing itself ("I'm Firefox on a Mac, I prefer English, etc.").
6. **Server response.** The server replies with a **status code** (e.g. `200 OK`) and the **HTML body** of the page.
7. **Resource discovery.** As the browser parses the HTML, it spots references to CSS files, JavaScript files, images, fonts — and fires off *more* HTTP requests for each one. (A modern page can easily fire 50+ of these.)
8. **Render.** The browser combines all of that into the visual page you see, then runs any JavaScript. (The *when* JavaScript runs relative to rendering depends on how the `<script>` tag is written — we'll come back to this in Phase 3.)

All of this typically happens in well under a second.

### Common mistakes / gotchas

- **HTTPS is not a separate protocol.** It's HTTP with **TLS encryption** layered on top. Same requests, same responses — just inside an encrypted tunnel.
- **DNS changes take time to propagate.** When you change a domain to point at a new server, the old IP address can sit in caches for hours (sometimes a day or more) before everyone in the world sees the new one.
- **One page = many requests.** The HTML is just the starting point. Each image, script, font, and stylesheet is a separate HTTP round-trip. This is why page performance matters so much.
- **"The cloud" is just other people's computers.** When someone says their app "runs in the cloud," they mean it runs on a server somewhere they don't physically own. That's it. No magic.

---

## 🔗 Related Topics
- [HTTP & Browsers](02-http-and-browsers.md) — the next step: HTTP in depth.
- [REST APIs](../04-backend/03-rest-apis.md) — how APIs use the same HTTP machinery you just learned about.

# HTTP & Browsers

## 🗺️ Where This Fits
> Phase 1 → Foundations | Previous: [How the Web Works](01-how-the-web-works.md) | Next: [HTML Basics](03-html-basics.md)

## ⚡ TL;DR
- **HTTP** is the language browsers and servers use — every web interaction is an HTTP **request/response** pair.
- A **request** = method + URL + headers + (optional) body. A **response** = status code + headers + body.
- The **method** says *what* to do: `GET` (read), `POST` (create), `PUT`/`PATCH` (update — `PUT` replaces the whole resource, `PATCH` changes part of it), `DELETE` (delete).
- **Status codes** say *what happened*: 2xx = success, 3xx = redirect, 4xx = client error, 5xx = server error.
- Browsers do far more than fetch HTML — they parse it, build a DOM tree, apply CSS, lay out elements, and paint pixels.

---

## 📖 Deep Dive

### What is it?

**HTTP** stands for **HyperText Transfer Protocol**. It's how browsers talk to web servers — and at its core, it's surprisingly simple. It's a *text-based* protocol: if you intercepted the bytes flying over the network (before encryption), you'd see human-readable text.

Here's what a real HTTP request looks like:

```
GET /index.html HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0
Accept: text/html
```

And a real HTTP response:

```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1234

<!DOCTYPE html>
<html>...
```

That's it. A request says **what** the client wants and gives some context about itself. A response says **what happened** plus the actual content. Every interaction on the web — clicking a link, submitting a form, loading an image, calling an API — is one of these pairs.

### Why does it work this way?

HTTP was designed to be **stateless**. That means every request is completely independent — the server doesn't remember anything about your previous requests. Each one stands alone.

Why? Because statelessness keeps servers **simple and scalable**. Any server can handle any request; there's no need to track who's connected to which machine. This made it practical to build huge sites with many servers behind a load balancer.

But statelessness is awkward when you actually want the server to remember you — for shopping carts, logins, preferences. So in **1994**, Netscape invented **cookies**: little pieces of data the server gives the browser, which the browser sends back with every future request. Cookies became the standard workaround for HTTP's statelessness, and they're still how login sessions work today.

### How to use it

#### The status codes worth memorising

| Code | Meaning | When |
|------|---------|------|
| **200 OK** | Success | The normal "here's your content." |
| **201 Created** | Success | After a successful `POST` that made something new. |
| **301 Moved Permanently** | Redirect | This URL has moved forever — go here instead. |
| **302 Found** | Redirect | This URL is temporarily somewhere else. |
| **400 Bad Request** | Client error | Your request was malformed. |
| **401 Unauthorized** | Client error | You need to log in first. |
| **403 Forbidden** | Client error | Logged in, but you're not allowed. |
| **404 Not Found** | Client error | That resource doesn't exist. |
| **500 Internal Server Error** | Server error | Something broke on the server. |

Memorise the *families*: **2xx = good**, **3xx = go somewhere else**, **4xx = you messed up**, **5xx = the server messed up**. That alone covers 90% of debugging.

#### The browser rendering pipeline

When the HTML response arrives, the browser doesn't just stick it on the screen. It runs a multi-step pipeline:

1. **Parse HTML → DOM tree.** The HTML is turned into the **Document Object Model**: a tree structure representing every element on the page.
2. **Parse CSS → CSSOM.** All stylesheets are parsed into the **CSS Object Model** — another tree, this one of style rules.
3. **Render Tree.** The browser combines the DOM and CSSOM, throwing away anything invisible (like `<head>` elements or `display: none` items).
4. **Layout.** It calculates exactly where every element goes and how big it is — essentially solving a giant geometry puzzle.
5. **Paint.** It draws the pixels for each element.
6. **Composite.** It layers the painted elements on top of each other (handling transparency, transforms, etc.) and sends the final image to the screen.

Knowing this pipeline helps when you're debugging weird visual glitches or performance problems later on.

### Common mistakes / gotchas

- **`4xx` = client did something wrong. `5xx` = server broke.** This split is the single most useful thing in debugging. If you see a 4xx, look at *your* request. If you see a 5xx, look at the *server logs*.
- **HTTP itself is stateless.** When you see "your session expired," that's the server's session mechanism timing out — not HTTP. HTTP doesn't know what a session is.
- **HTTP/2 and HTTP/3 are faster but conceptually identical.** They use binary framing and multiplexing under the hood, but methods, status codes, and headers all work the same. Don't worry about the version — just know the concepts.
- **`301` redirects can be cached forever.** Browsers may remember a permanent redirect indefinitely. If you set up a `301` and then change your mind, users who visited during the redirect could be stuck on the old behaviour for a long time. Use `302` if you're not sure it's permanent.

---

## 🔗 Related Topics
- [How the Web Works](01-how-the-web-works.md) — the big picture this fits into.
- [Fetch & APIs](../03-javascript/04-fetch-and-apis.md) — using HTTP from JavaScript.
- [REST APIs](../04-backend/03-rest-apis.md) — designing APIs around HTTP verbs.

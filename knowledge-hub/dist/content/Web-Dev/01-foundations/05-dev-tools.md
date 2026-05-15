# Dev Tools

## 🗺️ Where This Fits
> Phase 1 → Foundations | Previous: [CSS Basics](04-css-basics.md) | Next: [Phase 2 → HTML Semantics](../02-frontend/01-html-semantics.md)

## ⚡ TL;DR
- Browser DevTools (open with **F12** or right-click → **Inspect**) are your most important development tool.
- **Elements panel:** see the live HTML/CSS, edit styles instantly, understand the box model visually.
- **Console panel:** run JavaScript, read error messages, debug your code.
- **Network panel:** see every HTTP request the page makes, with status codes, timing, and response bodies.
- Changes you make in DevTools are temporary — they reset on page reload.

---

## 📖 Deep Dive

### What is it?

Every major browser — Chrome, Firefox, Edge, Safari — ships with a built-in suite of **developer tools**. They're a window into exactly what the browser is doing with your code, in real time.

How to open them:

- **F12** on most browsers, or
- **Ctrl+Shift+I** (Windows / Linux), or
- **Cmd+Option+I** (Mac), or
- **Right-click any element on the page → Inspect**.

DevTools are often the difference between "I have no idea what's wrong" and "oh, that one CSS rule is being overridden". Spend time here. You'll use these every single day as a developer.

### Why does it work this way?

The original way to peek under the hood of a web page was **View Source** — a feature in browsers since the very beginning. It showed you the raw HTML the server sent. The problem: modern pages are *dynamic*. JavaScript modifies the DOM, CSS gets computed, requests fly back and forth long after the initial HTML loads. View Source can't show any of that.

**Chrome DevTools**, pioneered by Google around 2008, set a new standard: a live, inspectable view into the running page. Firefox, Safari, and Edge all followed. Today they're so similar across browsers that switching between them feels almost identical.

### How to use it

Below are the three panels you'll live in. Open DevTools on a page right now and follow along.

#### Elements panel

This is where you see the HTML and CSS the browser is *actually* using right now (not just what was sent from the server).

- Click the **cursor icon** in the top-left of DevTools, then click any element on the page to inspect it.
- The top half shows the HTML tree; the bottom half shows the CSS rules that apply (the **Styles** tab).
- **Click any CSS value to edit it live.** Try changing a colour or a `padding` value — the page updates instantly. This is the fastest way in the world to experiment with styles.
- The **Computed** tab shows the *final* value of every property after all rules have been applied. If you can't tell why an element is the colour it is, look here.
- Hovering over elements in the HTML tree highlights them on the page, with a colourful overlay showing the box model (margin, border, padding, content).

#### Console panel

The Console is an interactive prompt where you can type JavaScript and it runs immediately against the current page.

```javascript
// Type these directly into the Console:
document.title                    // → "My Page"
document.querySelector('h1')      // → <h1>...</h1>
2 + 2                             // → 4
```

What else it does:

- **Errors appear here in red.** Always read them — they tell you exactly what went wrong, in which file, on which line. Most "my code doesn't work" problems are answered by the very error message you ignored.
- **`console.log()` in your code prints here.** This is the original debugging tool: sprinkle `console.log(myVariable)` through your code to see what's happening.
- **Press Up arrow** to recall previous commands, just like a real terminal.

#### Network panel

The Network panel records every HTTP request the page makes.

- **Refresh the page with Network open** to capture everything from the start of the load.
- Each row is one HTTP request: name, status code, type (HTML/CSS/JS/image/etc.), size, and time.
- Click a request to drill in:
  - **Headers** — what your browser sent, what the server sent back.
  - **Response** — the actual body of the response.
  - **Timing** — how long DNS, connection, and download each took.
- **Filter** by type at the top. Most useful: **Fetch/XHR** for API calls, **JS** for scripts, **CSS** for stylesheets.
- **Status codes are colour-coded:** green for 2xx, orange for 3xx, red for 4xx and 5xx. A page full of red is usually a quick diagnosis.

Try this: open the Network panel, then load a popular news or shopping site. You'll likely see **50+ requests**, sometimes hundreds. That's normal — and it's a powerful demonstration of how much is happening behind a single click.

### Common mistakes / gotchas

- **Ignore third-party errors.** Errors coming from ad networks, analytics, or browser extensions clutter the Console but aren't your bug. Focus on errors pointing at *your* files.
- **The Network panel clears on navigation.** If you need to see what happened *before* a redirect or page change, tick **Preserve log** in the Network settings.
- **Disable cache during development.** In Network settings, enable **Disable cache (while DevTools is open)** so you don't waste time wondering why your CSS changes aren't showing up.
- **The box model diagram is a debugging superpower.** When an element is mysteriously the wrong size or in the wrong place, the visual box model in the **Computed** tab shows you exactly which margin, padding, or border is at fault — usually in seconds.

---

## 🔗 Related Topics
- [DOM Manipulation](../03-javascript/02-dom-manipulation.md) — the JavaScript that DevTools lets you run live.
- [Fetch & APIs](../03-javascript/04-fetch-and-apis.md) — the Network panel shows all your `fetch()` calls.
- [CSS Basics](04-css-basics.md) — DevTools is the best way to actually understand CSS behaviour.

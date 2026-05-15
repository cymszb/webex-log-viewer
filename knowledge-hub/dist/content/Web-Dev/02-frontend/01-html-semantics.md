# HTML Semantics

## 🗺️ Where This Fits
> Phase 2 → Frontend | Previous: [Phase 1 → Dev Tools](../01-foundations/05-dev-tools.md) | Next: [CSS Layout](02-css-layout.md)

## ⚡ TL;DR
- Semantic HTML uses elements that describe their *meaning*, not just their appearance — `<nav>` means "navigation", `<article>` means "self-contained content"
- The main semantic landmarks: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`
- Screen readers use semantic structure to help blind users navigate — "skip to main content" only works if `<main>` exists
- Search engines use semantics to understand your page — headings signal what's important
- One `<h1>` per page, never skip heading levels (h1 → h2 → h3, not h1 → h3)

---

## 📖 Deep Dive

### What is it?

HTML elements come in two kinds: **semantic** elements (which carry meaning about the content they contain) and **non-semantic** elements (which are just generic boxes). `<h1>` says "this is the most important heading on the page." `<nav>` says "this group of links is navigation." `<p>` says "this is a paragraph of text." In contrast, `<div>` and `<span>` mean absolutely nothing — they're just empty containers waiting to be styled.

Think of it like the difference between a labelled filing cabinet and a pile of cardboard boxes. Both can hold the same paperwork, but only the labelled cabinet lets someone else (a screen reader, a search engine, the next developer) immediately understand what's where.

**Before — non-semantic soup:**
```html
<div class="header">
  <div class="nav">
    <div class="nav-link"><a href="/">Home</a></div>
    <div class="nav-link"><a href="/about">About</a></div>
  </div>
</div>
<div class="main">
  <div class="article">
    <div class="title">My Blog Post</div>
    <div class="content">Lorem ipsum...</div>
  </div>
</div>
```

**After — semantic and self-describing:**
```html
<header>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>
</header>
<main>
  <article>
    <h1>My Blog Post</h1>
    <p>Lorem ipsum...</p>
  </article>
</main>
```

The semantic version uses fewer elements, fewer class names, and is immediately understandable to a screen reader, a search engine crawler, or a developer reading it for the first time.

**The landmark elements and what each is for:**

- `<header>` — Top of a page or section. Site logo, primary nav, tagline. (A page can have multiple headers — every `<article>` and `<section>` can have its own.)
- `<nav>` — Navigation links. Use for primary site nav, breadcrumbs, pagination. Don't wrap every group of links in `<nav>` — only major navigational blocks.
- `<main>` — The primary content of the page. **Only one per page.** Skip-to-content links jump here.
- `<article>` — Self-contained content that would still make sense if you copy-pasted it elsewhere: a blog post, a news story, a product card, a comment.
- `<section>` — A themed grouping *within* a document. Should have a heading. Use when no more specific element (like `<article>` or `<nav>`) applies.
- `<aside>` — Tangentially related content. Sidebars, pull quotes, ads, related-links boxes.
- `<footer>` — Bottom of a page or section. Copyright, contact links, secondary navigation.

### Why does it work this way?

The web started as a system for sharing academic documents. Early HTML was written like a word processor, and as the web grew into apps and complex layouts, developers reached for `<div>` for *everything* and added meaning through CSS class names. The problem: a class name like `class="navigation"` means nothing to a browser, a screen reader, or a search engine — those names are just arbitrary strings.

Screen reader users needed a consistent, machine-readable way to navigate pages without relying on visual layout. They wanted to jump to "the main content" or "the navigation" without scrolling through a wall of text. The W3C's Web Accessibility Initiative (WAI) pushed hard for semantic elements when HTML5 was being standardised, and HTML5 (finalised in 2014) shipped with the landmark elements we use today. The meaning is now in the markup itself, not in CSS class names that any developer might name differently.

### How to use it

**Heading hierarchy — describe your document's outline:**
```html
<h1>My Website</h1>    <!-- one per page -->
  <h2>Blog</h2>
    <h3>Recent Posts</h3>
    <h3>Featured Posts</h3>
  <h2>About</h2>
    <h3>My Story</h3>
```
Headings build a document outline that screen reader users navigate with a single keypress. Skipping levels (h1 → h3) breaks that outline.

**Form elements — always pair an input with a `<label>`:**
```html
<!-- Good: label tied to input via for/id -->
<label for="email">Email address</label>
<input type="email" id="email" name="email">

<!-- Better: label wraps input — no id needed -->
<label>
  Email address
  <input type="email" name="email">
</label>
```
A correctly associated label means clicking the label focuses the input, and screen readers announce the label when the input is focused.

**Interactive elements — pick the right element for the job:**
```html
<!-- Navigates to a URL -->
<a href="/about">About us</a>

<!-- Triggers an action (open modal, copy text, toggle setting) -->
<button type="button">Save changes</button>

<!-- Submits a form -->
<button type="submit">Send message</button>
```
Never use `<div onclick="...">` when `<button>` exists. Buttons are keyboard-focusable, can be activated with Enter or Space, are announced as buttons by screen readers, and get all the right behaviour for free. Reaching for `<div>` means re-implementing all of that — and almost everyone gets it wrong.

### Common mistakes / gotchas

- **`<section>` is not a generic container.** Only use it if the content has a heading. When in doubt, use `<div>` — there's no penalty for an unstyled `<div>`, but there is a penalty for a meaningless `<section>` polluting the document outline.
- **`<article>` should be portable.** A blog post, yes — copy-paste it into another site and it still makes sense. A sidebar widget, no.
- **Don't pick heading levels for visual size.** Use CSS for that. An `<h3>` styled to look like an `<h1>` confuses screen reader users navigating by heading level.
- **`<button>` vs `<a>`.** If clicking it goes somewhere with a URL, use `<a>`. If it triggers an action on the current page, use `<button>`. Right-click → "Open in new tab" should work on links and not on buttons; that's a quick test.
- **Never use `<table>` for layout.** Tables are for tabular data — rows and columns of related values. Using them for page layout breaks screen reader navigation, which announces "table with N rows" and reads cell-by-cell.

---

## 🔗 Related Topics
- [HTML Basics](../01-foundations/03-html-basics.md) — the foundation this builds on
- [Accessibility](04-accessibility.md) — why semantics matter for real users
- [CSS Layout](02-css-layout.md) — layout without needing class names on every div

# HTML Basics

## 🗺️ Where This Fits
> Phase 1 → Foundations | Previous: [HTTP & Browsers](02-http-and-browsers.md) | Next: [CSS Basics](04-css-basics.md)

## ⚡ TL;DR
- HTML describes the **structure** of a page — *what's there*, not *how it looks*.
- Every piece of HTML is an **element**: an opening tag + content + closing tag, e.g. `<p>Hello</p>`.
- A valid HTML document always has `<!DOCTYPE html>`, `<html>`, `<head>`, and `<body>`.
- The `<head>` is for **metadata** the browser needs (title, CSS links, etc.) — users don't see it directly.
- **Attributes** give elements extra info: `<a href="https://example.com">Click me</a>`.

---

## 📖 Deep Dive

### What is it?

HTML stands for **HyperText Markup Language**. The crucial thing to understand: **HTML is not a programming language**. There are no variables, no loops, no logic. It's a *description* language — you're telling the browser, "here is a paragraph, here is a heading, here is an image."

That's it. HTML is the skeleton of every web page — the bones underneath whatever colourful skin CSS gives it.

Here is a **complete, valid HTML document**:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
  </head>
  <body>
    <h1>Hello, World!</h1>
    <p>This is a paragraph.</p>
  </body>
</html>
```

Walking through line by line:

- **`<!DOCTYPE html>`** — tells the browser "this is modern HTML5." Always include it.
- **`<html lang="en">`** — the root element. `lang="en"` tells assistive tech (and search engines) the page is in English.
- **`<head>`** — metadata block. Anything here is *about* the page; it isn't shown in the page body.
- **`<meta charset="UTF-8">`** — the page uses UTF-8 text encoding. Without it, characters like `é` or `日` may break.
- **`<meta name="viewport" ...>`** — the magic line that makes pages look right on phones.
- **`<title>`** — the text shown in the browser tab.
- **`<body>`** — everything visible on the page goes here.
- **`<h1>`**, **`<p>`** — a top-level heading and a paragraph.

### Why does it work this way?

Tim Berners-Lee invented HTML in 1989 to share scientific papers between physicists at CERN. He based it on **SGML** (Standard Generalised Markup Language), a format publishers had been using for years to describe printed documents.

That history explains a lot:

- HTML is **document-oriented**, not application-oriented. The original use case was "papers with links to other papers" — not "Twitter."
- HTML is **forgiving**. If your tags are slightly broken, the browser will *try its best* to render the page anyway, because closing a `<p>` was considered a typo, not a crash. (This is why "view source" on real-world pages can look terrifying — browsers tolerate a lot.)

Modern HTML is enormously more capable, but the philosophy is the same: describe content; let CSS handle appearance and JavaScript handle behaviour.

### How to use it

Here are the building blocks you'll use constantly.

#### Text

```html
<h1>Main Heading</h1>
<h2>Sub Heading</h2>
<p>A paragraph of text.</p>
<strong>Bold text</strong>
<em>Italic text</em>
```

There are six heading levels, `<h1>` through `<h6>`. Use them in order — don't skip from `<h1>` to `<h4>` just because you like the size.

#### Links and images

```html
<a href="https://example.com">Visit Example</a>
<a href="/about">About page</a>           <!-- relative link -->
<img src="photo.jpg" alt="A description of the photo">
```

`<a>` is an *anchor* — the original "hypertext" of the web. The `href` is the URL it links to. `<img>` embeds an image; `src` is the source URL, and `alt` is text describing the image.

#### Lists

```html
<ul>  <!-- unordered (bullets) -->
  <li>Apples</li>
  <li>Bananas</li>
</ul>

<ol>  <!-- ordered (numbers) -->
  <li>First step</li>
  <li>Second step</li>
</ol>
```

`<ul>` for "unordered list" (bullet points), `<ol>` for "ordered list" (numbered). Each item is an `<li>`.

#### Containers

```html
<div>Block container — takes up full width</div>
<span>Inline container — sits within text</span>
```

`<div>` is a generic block-level box; `<span>` is a generic inline box. They have no meaning of their own — they're just hooks you can style with CSS or grab with JavaScript.

#### Common attributes

- **`class`** — a label for grouping elements you want to style or select. Many elements can share a class.
- **`id`** — a unique label for one specific element. Only one element on a page can have a given `id`.
- **`href`** — link target on `<a>`.
- **`src`** — source URL on `<img>`, `<script>`, etc.
- **`alt`** — alternative text on `<img>`.
- **`type`** — type of input on `<input>` (`text`, `email`, `password`, etc.).

### Common mistakes / gotchas

- **`<div>` and `<span>` have no meaning.** They're just wrappers. Whenever a more meaningful element exists (like `<nav>`, `<article>`, `<button>`), prefer it. We'll cover this in depth in *HTML Semantics* in Phase 2.
- **`id` must be unique on the page.** Two elements with the same `id` is invalid HTML, and JavaScript will only find the first one.
- **Always include `alt` on images.** Screen readers read it aloud, search engines use it, and it shows when the image fails to load. Decorative images can use `alt=""` to indicate "no description needed."
- **Some tags are self-closing.** `<img>`, `<input>`, `<br>`, `<hr>`, `<meta>`, `<link>` don't have a closing tag — they're complete by themselves.

---

## 🔗 Related Topics
- [CSS Basics](04-css-basics.md) — how to style the HTML you just wrote.
- [HTML Semantics](../02-frontend/01-html-semantics.md) — going deeper: meaningful elements like `<article>`, `<nav>`, and `<section>`.

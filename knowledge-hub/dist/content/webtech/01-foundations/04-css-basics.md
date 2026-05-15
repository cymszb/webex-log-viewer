# CSS Basics

## 🗺️ Where This Fits
> Phase 1 → Foundations | Previous: [HTML Basics](03-html-basics.md) | Next: [Dev Tools](05-dev-tools.md)

## ⚡ TL;DR
- **CSS** (Cascading Style Sheets) controls how HTML *looks* — colour, font, size, spacing, layout.
- A CSS rule = **selector** (what to target) + **declarations** (what to change): `p { color: red; }`.
- The **box model**: every element is a rectangle — content inside, then **padding**, then **border**, then **margin** outside.
- The **cascade**: when multiple rules apply to the same element, **specificity** and **order** decide which wins.
- **Separation of concerns:** HTML = structure, CSS = presentation. That's why CSS lives in a separate `.css` file.

---

## 📖 Deep Dive

### What is it?

CSS stands for **Cascading Style Sheets**. It's a *rules-based* language. Each rule basically says: **"For elements matching this description, apply these visual properties."**

You almost always link CSS to HTML from the `<head>` of your document:

```html
<head>
  <link rel="stylesheet" href="styles.css">
</head>
```

And here's what a small `styles.css` looks like, with annotations:

```css
/* This is a comment */

/* Selector: all <p> elements */
p {
  color: #333;        /* text colour */
  font-size: 16px;    /* text size */
  line-height: 1.6;   /* space between lines */
}

/* Selector: elements with class="highlight" */
.highlight {
  background-color: yellow;
}

/* Selector: the element with id="title" */
#title {
  font-size: 2rem;
  font-weight: bold;
}
```

Three flavours of selector are visible above:

- **`p`** — element selector (every `<p>` on the page).
- **`.highlight`** — class selector (anything with `class="highlight"`).
- **`#title`** — ID selector (the one element with `id="title"`).

### Why does it work this way?

Before CSS, styling was done *inside* HTML using attributes like `<font color="red">` and `<center>`. It was a nightmare. Every element had to be styled individually. Wanted to change every heading from blue to green? Edit hundreds of tags by hand.

CSS arrived in **1996** to fix this by **separating presentation from structure**. Suddenly you could change one rule in one file and update an entire site instantly.

There's a running joke in developer circles: CSS — despite being the right idea — took so long to be consistently implemented across browsers that it frustrated an entire generation of web developers. Internet Explorer alone was responsible for countless gray hairs. The inconsistency is mostly solved now, but the memories are long.

### How to use it

#### The box model

This is the single most important concept in CSS. **Every element is a rectangle.** That rectangle is built up in four layers:

```
+-------------------------------------+
|              MARGIN                 |   ← space outside the box
|   +-----------------------------+   |
|   |          BORDER             |   |   ← the visible edge
|   |   +---------------------+   |   |
|   |   |       PADDING       |   |   |   ← breathing room inside
|   |   |   +-------------+   |   |   |
|   |   |   |   CONTENT   |   |   |   |   ← the actual stuff
|   |   |   +-------------+   |   |   |
|   |   +---------------------+   |   |
|   +-----------------------------+   |
+-------------------------------------+
```

A worked example:

```css
.card {
  width: 300px;            /* content width */
  padding: 20px;           /* space inside the border */
  border: 1px solid #ccc;  /* the border itself */
  margin: 10px;            /* space outside the border */

  /* Fix: make width include padding+border */
  box-sizing: border-box;
}
```

#### Common properties

```css
/* Colours */
color: red;
color: #ff0000;
color: rgb(255, 0, 0);

/* Text */
font-family: 'Arial', sans-serif;
font-size: 18px;
font-weight: bold;
text-align: center;

/* Box */
width: 100%;
height: 200px;
max-width: 800px;
padding: 16px;
margin: 0 auto;       /* centers a block element horizontally */
border-radius: 8px;

/* Background */
background-color: #f5f5f5;
background-image: url('image.jpg');
```

#### The cascade and specificity — which rule wins?

When multiple rules target the same element, the browser uses **specificity** to pick a winner. From most specific to least:

1. **Inline styles** (highest): `<p style="color: red">`
2. **ID selectors:** `#title { color: blue }`
3. **Class selectors:** `.highlight { color: green }`
4. **Element selectors** (lowest): `p { color: black }`

When two rules have **equal specificity**, the one that appears **later in the CSS** wins. This is why you sometimes see CSS files where the order of rules matters more than you'd think.

### Common mistakes / gotchas

- **Default `width` doesn't include padding and border.** A box with `width: 200px; padding: 20px; border: 2px solid` is actually 244px wide. Fix this once for your whole site:
  ```css
  * { box-sizing: border-box; }
  ```
  Now `width` means total width, like you'd intuitively expect.
- **Margin collapse.** When two block elements stack vertically, their margins **don't add** — the larger one wins. So `margin-bottom: 20px` next to `margin-top: 30px` produces a 30px gap, *not* 50px. (Horizontal margins don't do this. Just vertical.)
- **`!important` is a trap.** Adding `!important` to a rule overrides everything. It's tempting when something "just won't change," but each `!important` makes the next problem harder to fix. Treat it as a last resort.
- **Use `rem` for font sizes when you can.** `px` is absolute and ignores user font-size preferences. `rem` is relative to the root font size, so it scales with accessibility settings. Better for users who need larger text.

---

## 🔗 Related Topics
- [HTML Basics](03-html-basics.md) — the structure CSS is styling.
- [CSS Layout](../02-frontend/02-css-layout.md) — Flexbox and Grid for arranging elements.
- [Responsive Design](../02-frontend/03-responsive-design.md) — adapting CSS for different screen sizes.
- [Dev Tools](05-dev-tools.md) — how to inspect and tweak CSS live in the browser.

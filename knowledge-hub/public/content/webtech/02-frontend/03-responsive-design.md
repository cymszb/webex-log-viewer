# Responsive Design

## 🗺️ Where This Fits
> Phase 2 → Frontend | Previous: [CSS Layout](02-css-layout.md) | Next: [Accessibility](04-accessibility.md)

## ⚡ TL;DR
- Responsive design means one website that looks good on phones, tablets, and desktops — not separate sites
- The viewport meta tag (`<meta name="viewport" content="width=device-width, initial-scale=1">`) is required or mobile browsers zoom out
- Media queries apply CSS rules only when the screen matches a condition: `@media (min-width: 768px) { ... }`
- Mobile-first: write styles for small screens first, then add larger-screen overrides with `min-width` media queries
- Use relative units: `%` for widths, `rem` for font sizes, `vw`/`vh` for viewport-relative sizes

---

## 📖 Deep Dive

### What is it?

A responsive website uses CSS to adapt its layout to whatever screen it's viewed on — the same HTML, just different styles depending on screen width. A phone might get a single-column stack of cards; a tablet, two columns; a desktop, three columns with a sidebar. The content doesn't change, only the presentation.

The mechanism is the **media query**: a CSS rule that only applies when a condition about the viewing environment is true (most commonly, "the screen is at least N pixels wide").

### Why does it work this way?

In 2010, Ethan Marcotte coined the term "Responsive Web Design" in an *A List Apart* article. Before that, the standard approach was to build entirely separate mobile sites at `m.example.com` — twice the code, twice the maintenance, and the user often got the wrong version. The **mobile-first** approach (designing for phones first, then progressively enhancing for larger screens) was popularised by Luke Wroblewski in his 2011 book of the same name.

Today over half of all web traffic is mobile, and Google uses **mobile-first indexing** — meaning Google's crawler primarily looks at your mobile site to decide your search ranking. Building for mobile first isn't just nice; it's the default expectation.

### How to use it

#### Step 1 — Add the viewport meta tag to every page

```html
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
```
Without this, mobile browsers pretend the screen is 980px wide and zoom out, making everything tiny. This single line is non-negotiable.

#### Step 2 — Write base styles for mobile (no media query needed)

```css
/* Mobile styles — the default */
.container {
  width: 100%;
  padding: 0 16px;
}

.card-grid {
  display: grid;
  grid-template-columns: 1fr;  /* 1 column on mobile */
  gap: 16px;
}
```

#### Step 3 — Add larger-screen overrides with `min-width` queries

```css
/* Tablet and up */
@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);  /* 2 columns */
  }
}

/* Desktop and up */
@media (min-width: 1200px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;  /* center the container */
  }

  .card-grid {
    grid-template-columns: repeat(3, 1fr);  /* 3 columns */
  }
}
```
Each query *adds on top of* the previous styles — you only describe what changes at each breakpoint.

#### Relative units — the building blocks of fluid layouts

```css
/* rem = relative to the root font size (usually 16px) */
h1 { font-size: 2rem;     }  /* 32px */
p  { font-size: 1rem;     }  /* 16px */
small { font-size: 0.875rem; } /* 14px */

/* % = relative to the parent's width */
.sidebar { width: 30%; }
.main    { width: 70%; }

/* vw / vh = relative to the viewport */
.hero   { height: 100vh; }  /* full screen height */
.banner { width:  100vw; }  /* full viewport width — see gotcha below re: scrollbar */
```

#### The automatic responsive grid (no media queries needed)

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
}
```
Read it like an English sentence: "make as many columns as fit, each at least 250px wide, each taking an equal share of any leftover space." Resize the window — columns appear and disappear automatically.

### Common mistakes / gotchas

- **The viewport meta tag is not optional.** Without it, mobile browsers render at 980px width and scale down — your gorgeously responsive CSS does nothing because the browser is faking a desktop screen.
- **Don't use desktop-first (`max-width`) media queries.** They mean "undo the desktop styles for smaller screens" and they get tangled fast. Mobile-first (`min-width`) means "add styles as the screen grows" — much easier to reason about.
- **`100vw` includes the scrollbar width on some browsers**, which can cause unwanted horizontal scrolling. For content widths, prefer `width: 100%`.
- **Text set in `px` doesn't scale** when the user changes their browser's base font size in accessibility settings. Use `rem` for typography so people who need bigger text can get it.
- **Images need `max-width: 100%`** (or `width: 100%; height: auto;`) to prevent them overflowing their container on narrow screens. A simple global `img { max-width: 100%; height: auto; }` rule saves a lot of pain.

---

## 🔗 Related Topics
- [CSS Layout](02-css-layout.md) — Flexbox and Grid that you're making responsive
- [CSS Basics](../01-foundations/04-css-basics.md) — the selector and property knowledge this builds on
- [Accessibility](04-accessibility.md) — responsive and accessible often go hand in hand

# CSS Layout

## 🗺️ Where This Fits
> Phase 2 → Frontend | Previous: [HTML Semantics](01-html-semantics.md) | Next: [Responsive Design](03-responsive-design.md)

## ⚡ TL;DR
- Flexbox arranges items in **one direction** — either a row or a column
- Grid arranges items in **two dimensions** — rows AND columns simultaneously
- Use Flexbox for components (nav bar, button group, card contents); use Grid for page layouts (header/sidebar/main/footer)
- The hardest thing to learn: centering. The answer is almost always `display: flex; justify-content: center; align-items: center`
- Both Flexbox and Grid replaced the old hacks (floats, tables, inline-block) that developers used for layout before 2015

---

## 📖 Deep Dive

### What is it?

CSS Layout is the set of techniques for arranging boxes on a page. Modern CSS gives you two purpose-built layout systems:

- **Flexbox** = `display: flex` on a *parent* element. All direct children become "flex items" and lay out in a single row or single column.
- **Grid** = `display: grid` on a *parent* element. You define rows and columns (a 2D grid), and children get placed into the cells.

A useful analogy: Flexbox is like arranging books on a single shelf — you control the spacing and alignment along that one shelf. Grid is like organising books into a bookcase with rows AND columns of shelves, where you control both dimensions at once.

### Why does it work this way?

Before Flexbox (widely usable around 2012) and Grid (2017), developers used `float`, negative margins, and `display: table-cell` for layouts. Vertical centering was so hard it became a meme — you had to know the exact pixel height of the element. These were all hacks; the CSS spec never intended `float` to be used for general layout (it was originally for wrapping text around images, like in a magazine).

Flexbox was designed specifically for one-dimensional UI components (a row of buttons, a vertical stack of form fields). Grid was designed for full two-dimensional page layouts (the classic header / sidebar / main / footer arrangement). They're complementary, not competing — most real apps use both, with Grid for the outer page skeleton and Flexbox inside individual components.

### How to use it

#### Flexbox

```css
.container {
  display: flex;
  flex-direction: row;            /* default: items in a row */
  justify-content: space-between; /* space items along main axis */
  align-items: center;            /* center items on cross axis */
  gap: 16px;                      /* space between items */
  flex-wrap: wrap;                /* allow items to wrap to next line */
}

/* Option A: grow equally to fill available space */
.item {
  flex: 1;
}

/* Option B: fixed 200px wide, don't grow or shrink */
.item {
  flex: 0 0 200px;
}
```

**Practical recipes:**
- **Nav bar** (logo on the left, links on the right): `display: flex; justify-content: space-between; align-items: center`
- **Centering anything** (horizontally and vertically): `display: flex; justify-content: center; align-items: center`
- **Equal-width cards in a row**: `display: flex; gap: 16px` on the parent, with each card set to `flex: 1`

**`justify-content` values** (main axis — horizontal in a row):
- `flex-start` — pack items at the start
- `flex-end` — pack items at the end
- `center` — pack items in the middle
- `space-between` — first/last items at the edges, equal space between
- `space-around` — equal space around every item (edge gaps half the size of inner gaps)
- `space-evenly` — equal space everywhere, including the edges

**`align-items` values** (cross axis — vertical in a row):
- `flex-start`, `flex-end`, `center` — same idea, perpendicular axis
- `stretch` (default) — items stretch to fill the container's height
- `baseline` — align items so their text baselines line up

#### Grid

```css
.page-layout {
  display: grid;
  grid-template-columns: 250px 1fr;   /* sidebar + main */
  grid-template-rows: auto 1fr auto;  /* header + content + footer */
  gap: 16px;
  min-height: 100vh;
}

/* Place items by line numbers */
header { grid-column: 1 / -1; }  /* span from line 1 to the last line */
footer { grid-column: 1 / -1; }
```

**Named areas — much more readable for page layouts:**
```css
.page-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  min-height: 100vh;
}

header { grid-area: header; }
aside  { grid-area: sidebar; }
main   { grid-area: main; }
footer { grid-area: footer; }
```
You can literally see the layout in the CSS.

**A practical card grid:**
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
```

**The `fr` unit** = a fraction of the *available* space. `1fr 2fr` gives the first column 1/3 of the width and the second 2/3. Unlike percentages, `fr` automatically accounts for `gap` and any fixed-width tracks.

### Common mistakes / gotchas

- **`justify-content` and `align-items` swap meaning when `flex-direction: column`.** The "main axis" becomes vertical and the "cross axis" becomes horizontal. When in doubt: open DevTools and enable the Flexbox overlay — it labels both axes for you.
- **`flex: 1` is shorthand for `flex: 1 1 0`** — it makes items grow AND shrink AND start from a base size of 0. That's usually what you want for "equal width" layouts, but it can surprise you when items have intrinsic sizes.
- **Grid has its own alignment system.** `justify-items` and `align-items` on the grid container control how items sit *inside their cells*. Don't confuse these with `justify-content`/`align-content`, which distribute the tracks themselves within the container — that's a different operation.
- **Grid `gap` only applies *between* tracks, not at the outer edges.** Use `padding` on the container if you want outer spacing too.
- **Magic responsive grid:** `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))` automatically wraps columns to fit the available width — every column at least 200px, taking equal shares of whatever's left over. Memorise this one.

---

## 🔗 Related Topics
- [CSS Basics](../01-foundations/04-css-basics.md) — the box model and selectors this builds on
- [Responsive Design](03-responsive-design.md) — making these layouts work on mobile
- [Dev Tools](../01-foundations/05-dev-tools.md) — DevTools has flex/grid overlays for debugging

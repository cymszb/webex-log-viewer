# Accessibility

## 🗺️ Where This Fits
> Phase 2 → Frontend | Previous: [Responsive Design](03-responsive-design.md) | Next: [Phase 3 → JS Fundamentals](../03-javascript/01-js-fundamentals.md)

## ⚡ TL;DR
- Accessibility (a11y) means your website works for everyone — including people using screen readers, keyboard-only navigation, or with visual/motor/cognitive impairments
- Semantic HTML is 80% of accessibility — use the right element for the job
- Every image needs an `alt` attribute; every form input needs a `<label>`
- Keyboard navigation must work — you should be able to use your entire site with just the Tab key
- Colour contrast matters: text needs a 4.5:1 contrast ratio against its background to be readable by people with low vision

---

## 📖 Deep Dive

### What is it?

Web accessibility — abbreviated **a11y** (because there are 11 letters between the "a" and "y") — is the practice of removing barriers that prevent people with disabilities from using your website. Around 15% of people worldwide live with some form of disability: visual (low vision, blindness, colour blindness), motor (limited use of a mouse, tremors), auditory (deaf or hard of hearing), or cognitive (dyslexia, ADHD, memory difficulties).

The Web Content Accessibility Guidelines (WCAG) organise accessibility around four principles, known as **POUR**:
- **Perceivable** — users can perceive the content through at least one of their senses (text alternatives for images, captions for video)
- **Operable** — users can operate the interface (keyboard support, no time limits that can't be extended)
- **Understandable** — users can understand the content and how to use the UI (clear language, predictable behaviour)
- **Robust** — content works with current and future assistive technology (valid HTML, standard ARIA usage)

### Why does it work this way?

Tim Berners-Lee, the inventor of the web, said: *"The power of the Web is in its universality. Access by everyone regardless of disability is an essential aspect."* The W3C's Web Accessibility Initiative (WAI) has been publishing accessibility guidelines since 1999.

Accessibility is also a legal requirement in many places. In the US, the Americans with Disabilities Act (ADA) has been interpreted by the courts to apply to websites — Domino's Pizza, Target, Netflix, and many others have been sued for inaccessible sites. The European Accessibility Act has similar requirements. Beyond the law, accessible sites are usually better for everyone: captions help in noisy environments, semantic HTML helps SEO, and keyboard support helps power users.

### How to use it

#### 1. Page language — always declare it

```html
<!-- Tells screen readers which language voice/pronunciation to use -->
<html lang="en">

<!-- For inline foreign text, use lang on the element -->
<p>The French call it <span lang="fr">raison d'être</span>.</p>
```
This is WCAG Level A (the minimum bar) and takes 2 seconds. Without it, a French screen reader will try to read your English page with French phonetics — genuinely unusable.

#### 2. Alt text for images

```html
<!-- Informative image: describe what it conveys -->
<img src="team-photo.jpg"
     alt="The Acme Corp team of 12 people at the 2024 company picnic">

<!-- Decorative image: empty alt so screen readers skip it -->
<img src="divider-line.png" alt="">

<!-- Functional image (icon button): describe the action, not the icon -->
<button>
  <img src="search-icon.svg" alt="Search">
</button>
```
Rule of thumb: if removing the image would lose information, write alt text. If removing it would lose nothing (it's purely decorative), use `alt=""` so screen readers don't announce a meaningless filename.

#### 3. Skip links — help keyboard users jump past navigation

```html
<!-- This must be the very first link in <body> -->
<a href="#main-content" class="sr-only sr-only--focusable">Skip to main content</a>

<nav><!-- navigation here --></nav>

<main id="main-content">
  <!-- main content here -->
</main>
```

```css
/* Make the skip link visible only when focused */
.sr-only--focusable:focus {
  position: static;
  width: auto;
  height: auto;
  clip: auto;
  white-space: normal;
}
```
Keyboard users must Tab through every navigation link on every page load before reaching the content — skip links let them jump straight to `<main>`. Screen reader users can navigate by landmarks, but keyboard-only users can't.

#### 4. Labels for form inputs

```html
<!-- Bad: no label, just a placeholder -->
<input type="email" placeholder="Email">

<!-- Good: explicit label tied via for/id -->
<label for="email">Email address</label>
<input type="email" id="email" name="email">

<!-- Also good: implicit label that wraps the input -->
<label>
  Email address
  <input type="email" name="email">
</label>
```

#### 5. Focus styles — never remove them

```css
/* Bad: removes focus indication entirely */
*:focus { outline: none; }

/* Good: replace the default with something more visible */
*:focus {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}
```
Without a focus indicator, keyboard users have no idea where they are on the page. If you don't like the default browser ring, replace it — don't delete it.

#### 6. ARIA — only when HTML isn't enough

```html
<!-- aria-label: when there's no visible text -->
<button aria-label="Close dialog">×</button>

<!-- aria-hidden: hide decorative content from screen readers -->
<span aria-hidden="true">★★★★☆</span>
<span class="sr-only">4 out of 5 stars</span>

<!-- role: only when forced to use a non-interactive element -->
<div role="button" tabindex="0" onclick="..." onkeydown="...">
  Click me
</div>
<!-- Better: just use <button> and skip all of this -->
```

The "screen-reader only" pattern hides text visually but keeps it available to assistive tech:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

#### 7. Test with the keyboard only

Unplug your mouse and try to use your site:
- **Tab** — move focus forward through interactive elements
- **Shift+Tab** — move focus backward
- **Enter** — activate buttons and links
- **Space** — check/uncheck checkboxes, activate buttons
- **Escape** — close modals and dropdowns
- **Arrow keys** — navigate within a component (radio group, select menu)

Every interactive element must be reachable, clearly focused, and usable. If you can't use a feature with the keyboard, neither can a screen reader user, a power user, or someone with a motor disability.

### Common mistakes / gotchas

- **ARIA is a supplement to HTML, not a replacement.** `<button>` is always better than `<div role="button">` — you get keyboard support, focus management, and the right semantics for free. The first rule of ARIA is "don't use ARIA when a native HTML element would do."
- **`placeholder` is not a label.** It disappears when the user starts typing, has poor contrast, and screen readers don't always announce it. Always use a real `<label>`.
- **`tabindex` is dangerous.** `tabindex="0"` makes any element keyboard-focusable. `tabindex="-1"` removes it from the tab order (useful for elements you focus programmatically with JS). **Never use values above 0** — they create a custom tab order that overrides the natural document order, and it's almost always confusing.
- **Don't rely on colour alone.** "Required fields are red" fails for ~8% of men with red-green colour blindness. Pair colour with an icon, label, or pattern.
- **Test with a real screen reader.** NVDA (Windows, free), JAWS (Windows, paid), VoiceOver (Mac/iOS, built-in), TalkBack (Android, built-in). Five minutes of using your own site with VoiceOver will teach you more than an hour of reading WCAG.

---

## 🔗 Related Topics
- [HTML Semantics](01-html-semantics.md) — the foundation of accessible markup
- [DOM Manipulation](../03-javascript/02-dom-manipulation.md) — adding ARIA attributes dynamically

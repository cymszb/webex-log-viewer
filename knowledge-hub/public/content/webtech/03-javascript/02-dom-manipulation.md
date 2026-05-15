# DOM Manipulation

## 🗺️ Where This Fits
> Phase 3 → JavaScript | Previous: [JS Fundamentals](01-js-fundamentals.md) | Next: [Async JavaScript](03-async-javascript.md)

## ⚡ TL;DR
- The DOM (Document Object Model) is the browser's live JavaScript representation of your HTML page — a tree of objects you can read and modify
- `document.querySelector('.my-class')` selects the first matching element; `document.querySelectorAll()` selects all
- Change content with `.textContent` (safe) or `.innerHTML` (powerful but risky)
- Add/remove CSS classes with `.classList.add()`, `.classList.remove()`, `.classList.toggle()`
- Listen for user actions with `.addEventListener('click', handler)` — events fire when users interact

---

## 📖 Deep Dive

### What is it?
When the browser parses your HTML, it doesn't just display it — it builds a tree of JavaScript objects called the DOM. Every element is a node; every node has properties (its text, styles, attributes) and methods (ways to interact with it).

```html
<body>
  <header>
    <h1 id="title">Hello</h1>
  </header>
  <main>
    <p class="intro">Welcome</p>
  </main>
</body>
```

This HTML becomes a tree: `document` → `body` → `header`/`main` → `h1`/`p` → text nodes.

### Why does it work this way?
Early JavaScript used `getElementById()` and `getElementsByTagName()` — APIs from the 1990s that are still supported but verbose and inconsistent. `querySelector()` was added in 2008 because developers were already using CSS selector syntax to describe elements — it made sense to use the same syntax in JS.

### How to use it

*Selecting elements:*
```javascript
// Select by CSS selector (returns first match)
const title = document.querySelector('#title');
const intro = document.querySelector('.intro');
const allLinks = document.querySelectorAll('a');

// Older but still common
const titleOld = document.getElementById('title');
```

*Reading and writing content:*
```javascript
const title = document.querySelector('h1');

// Read text content
title.textContent;           // → "Hello"

// Write text content (safe — no HTML parsed)
title.textContent = 'Hi there!';

// Write HTML (powerful but dangerous with user input)
title.innerHTML = 'Hello <em>World</em>';
```

*Changing styles and classes:*
```javascript
const box = document.querySelector('.box');

// Direct style (use sparingly — prefer classes)
box.style.backgroundColor = 'red';
box.style.fontSize = '24px';

// Classes (the right approach)
box.classList.add('active');
box.classList.remove('hidden');
box.classList.toggle('expanded');     // add if absent, remove if present
box.classList.contains('active');     // → true/false
```

*Creating and removing elements:*
```javascript
// Create a new element
const li = document.createElement('li');
li.textContent = 'New item';

// Add to the DOM
const list = document.querySelector('ul');
list.appendChild(li);                // add at end
list.prepend(li);                    // add at start

// Remove an element
li.remove();
```

*Events:*
```javascript
const button = document.querySelector('button');

// Add an event listener
button.addEventListener('click', function(event) {
  console.log('Button clicked!');
  console.log(event.target);    // the element that was clicked
});

// Common events: click, submit, input, change, mouseover, keydown, keyup, load, DOMContentLoaded

// Prevent default behaviour (e.g., stop form submission)
const form = document.querySelector('form');
form.addEventListener('submit', function(event) {
  event.preventDefault();
  // Now handle the form with JavaScript
});
```

*Complete example — a to-do list:*
```html
<input id="task-input" placeholder="Enter a task">
<button id="add-btn">Add</button>
<ul id="task-list"></ul>

<script>
  const input = document.querySelector('#task-input');
  const button = document.querySelector('#add-btn');
  const list = document.querySelector('#task-list');

  button.addEventListener('click', function() {
    const text = input.value.trim();
    if (!text) return;            // ignore empty input

    const li = document.createElement('li');
    li.textContent = text;

    // Click to delete
    li.addEventListener('click', function() {
      li.remove();
    });

    list.appendChild(li);
    input.value = '';             // clear the input
  });
</script>
```

### Common mistakes / gotchas
- `innerHTML` lets users inject HTML — if you set `element.innerHTML = userInput`, an attacker can inject `<script>` tags. Always use `textContent` for user-provided strings.
- Querying the DOM is relatively expensive — cache selections in variables: `const btn = document.querySelector('button')` once, not on every click
- Event listeners accumulate — if you call `addEventListener` multiple times on the same element with the same handler, you get multiple listeners. Remove them with `removeEventListener` when no longer needed
- `document.querySelector()` returns `null` if nothing matches — always check before calling methods on the result
- The `DOMContentLoaded` event fires when HTML is fully parsed (but before images/CSS load). Use it to ensure your JS runs after the DOM is ready: `document.addEventListener('DOMContentLoaded', init)`

---

## 🔗 Related Topics
- [JS Fundamentals](01-js-fundamentals.md) — the language you're using to manipulate the DOM
- [Async JavaScript](03-async-javascript.md) — DOM updates often happen in response to async events
- [Dev Tools](../01-foundations/05-dev-tools.md) — inspect DOM changes live in the Elements panel

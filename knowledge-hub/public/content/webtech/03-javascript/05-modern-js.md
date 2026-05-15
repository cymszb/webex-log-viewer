# Modern JS (ES6+)

## 🗺️ Where This Fits
> Phase 3 → JavaScript | Previous: [Fetch & APIs](04-fetch-and-apis.md) | Next: [Phase 4 → How Servers Work](../04-backend/01-how-servers-work.md)

## ⚡ TL;DR
- ES6 (2015) and later versions added syntax that makes JavaScript shorter, clearer, and less error-prone
- Arrow functions: `const add = (a, b) => a + b` — concise and don't have their own `this`
- Destructuring: `const { name, age } = user` — extract values from objects/arrays in one line
- Template literals: `` `Hello, ${name}!` `` — embed expressions in strings
- Spread (`...`) copies arrays/objects; Rest (`...args`) collects function arguments into an array

---

## 📖 Deep Dive

### What is it?
JavaScript is a living language — new features are added every year through the TC39 standards process. "Modern JS" usually refers to ES6 (2015) and later. These features are supported in all modern browsers and Node.js.

### Why does it work this way?
Before ES6, JS lacked features that developers in other languages took for granted — proper block scope, modules, arrow functions, template strings. Many of these were added after years of use of third-party libraries (like Underscore/Lodash for utilities) that showed what developers actually needed. The annual release cadence since ES2015 keeps the language evolving without the 6-year gap between ES3 and ES5.

### How to use it

*Arrow functions:*
```javascript
// Traditional function
function add(a, b) { return a + b; }

// Arrow function — same thing, shorter
const add = (a, b) => a + b;

// Single parameter — parens optional
const double = n => n * 2;

// Multi-line body needs curly braces and explicit return
const greet = (name) => {
  const message = `Hello, ${name}!`;
  return message;
};

// Arrow functions don't have their own `this`
// This matters in callbacks and object methods (see gotchas)
```

*Template literals:*
```javascript
const name = 'Yuan';
const age = 30;

// Old way (messy)
const msgOld = 'Hello, ' + name + '! You are ' + age + ' years old.';

// Template literal (clean)
const msg = `Hello, ${name}! You are ${age} years old.`;

// Multi-line strings
const html = `
  <div class="card">
    <h2>${name}</h2>
    <p>Age: ${age}</p>
  </div>
`;

// Expressions, not just variables
const price = 9.99;
const tax = `Price with tax: $${(price * 1.2).toFixed(2)}`;
```

*Destructuring:*
```javascript
// Object destructuring
const user = { name: 'Yuan', age: 30, city: 'London' };
const { name, age } = user;      // name = 'Yuan', age = 30
const { name: userName } = user; // rename: userName = 'Yuan'
const { name, ...rest } = user;  // rest = { age: 30, city: 'London' }

// Array destructuring
const [first, second, ...others] = [1, 2, 3, 4, 5];
// first = 1, second = 2, others = [3, 4, 5]

// In function parameters (very common in React)
function displayUser({ name, age }) {
  return `${name} is ${age}`;
}

// Swapping variables
let a = 1, b = 2;
[a, b] = [b, a]; // a = 2, b = 1
```

*Default parameters:*
```javascript
function greet(name = 'World') {
  return `Hello, ${name}!`;
}

greet('Yuan');  // → 'Hello, Yuan!'
greet();        // → 'Hello, World!'
```

*Spread and Rest:*
```javascript
// Spread: expand an array/object
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];   // [1, 2, 3, 4, 5, 6]

const obj1 = { a: 1, b: 2 };
const obj2 = { c: 3, d: 4 };
const merged = { ...obj1, ...obj2 };   // { a: 1, b: 2, c: 3, d: 4 }

// Clone and override
const updated = { ...user, age: 31 };  // same as user but age is 31

// Rest: collect remaining arguments
function sum(...numbers) {
  // reduce: start at 0, add each number to the running total
  return numbers.reduce((total, n) => total + n, 0);
}
sum(1, 2, 3, 4, 5);  // → 15
```

*Optional chaining and nullish coalescing:*
```javascript
// Optional chaining: safely access deeply nested properties
const user = { profile: { avatar: null } };
user.profile.avatar?.url;   // → undefined (instead of TypeError)
user.address?.city;         // → undefined (instead of TypeError)
user.greet?.();             // → undefined (if greet doesn't exist)

// Nullish coalescing: fallback for null/undefined (not 0 or '')
const displayName = user.name ?? 'Anonymous';     // 'Anonymous' if null/undefined
const timeout = config.timeout ?? 3000;           // 3000 if timeout is null/undefined

// Compare to || which treats 0 and '' as falsy:
const countWithOr = 0 || 10;    // → 10 (probably wrong — 0 is a valid value here)
const countWithNull = 0 ?? 10;  // → 0  (correct — 0 is not null/undefined)
```

*Modules:*
```javascript
// math.js — named exports
export function add(a, b) { return a + b; }
export function multiply(a, b) { return a * b; }
export const PI = 3.14159;

// Default export (one per file)
export default function calculate(a, b) { return a + b; }

// app.js — importing
import { add, multiply, PI } from './math.js';
import calculate from './math.js';              // default import
import * as math from './math.js';              // import everything as object
import { add as sum } from './math.js';          // rename on import
```

To use modules in a browser, the script tag needs `type="module"`:

```html
<script type="module" src="app.js"></script>
```

### Common mistakes / gotchas
- Arrow functions don't have their own `this` — inside an arrow function, `this` refers to the enclosing scope. This is intentional and useful in callbacks, but breaks when used as object methods that need to refer to the object itself
- Destructuring silently gives you `undefined` if the property doesn't exist — `const { missing } = obj` gives `missing = undefined` with no error
- `...spread` on objects performs a *shallow* copy — nested objects are still references: `const copy = { ...user }; copy.address.city = 'Paris'` also changes `user.address.city`
- Modules don't work with `file://` URLs (opening HTML directly from the file system) — you need a local server. Use VS Code's Live Server extension or `npx serve .`
- `??` vs `||`: use `??` when `0`, `false`, or `''` are valid values. Use `||` only when you want to treat all falsy values as "missing"

---

## 🔗 Related Topics
- [JS Fundamentals](01-js-fundamentals.md) — the foundation these features build on
- [Async JavaScript](03-async-javascript.md) — async/await uses arrow functions throughout

# JavaScript Fundamentals

## 🗺️ Where This Fits
> Phase 3 → JavaScript | Previous: [Phase 2 → Accessibility](../02-frontend/04-accessibility.md) | Next: [DOM Manipulation](02-dom-manipulation.md)

## ⚡ TL;DR
- JavaScript is the only programming language that runs natively in browsers — it's what makes pages interactive
- Variables: use `const` for values that won't be reassigned, `let` for values that will. Avoid `var`.
- Functions are reusable chunks of code — write once, call many times, with different inputs
- Arrays hold ordered lists; objects hold key-value pairs — the two most-used data structures
- JavaScript is single-threaded but non-blocking — it handles one thing at a time, but queues async work so the page doesn't freeze

---

## 📖 Deep Dive

### What is it?
JavaScript (JS) is a programming language — unlike HTML (structure) and CSS (style), it adds *behaviour*. It can respond to user actions, modify HTML/CSS on the fly, fetch data, store information, and much more.

JS runs in the browser (and on servers via Node.js). It's dynamically typed — you don't declare variable types.

Analogy: HTML is a house's structure, CSS is the paint and furniture, JavaScript is the electricity — it makes things turn on, move, and respond.

### Why does it work this way?
Brendan Eich created JavaScript in 10 days in 1995 for Netscape, originally called Mocha, then LiveScript. The name "Java" was a marketing decision — the two languages are unrelated. Early JS was famously quirky (`typeof null === 'object'`, anyone?). ES6 in 2015 was the first major modernisation. New features are added annually via TC39, the standards body.

### How to use it

*Variables:*
```javascript
const name = 'Yuan';      // can't be reassigned
let count = 0;            // can be reassigned
count = count + 1;        // OK
count++;                  // shorthand

// const doesn't mean immutable — objects/arrays can still be mutated
const user = { name: 'Yuan' };
user.name = 'Alice';      // fine — the binding didn't change
user = {};                // ❌ TypeError: assignment to constant variable
```

*Functions:*
```javascript
// Function declaration (hoisted — can be called before it's defined)
function greet(name) {
  return `Hello, ${name}!`;
}

// Function expression (not hoisted)
const greet = function(name) {
  return `Hello, ${name}!`;
};

// Arrow function (concise, and doesn't have its own `this` — `this` refers to the object a method is called on — you'll use it more once you're writing object methods)
const greet = (name) => `Hello, ${name}!`;

// Calling a function
console.log(greet('Yuan')); // → Hello, Yuan!
```

*Arrays:*
```javascript
const fruits = ['apple', 'banana', 'cherry'];

// Accessing elements
fruits[0];           // → 'apple' (zero-indexed)
fruits.length;       // → 3

// Adding / removing
fruits.push('date');          // add to end
fruits.pop();                 // remove from end
fruits.unshift('avocado');    // add to start
fruits.shift();               // remove from start

// Transforming (these return new arrays — they don't mutate the original)
const upper = fruits.map(f => f.toUpperCase());
const long = fruits.filter(f => f.length > 5);
const first = fruits.find(f => f.startsWith('b'));

// Iterating
fruits.forEach(f => console.log(f));
```

*Objects:*
```javascript
const user = {
  name: 'Yuan',
  age: 30,
  isAdmin: false,
  address: {
    city: 'London',
    country: 'UK'
  }
};

// Accessing properties
user.name;              // → 'Yuan' (dot notation)
user['name'];           // → 'Yuan' (bracket notation — use for dynamic keys)
user.address.city;      // → 'London'

// Adding / updating
user.email = 'yuan@example.com';
user.age = 31;

// Checking if a property exists
'email' in user;        // → true
user.phone === undefined;  // → true (phone doesn't exist)
```

*Scope:*
```javascript
const globalVar = 'I am global';

function myFunction() {
  const localVar = 'I am local';
  console.log(globalVar); // ✅ can access global
  console.log(localVar);  // ✅ can access local
}

console.log(localVar); // ❌ ReferenceError: localVar is not defined
```

*The event loop (plain English):*
JavaScript is single-threaded — it can only do one thing at a time. But it's also non-blocking — when it starts a slow operation (like fetching data), it moves on to other code and comes back when the operation finishes. This is managed by the event loop: a queue of callbacks waiting to run when the call stack is empty.

### Common mistakes / gotchas
- `==` does type coercion: `0 == false` is `true`. Always use `===` (strict equality)
- `typeof null === 'object'` — a bug from 1995 that can never be fixed for backwards compatibility
- `const` prevents reassignment, not mutation — arrays and objects declared with `const` can still have their contents changed
- Hoisting: function declarations are moved to the top of their scope. Variables declared with `let`/`const` are not — accessing them before declaration throws a `ReferenceError`
- `NaN !== NaN` — use `Number.isNaN(value)` to check for NaN, not `value === NaN`

---

## 🔗 Related Topics
- [DOM Manipulation](02-dom-manipulation.md) — using JS to interact with the page
- [Modern JS (ES6+)](05-modern-js.md) — the cleaner syntax you'll use in practice
- [Async JavaScript](03-async-javascript.md) — the event loop in depth

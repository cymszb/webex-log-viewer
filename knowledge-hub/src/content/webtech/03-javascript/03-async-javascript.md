# Async JavaScript

## 🗺️ Where This Fits
> Phase 3 → JavaScript | Previous: [DOM Manipulation](02-dom-manipulation.md) | Next: [Fetch & APIs](04-fetch-and-apis.md)

## ⚡ TL;DR
- JavaScript is single-threaded — it does one thing at a time. Async code lets you start slow operations without freezing the page
- Callbacks were the original solution — "call this function when done" — but they nest badly ("callback hell")
- Promises represent a value that will arrive in the future — chain `.then()` and `.catch()` to handle success/failure
- `async/await` is modern syntactic sugar over Promises — it makes async code read like synchronous code
- `Promise.all([...])` runs multiple async operations in parallel and waits for all of them

---

## 📖 Deep Dive

### What is it?
Synchronous code runs top to bottom, one line at a time, blocking everything while it runs. Async code starts an operation and moves on — the result comes back later via a callback, promise, or await.

Analogy: Synchronous cooking = make toast, wait until done, then make coffee, wait until done. Async cooking = start the coffee machine AND put bread in the toaster, do other things while they brew/toast, handle them as they finish.

### Why does it work this way?
JavaScript was designed for the browser — freezing the browser while waiting for a network request would make it unusable. The event loop model (callbacks → event queue → call stack) solves this. Promises were standardised in ES6 (2015) to replace the messiness of nested callbacks. `async/await` was added in ES8 (2017) as a more readable layer on top of Promises — it's just Promises under the hood.

### How to use it

*The problem with callbacks:*
```javascript
// Callback hell — each step depends on the previous
getUserData(userId, function(user) {
  getPosts(user.id, function(posts) {
    getComments(posts[0].id, function(comments) {
      // The pyramid of doom
    });
  });
});
```

*Promises:*
```javascript
// A promise is in one of three states: pending, fulfilled, rejected

function wait(ms) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, ms);    // resolve after ms milliseconds
  });
}

wait(1000)
  .then(function() {
    console.log('1 second passed!');
    return wait(1000);    // return another promise to chain
  })
  .then(function() {
    console.log('2 seconds passed!');
  })
  .catch(function(error) {
    console.error('Something went wrong:', error);
  });
```

*async/await (the modern way):*
```javascript
// async function always returns a Promise
async function loadUserData(userId) {
  try {
    const user = await getUser(userId);           // waits for the promise
    const posts = await getPosts(user.id);        // then waits for this one
    return { user, posts };
  } catch (error) {
    console.error('Failed to load data:', error);
    throw error;    // re-throw if the caller needs to handle it
  }
}

// Calling an async function
loadUserData(123).then(data => console.log(data));

// Or use await in another async function
async function init() {
  const data = await loadUserData(123);
  console.log(data);
}
```

*Running multiple operations in parallel:*
```javascript
// Sequential (slow — waits for each before starting the next)
const user = await getUser(1);
const settings = await getSettings(1);

// Parallel (fast — starts both at the same time)
const [user, settings] = await Promise.all([
  getUser(1),
  getSettings(1)
]);
```

*setTimeout and setInterval:*
```javascript
// Run once after a delay
setTimeout(() => console.log('Fired!'), 2000);  // after 2 seconds

// Run repeatedly at an interval
const intervalId = setInterval(() => {
  console.log('Tick!');
}, 1000);  // every 1 second

clearInterval(intervalId);  // stop it
```

### Common mistakes / gotchas
- `async` functions always return a Promise — `async function foo() { return 42 }` returns `Promise<42>`, not `42`
- You can only use `await` inside an `async` function — using it at the top level requires a module or a wrapper `async` function (or top-level await in modern environments)
- An unhandled Promise rejection crashes Node.js (and logs a warning in browsers) — always `.catch()` or wrap with `try/catch`
- `async/await` doesn't make code faster — it makes it easier to read. The underlying operations take the same time
- Forgetting `await` is a classic bug: `const user = getUser(1)` gives you a Promise object, not the user data. Always await async functions.

---

## 🔗 Related Topics
- [JS Fundamentals](01-js-fundamentals.md) — the event loop mental model that makes async make sense
- [Fetch & APIs](04-fetch-and-apis.md) — the most common real-world use of async/await

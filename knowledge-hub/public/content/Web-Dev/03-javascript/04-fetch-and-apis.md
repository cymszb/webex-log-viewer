# Fetch & APIs

## 🗺️ Where This Fits
> Phase 3 → JavaScript | Previous: [Async JavaScript](03-async-javascript.md) | Next: [Modern JS (ES6+)](05-modern-js.md)

## ⚡ TL;DR
- `fetch(url)` makes an HTTP request from JavaScript and returns a Promise
- APIs are URLs that return structured data (JSON) instead of HTML — they're the "backend" you talk to from the frontend
- `fetch` doesn't throw on 4xx/5xx errors — always check `response.ok` before using the data
- JSON is a text format for data: `JSON.parse()` converts text → object, `JSON.stringify()` converts object → text
- CORS errors happen when a browser blocks a request to a different domain — this is the server's problem to fix, not yours

---

## 📖 Deep Dive

### What is it?
`fetch()` is the browser's built-in function for making HTTP requests. It returns a Promise that resolves to a Response object. You then call `.json()` (another Promise) to parse the body.

API = Application Programming Interface. A web API is just a URL that returns data (usually JSON) instead of a web page. `https://api.github.com/users/torvalds` returns JSON about a GitHub user, not an HTML page.

### Why does it work this way?
Before `fetch` (introduced 2015), developers used `XMLHttpRequest` (XHR) — a verbose, callback-based API from 1999. jQuery's `$.ajax()` was more popular because it hid XHR's complexity. `fetch` was designed as the modern replacement: Promise-based, cleaner API, works with `async/await`.

### How to use it

*Basic GET request:*
```javascript
// Using .then()
fetch('https://jsonplaceholder.typicode.com/posts/1')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log(data);
    // { userId: 1, id: 1, title: '...', body: '...' }
  })
  .catch(error => console.error('Fetch failed:', error));

// Using async/await (cleaner)
async function getPost(id) {
  try {
    const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get post:', error);
    throw error;
  }
}
```

*POST request (sending data):*
```javascript
async function createPost(title, body) {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, userId: 1 }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json();
}
```

*JSON:*
```javascript
// JSON looks like a JavaScript object but it's a STRING
const jsonString = '{"name": "Yuan", "age": 30}';

// Parse JSON string into a JavaScript object
const obj = JSON.parse(jsonString);
obj.name;  // → 'Yuan'

// Convert a JavaScript object into a JSON string
const person = { name: 'Yuan', age: 30 };
const json = JSON.stringify(person);
// → '{"name":"Yuan","age":30}'

// Pretty-print (useful for debugging)
console.log(JSON.stringify(person, null, 2));
// {
//   "name": "Yuan",
//   "age": 30
// }
```

*Complete example — display posts from an API:*
```html
<button id="load-btn">Load Posts</button>
<ul id="posts-list"></ul>

<script>
  document.querySelector('#load-btn').addEventListener('click', async () => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const posts = await response.json();
      const list = document.querySelector('#posts-list');

      list.innerHTML = '';  // clear previous results
      posts.forEach(post => {
        const li = document.createElement('li');
        li.textContent = post.title;
        list.appendChild(li);
      });
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  });
</script>
```

### Common mistakes / gotchas
- `fetch` only rejects (throws) on network failure — a `404` or `500` response is NOT an error to `fetch`, it's a successful HTTP transaction. Always check `response.ok` before calling `.json()`
- You must `await` twice: once for the fetch (network), once for `.json()` (parsing the body stream)
- CORS errors ("Access to fetch from origin 'x' has been blocked"): this is the server not sending CORS headers. You can't fix it from the browser. The API must allow your origin. Exception: your own backend — you control the CORS settings there.
- `response.json()` fails if the response body isn't valid JSON — handle this in your catch block
- Don't `await` every fetch in a loop — use `Promise.all()` to run them in parallel

---

## 🔗 Related Topics
- [Async JavaScript](03-async-javascript.md) — the Promise foundation fetch is built on
- [HTTP & Browsers](../01-foundations/02-http-and-browsers.md) — the HTTP methods and status codes fetch uses
- [REST APIs](../04-backend/03-rest-apis.md) — how the APIs you're fetching from are built

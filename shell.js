// shell.js — platform nav + routing

const ICONS = {
  log: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>`,
  book: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`
};

let tools = [];

function getActiveToolId() {
  const params = new URLSearchParams(location.search);
  const id = params.get('tool');
  if (id && tools.find(t => t.id === id)) return id;
  return tools[0]?.id || '';
}

function activateTool(id, pushState = true) {
  const tool = tools.find(t => t.id === id);
  if (!tool) return;

  // Update iframe
  document.getElementById('tool-frame').src = tool.src;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // Update page title
  document.title = tool.label + ' — Webex Tools';

  if (pushState) {
    history.pushState({ tool: id }, '', '?tool=' + id);
  }
}

function renderNav(tools) {
  const rail = document.getElementById('nav-rail');
  const bar  = document.getElementById('nav-bar');

  const makeItem = (tool, includeLabel) => {
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.dataset.id = tool.id;
    btn.setAttribute('aria-label', tool.label);
    btn.innerHTML = (ICONS[tool.icon] || '') +
      (includeLabel ? `<span class="nav-label">${tool.label}</span>` : '') +
      (!includeLabel ? `<span class="nav-tooltip">${tool.label}</span>` : '');
    btn.addEventListener('click', () => activateTool(tool.id));
    return btn;
  };

  tools.forEach(tool => {
    rail.appendChild(makeItem(tool, false));
    bar.appendChild(makeItem(tool, true));
  });

  // Settings placeholder (rail only)
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'nav-item nav-settings';
  settingsBtn.setAttribute('aria-label', 'Settings');
  settingsBtn.setAttribute('aria-disabled', 'true');
  settingsBtn.innerHTML = ICONS.settings + '<span class="nav-tooltip">Settings</span>';
  rail.appendChild(settingsBtn);
}

// Boot
fetch('tools.json')
  .then(r => r.json())
  .then(data => {
    tools = data;
    renderNav(tools);
    activateTool(getActiveToolId(), false);
  });

// Back/forward
window.addEventListener('popstate', e => {
  const id = (e.state && e.state.tool) || getActiveToolId();
  activateTool(id, false);
});

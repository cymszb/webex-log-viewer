// static/api.js
// localStorage-backed adapter replacing the Flask API.
// All async functions return the same data shapes as the Flask endpoints.

(function () {
  const TOPICS_KEY = 'webex-log-viewer:topics';

  // ── Helpers ──────────────────────────────────────────────────────────────

  function readStore() {
    try {
      const raw = localStorage.getItem(TOPICS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
      return null;
    } catch { return null; }
  }

  function readStoreOrEmpty() {
    return readStore() || { groups: [], topics: [] };
  }

  function writeStore(data) {
    try {
      localStorage.setItem(TOPICS_KEY, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showStorageWarning();
      }
      throw e;
    }
  }

  function showStorageWarning() {
    const existing = document.getElementById('storage-warning-banner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'storage-warning-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#7f1d1d;color:#fca5a5;padding:8px 16px;text-align:center;z-index:9999;font-size:13px;';
    banner.textContent = '⚠ Storage is full. Topic changes cannot be saved. Export your topics to avoid losing them.';
    document.body.prepend(banner);
  }

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── Seeding ───────────────────────────────────────────────────────────────

  async function seedIfEmpty() {
    if (readStore() !== null) return;
    try {
      const defaults = await fetch('/topics.json').then(r => r.json());
      writeStore(defaults);
    } catch {
      // fetch failed (e.g. file://) — start with empty state, show fallback button
      writeStore({ groups: [], topics: [] });
      showLoadDefaultsButton();
    }
  }

  function showLoadDefaultsButton() {
    const btn = document.getElementById('btn-load-defaults');
    if (btn) btn.style.display = '';
  }

  // ── Topics ────────────────────────────────────────────────────────────────

  async function getTopics() {
    await seedIfEmpty();
    const data = readStore();
    return {
      groups: data.groups || [],
      topics: data.topics || [],
    };
  }

  async function createTopic(topic) {
    const data = readStoreOrEmpty();
    const newTopic = { ...topic, id: generateId(), events: topic.events || [] };
    data.topics.push(newTopic);
    writeStore(data);
    return newTopic;
  }

  async function updateTopic(id, topic) {
    const data = readStoreOrEmpty();
    const idx = data.topics.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Topic not found: ' + id);
    data.topics[idx] = { ...data.topics[idx], ...topic };
    writeStore(data);
    return data.topics[idx];
  }

  async function deleteTopic(id) {
    const data = readStoreOrEmpty();
    data.topics = data.topics.filter(t => t.id !== id);
    writeStore(data);
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async function createEvent(topicId, event) {
    const data = readStoreOrEmpty();
    const topic = data.topics.find(t => t.id === topicId);
    if (!topic) throw new Error('Topic not found: ' + topicId);
    if (!topic.events) topic.events = [];
    const newEvent = { ...event, id: generateId() };
    topic.events.push(newEvent);
    writeStore(data);
    return newEvent;
  }

  async function updateEvent(topicId, eventId, event) {
    const data = readStoreOrEmpty();
    const topic = data.topics.find(t => t.id === topicId);
    if (!topic) throw new Error('Topic not found: ' + topicId);
    const idx = (topic.events || []).findIndex(e => e.id === eventId);
    if (idx === -1) throw new Error('Event not found: ' + eventId);
    topic.events[idx] = { ...topic.events[idx], ...event };
    writeStore(data);
    return topic.events[idx];
  }

  async function deleteEvent(topicId, eventId) {
    const data = readStoreOrEmpty();
    const topic = data.topics.find(t => t.id === topicId);
    if (!topic) throw new Error('Topic not found: ' + topicId);
    topic.events = (topic.events || []).filter(e => e.id !== eventId);
    writeStore(data);
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  async function createGroup(group) {
    const data = readStoreOrEmpty();
    const newGroup = { ...group, id: generateId() };
    if (!data.groups) data.groups = [];
    data.groups.push(newGroup);
    writeStore(data);
    return newGroup;
  }

  async function updateGroup(id, group) {
    const data = readStoreOrEmpty();
    const idx = (data.groups || []).findIndex(g => g.id === id);
    if (idx === -1) throw new Error('Group not found: ' + id);
    data.groups[idx] = { ...data.groups[idx], ...group };
    writeStore(data);
    return data.groups[idx];
  }

  async function deleteGroup(id) {
    const data = readStoreOrEmpty();
    data.groups = (data.groups || []).filter(g => g.id !== id);
    writeStore(data);
  }

  // ── Log (in-memory) ───────────────────────────────────────────────────────

  // Ported from app.py parse_line() (lines 192-239)
  const LOG_PATTERN = /^(\S+)\s+<(\w+)>\s+\[(\d+):(0x[\da-fA-F]+|\d+)\]\[[^\]]*\]([^\s:]+):(\d+)\s+(.*)/;

  function parseLine(raw, index) {
    const m = LOG_PATTERN.exec(raw);
    if (!m) {
      return {
        index,
        timestamp: '',
        level: 'UNKNOWN',
        pid: '',
        tid: '',
        source_file: '',
        line_num: '',
        class_method: '',
        message: raw.trim(),
        raw: true,
      };
    }
    const [, timestamp, level, pid, tid, source_file, line_num, rest] = m;
    const fullParts = rest.split('::');
    let class_method, message;
    if (fullParts.length >= 3) {
      class_method = fullParts[0] + '::' + fullParts[1];
      message = fullParts.slice(2).join('::');
    } else if (fullParts.length === 2) {
      class_method = fullParts[0] + '::' + fullParts[1];
      message = '';
    } else {
      class_method = '';
      message = rest;
    }
    return {
      index,
      timestamp,
      level,
      pid,
      tid,
      source_file,
      line_num,
      class_method,
      message: message.trim(),
      raw: false,
    };
  }

  let _loadedLogs = [];

  async function loadLog(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target.result;
        const lines = text.split('\n');
        _loadedLogs = lines
          .filter(l => l.trim().length > 0)
          .map((l, i) => parseLine(l, i));
        resolve({ lines: _loadedLogs.length });
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async function getLogs() {
    return { logs: _loadedLogs };
  }

  // ── Export / Import ───────────────────────────────────────────────────────

  function exportTopics() {
    const data = readStore() || { groups: [], topics: [] };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'topics.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importTopics(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          if (!Array.isArray(data.topics)) throw new Error('Invalid topics.json: missing topics array');
          writeStore(data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async function loadDefaultTopics() {
    const defaults = await fetch('/topics.json').then(r => r.json());
    writeStore(defaults);
    return defaults;
  }

  // ── Expose on window ──────────────────────────────────────────────────────

  window.api = {
    getTopics,
    loadDefaultTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    createEvent,
    updateEvent,
    deleteEvent,
    createGroup,
    updateGroup,
    deleteGroup,
    loadLog,
    getLogs,
    exportTopics,
    importTopics,
  };
})();

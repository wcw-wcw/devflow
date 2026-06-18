import { invoke as tauriInvokeCore } from '@tauri-apps/api/core';

const STORE = 'devflow_v3';
const COLORS = ['#185FA5','#639922','#D85A30','#854F0B','#534AB7','#993556','#0F6E56','#5F5E5A'];
const API_BASE = location.protocol.startsWith('http') ? '' : null;

function tauriInvoke() {
  return window.__TAURI_INTERNALS__ ? tauriInvokeCore : null;
}

function load() {
  try {
    const d = localStorage.getItem(STORE);
    if (d) return JSON.parse(d);
  } catch(e) {}
  return defaults();
}

function defaults() {
  const now = Date.now();
  return {
    projects: [
      { id:'p1', name:'portfolio-site', type:'github', url:'https://github.com/you/portfolio', color:'#185FA5', desc:'Personal portfolio and blog', stack:'Next.js, Tailwind, MDX' },
      { id:'p2', name:'api-backend', type:'local', url:'~/projects/api', color:'#639922', desc:'Node.js REST API', stack:'Node.js, Express, PostgreSQL' }
    ],
    tasks: [
      { id:'t1', text:'Fix nav mobile breakpoint', projId:'p1', priority:'high', done:false, created:now-86400000 },
      { id:'t2', text:'Write auth endpoint docs', projId:'p2', priority:'normal', done:false, created:now-3600000 },
      { id:'t3', text:'Set up CI/CD pipeline', projId:'p2', priority:'high', done:false, created:now },
      { id:'t4', text:'Add rate limiting middleware', projId:'p2', priority:'normal', done:true, created:now-172800000 }
    ],
    notes: [
      { id:'n1', title:'API auth design', projId:'p2', tag:'feature', body:'## JWT approach\n\nAccess token: 15 min. Refresh token: 7 days, stored in httpOnly cookie.\n\n## Rate limiting\n\n- 100 req/min per IP (unauthenticated)\n- 1000 req/min for auth users\n\n## Redis plan\n\nUse Redis for:\n- Session storage\n- Token blacklist on logout\n- Rate limit counters\n\n## TODO\n- [ ] Add token rotation on refresh\n- [ ] Implement logout-all-devices', created:now-86400000, updated:now-3600000 },
      { id:'n2', title:'Portfolio redesign notes', projId:'p1', tag:'idea', body:'## Visual direction\n\nClean dark theme. Monospace font for headings to lean into the dev aesthetic.\n\n## Sections\n1. Hero — animated terminal prompt\n2. Selected work — 3 case studies max\n3. Writing — latest 3 posts\n4. Contact\n\n## Stack\nNext.js 14 (App Router) + Tailwind + MDX for blog', created:now-172800000, updated:now-172800000 }
    ],
    commits: [
      { id:'c1', projId:'p2', hash:'a3f2c91', msg:'feat: add JWT authentication middleware', author:'you', branch:'main', date:now-7200000 },
      { id:'c2', projId:'p2', hash:'b71d4e3', msg:'fix: resolve CORS headers on preflight requests', author:'you', branch:'main', date:now-86400000 },
      { id:'c3', projId:'p1', hash:'c9a8f2d', msg:'style: update hero section responsive layout', author:'you', branch:'main', date:now-172800000 },
      { id:'c4', projId:'p2', hash:'d4b3e1c', msg:'refactor: extract route handlers into controllers', author:'you', branch:'dev', date:now-259200000 },
      { id:'c5', projId:'p1', hash:'e2f7a4b', msg:'feat: add blog RSS feed endpoint', author:'you', branch:'main', date:now-345600000 }
    ],
    files: {
      p1: {
        'README.md': { type:'file', content:'# portfolio-site\n\nPersonal portfolio built with Next.js 14 and Tailwind CSS.\n\n## Setup\n\n```bash\nnpm install\nnpm run dev\n```\n\nVisit http://localhost:3000\n\n## Deploy\n\nPush to main → auto-deploys to Vercel.' },
        src: { type:'dir', children: {
          components: { type:'dir', children: {
            'Nav.tsx': { type:'file', content:'import Link from "next/link";\n\nexport function Nav() {\n  return (\n    <nav className="flex items-center justify-between px-6 py-4 border-b">\n      <Link href="/" className="font-mono font-bold">you@portfolio:~$</Link>\n      <ul className="flex gap-8 text-sm">\n        <li><Link href="/work">Work</Link></li>\n        <li><Link href="/blog">Blog</Link></li>\n        <li><Link href="/about">About</Link></li>\n      </ul>\n    </nav>\n  );\n}' },
            'Hero.tsx': { type:'file', content:'export function Hero() {\n  return (\n    <section className="min-h-[80vh] flex flex-col justify-center px-6">\n      <p className="text-sm text-gray-500 mb-2 font-mono">Hi, I\'m</p>\n      <h1 className="text-5xl font-bold tracking-tight mb-4">Your Name</h1>\n      <p className="text-xl text-gray-600 max-w-prose">\n        I build things for the web — APIs, interfaces, and everything in between.\n      </p>\n    </section>\n  );\n}' }
          }},
          pages: { type:'dir', children: {
            'index.tsx': { type:'file', content:'import { Nav } from "@/components/Nav";\nimport { Hero } from "@/components/Hero";\n\nexport default function Home() {\n  return (\n    <main>\n      <Nav />\n      <Hero />\n    </main>\n  );\n}' }
          }}
        }},
        'package.json': { type:'file', content:'{\n  "name": "portfolio-site",\n  "version": "0.1.0",\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start"\n  },\n  "dependencies": {\n    "next": "14.0.0",\n    "react": "18.2.0",\n    "tailwindcss": "3.3.0"\n  }\n}' }
      },
      p2: {
        'README.md': { type:'file', content:'# api-backend\n\nREST API built with Node.js + Express + PostgreSQL.\n\n## Setup\n\n```bash\nnpm install\ncp .env.example .env\n# fill in DATABASE_URL and JWT_SECRET\nnpm run dev\n```\n\n## Endpoints\n\n| Method | Path | Auth |\n|--------|------|------|\n| POST | /auth/login | No |\n| POST | /auth/refresh | No |\n| GET | /users/me | Yes |\n| POST | /users/logout | Yes |' },
        src: { type:'dir', children: {
          routes: { type:'dir', children: {
            'auth.js': { type:'file', content:'const router = require("express").Router();\nconst jwt = require("jsonwebtoken");\nconst bcrypt = require("bcrypt");\nconst { User } = require("../models");\n\nrouter.post("/login", async (req, res) => {\n  const { email, password } = req.body;\n  const user = await User.findByEmail(email);\n  if (!user || !await bcrypt.compare(password, user.hash)) {\n    return res.status(401).json({ error: "Invalid credentials" });\n  }\n  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "15m" });\n  res.json({ token });\n});\n\nmodule.exports = router;' }
          }},
          middleware: { type:'dir', children: {
            'auth.js': { type:'file', content:'const jwt = require("jsonwebtoken");\n\nmodule.exports = function auth(req, res, next) {\n  const auth = req.headers.authorization;\n  if (!auth?.startsWith("Bearer ")) {\n    return res.status(401).json({ error: "No token" });\n  }\n  try {\n    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);\n    next();\n  } catch {\n    res.status(403).json({ error: "Invalid or expired token" });\n  }\n};' }
          }}
        }},
        'package.json': { type:'file', content:'{\n  "name": "api-backend",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "nodemon src/index.js",\n    "start": "node src/index.js"\n  },\n  "dependencies": {\n    "express": "^4.18.0",\n    "jsonwebtoken": "^9.0.0",\n    "bcrypt": "^5.1.0",\n    "pg": "^8.11.0"\n  }\n}' }
      }
    },
    settings: { author: 'you' }
  };
}

let db = load();
let currentPanel = 'overview';
let selectedNoteId = null;
let taskFilter = 'all';
let commitFilter = 'all';
let selectedColor = COLORS[0];
let noteAutoSave = null;
let serverBacked = false;
let fileContentCache = {};

async function api(path, options = {}) {
  const invoke = tauriInvoke();
  if (invoke) return tauriApi(invoke, path, options);
  if (!API_BASE) throw new Error('Local runtime is not available');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (window.fetch) {
    const res = await window.fetch(API_BASE + path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || 'GET', API_BASE + path);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || '{}'); } catch(e) {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || 'Request failed'));
    };
    xhr.onerror = () => reject(new Error('Local runtime request failed'));
    xhr.send(options.body || null);
  });
}

async function tauriApi(invoke, path, options = {}) {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : {};
  if (path === '/api/state' && method === 'GET') return invoke('load_state');
  if (path === '/api/state' && method === 'PUT') return invoke('save_state', { state: body });
  if (path === '/api/projects/inspect' && method === 'POST') return invoke('inspect_project', { repoPath: body.repoPath || '' });
  if (path === '/api/sync' && method === 'POST') return invoke('sync_workspace');
  if (path === '/api/ai/chat' && method === 'POST') return invoke('ollama_chat', body);
  const treeMatch = path.match(/^\/api\/projects\/([^/]+)\/tree$/);
  if (treeMatch && method === 'GET') return invoke('project_tree', { projectId: decodeURIComponent(treeMatch[1]) });
  const fileMatch = path.match(/^\/api\/projects\/([^/]+)\/file\?path=(.*)$/);
  if (fileMatch && method === 'GET') {
    return invoke('read_project_file', {
      projectId: decodeURIComponent(fileMatch[1]),
      path: decodeURIComponent(fileMatch[2] || '')
    });
  }
  throw new Error('Unknown local runtime route');
}

function setRuntimeStatus(text, live = serverBacked) {
  const badge = document.getElementById('runtime-badge');
  if (!badge) return;
  badge.innerHTML = `<span class="runtime-dot ${live ? 'live' : ''}"></span><span>${text}</span>`;
}

async function hydrateFromServer() {
  if (!API_BASE) return;
  try {
    const state = await api('/api/state');
    db = { projects:[], tasks:[], notes:[], commits:[], files:{}, settings:{ author:'you' }, ...state };
    serverBacked = true;
    localStorage.setItem(STORE, JSON.stringify(db));
    setRuntimeStatus('local runtime', true);
  } catch(e) {
    console.warn('DevFlow local runtime unavailable:', e.message || e);
    setRuntimeStatus('browser only', false);
  }
}

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(db)); } catch(e) {}
  if (serverBacked) api('/api/state', { method:'PUT', body: JSON.stringify(db) }).catch(() => setRuntimeStatus('save failed', false));
}

function proj(id) { return db.projects.find(p => p.id === id); }

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch]));
}

function safeColor(value, fallback = '#5F5E5A') {
  return /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : fallback;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  if (s < 604800) return Math.floor(s/86400) + 'd ago';
  return new Date(ts).toLocaleDateString();
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function randHash() { return Math.random().toString(16).slice(2, 9); }

// MODALS
function openModal(id) {
  if (id === 'modal-commit') populateCommitModal();
  document.getElementById(id).classList.add('open');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function bgClose(e, id) { if (e.target.classList.contains('modal-bg')) closeModal(id); }

// PANELS
function showPanel(name) {
  document.querySelectorAll('.panel, .panel-fill').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  const el = document.getElementById('panel-' + name);
  if (el) el.classList.add('active');
  const nav = document.getElementById('nav-' + name);
  if (nav) nav.classList.add('active');
  currentPanel = name;
  const labels = { overview:'Overview', agenda:'Agenda', notes:'Notes', commits:'Commits', files:'Files', ai:'AI Assistant' };
  document.getElementById('topbar-title').textContent = labels[name] || name;
  const actions = { overview:['ti-refresh','Refresh'], agenda:['ti-plus','Add task'], notes:['ti-plus','New note'], commits:['ti-git-commit','Log commit'], files:['ti-clipboard','Paste code'], ai:['ti-brain','Ask AI'] };
  const [icon, label] = actions[name] || ['ti-refresh','Refresh'];
  document.getElementById('topbar-action-btn').innerHTML = `<i class="ti ${icon}"></i> ${label}`;
  updateBadges();
  if (name === 'overview') renderOverview();
  if (name === 'agenda') { renderAgenda(); populateSelects(); }
  if (name === 'notes') { renderNotesSidebar(); populateSelects(); }
  if (name === 'commits') { renderCommits(); populateSelects(); }
  if (name === 'files') { renderFileProjSel(); renderFileTree(); }
  if (name === 'ai' && document.getElementById('ai-messages').children.length === 0) initAI();
}

function topbarAction() {
  if (currentPanel === 'agenda') document.getElementById('task-input').focus();
  else if (currentPanel === 'notes') newNote();
  else if (currentPanel === 'commits') openModal('modal-commit');
  else if (currentPanel === 'files') document.getElementById('paste-area').focus();
  else if (currentPanel === 'ai') document.getElementById('ai-input').focus();
  else refreshWorkspace();
}

function updateBadges() {
  const open = db.tasks.filter(t => !t.done).length;
  document.getElementById('badge-overview').textContent = db.projects.length;
  document.getElementById('badge-agenda').textContent = open;
  document.getElementById('badge-notes').textContent = db.notes.length;
  document.getElementById('badge-commits').textContent = db.commits.length;
  document.getElementById('badge-files').textContent = db.projects.length;
  document.getElementById('topbar-badge').textContent = { overview: db.projects.length + ' projects', agenda: open + ' open', notes: db.notes.length + ' notes', commits: db.commits.length + ' entries', files: db.projects.length + ' repos', ai: 'Ollama' }[currentPanel] || '';
}

async function refreshWorkspace() {
  if (!serverBacked) { renderOverview(); return; }
  setRuntimeStatus('syncing repos...', true);
  try {
    db = await api('/api/sync', { method:'POST', body:'{}' });
    localStorage.setItem(STORE, JSON.stringify(db));
    setRuntimeStatus('local runtime', true);
    renderSidebar();
    if (currentPanel === 'overview') renderOverview();
    if (currentPanel === 'commits') renderCommits();
    if (currentPanel === 'files') renderFileTree();
  } catch(e) {
    setRuntimeStatus(e.message || 'sync failed', false);
  }
}

// SIDEBAR
function renderSidebar() {
  const el = document.getElementById('proj-list');
  el.innerHTML = db.projects.map(p => `
    <div class="proj-sidebar-item" data-action="show-panel" data-panel="overview">
      <span class="proj-dot" style="background:${safeColor(p.color)}"></span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${esc(p.name)}</span>
      <span class="tag tag-${p.type==='github'?'blue':p.type==='local'?'green':'gray'}" style="font-size:9px;padding:1px 5px">${esc(p.type)}</span>
    </div>
  `).join('');

  // Color picker in modal
  const cp = document.getElementById('color-picker');
  if (cp) {
    cp.innerHTML = COLORS.map(c => `
      <div class="color-swatch ${c===selectedColor?'active':''}" style="background:${c}" data-action="pick-color" data-color="${c}"></div>
    `).join('');
  }

  populateSelects();
  updateBadges();
}

function populateSelects() {
  const selIds = ['task-proj','tf-proj','note-proj','note-filter-proj','commit-filter-proj','file-proj-sel'];
  selIds.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    const isFilter = ['tf-proj','note-filter-proj','commit-filter-proj'].includes(id);
    sel.innerHTML = `<option value="">${isFilter ? 'All projects' : 'No project'}</option>`;
    db.projects.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.name;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  });

  // Commit modal project select
  const cfs = document.getElementById('cf-proj');
  if (cfs) {
    const cur = cfs.value;
    cfs.innerHTML = '<option value="">No project</option>';
    db.projects.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.name;
      cfs.appendChild(o);
    });
    if (cur) cfs.value = cur;
  }
}

function pickColor(el, color) {
  selectedColor = color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
}

// PROJECT
function saveProject() {
  const name = document.getElementById('pf-name').value.trim();
  if (!name) { document.getElementById('pf-name').focus(); return; }
  const p = {
    id: 'p' + Date.now(),
    name,
    type: document.getElementById('pf-type').value,
    url: document.getElementById('pf-url').value.trim(),
    desc: document.getElementById('pf-desc').value.trim(),
    stack: document.getElementById('pf-stack').value.trim(),
    color: selectedColor,
    created: Date.now()
  };
  db.projects.push(p);
  if (!db.files) db.files = {};
  db.files[p.id] = { 'README.md': { type:'file', content: `# ${name}\n\n${p.desc || 'Add a description.'}` } };
  save();
  closeModal('modal-project');
  ['pf-name','pf-url','pf-desc','pf-stack'].forEach(id => document.getElementById(id).value = '');
  renderSidebar();
  renderOverview();
  if (serverBacked && p.type === 'local' && p.url) setTimeout(refreshWorkspace, 150);
}

async function inspectProjectPath() {
  if (!serverBacked) return;
  const url = document.getElementById('pf-url').value.trim();
  if (!url) { document.getElementById('pf-url').focus(); return; }
  setRuntimeStatus('inspecting path...', true);
  try {
    const info = await api('/api/projects/inspect', { method:'POST', body: JSON.stringify({ repoPath:url }) });
    document.getElementById('pf-type').value = 'local';
    if (!document.getElementById('pf-name').value.trim()) document.getElementById('pf-name').value = info.name || '';
    if (!document.getElementById('pf-stack').value.trim()) document.getElementById('pf-stack').value = info.stack || '';
    if (!document.getElementById('pf-desc').value.trim()) {
      document.getElementById('pf-desc').value = info.git?.isGit ? `Git repo on ${info.git.branch || 'current branch'}` : 'Local project folder';
    }
    document.getElementById('pf-url').value = info.url || url;
    setRuntimeStatus(info.git?.isGit ? 'git repo found' : 'local folder found', true);
  } catch(e) {
    setRuntimeStatus(e.message || 'inspect failed', false);
  }
}

function deleteProject(id) {
  if (!confirm('Delete this project and all its associated data? This cannot be undone.')) return;
  db.projects = db.projects.filter(p => p.id !== id);
  db.tasks = db.tasks.filter(t => t.projId !== id);
  db.notes = db.notes.filter(n => n.projId !== id);
  db.commits = db.commits.filter(c => c.projId !== id);
  delete db.files[id];
  save();
  renderSidebar();
  renderOverview();
}

// OVERVIEW
function renderOverview() {
  const openTasks = db.tasks.filter(t => !t.done);
  document.getElementById('stat-projects').textContent = db.projects.length;
  document.getElementById('stat-tasks').textContent = openTasks.length;
  document.getElementById('stat-notes').textContent = db.notes.length;
  document.getElementById('stat-commits').textContent = db.commits.length;

  // Recent commits
  const rc = [...db.commits].sort((a,b) => b.date - a.date).slice(0,5);
  document.getElementById('ov-commits').innerHTML = rc.length ? rc.map(c => {
    const p = proj(c.projId);
    const type = c.msg.split(':')[0];
    const typeColors = {feat:'green',fix:'red',refactor:'purple',style:'blue',docs:'amber',chore:'gray'};
    const tc = typeColors[type] || 'gray';
    return `<div class="commit-item">
      <code class="commit-hash">${esc(c.hash)}</code>
      <div style="flex:1">
        <div class="commit-msg">${esc(c.msg)}</div>
        <div class="commit-meta">${p ? `<span style="color:${safeColor(p.color)}">${esc(p.name)}</span> · ` : ''}${c.branch ? esc(c.branch) + ' · ' : ''}${timeAgo(c.date)}</div>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state" style="padding:20px"><i class="ti ti-git-commit"></i><p>No commits yet</p></div>';

  // Tasks
  document.getElementById('ov-tasks').innerHTML = openTasks.length ? openTasks.slice(0,5).map(t => {
    const p = proj(t.projId);
    return `<div class="agenda-item" style="margin-bottom:6px">
      <div class="agenda-check" data-action="toggle-task" data-id="${esc(t.id)}"></div>
      <div style="flex:1">
        <div class="agenda-text">${esc(t.text)}</div>
        <div class="agenda-meta">${p ? `<span style="color:${safeColor(p.color)}">${esc(p.name)}</span>` : ''}${t.priority==='high' ? '<span class="tag tag-red">High</span>' : ''}</div>
      </div>
    </div>`;
  }).join('') : '<div class="empty-state" style="padding:20px"><i class="ti ti-checklist"></i><p>All clear!</p></div>';

  // Projects
  document.getElementById('ov-projects').innerHTML = db.projects.length ? db.projects.map(p => {
    const taskCount = db.tasks.filter(t => t.projId === p.id && !t.done).length;
    const commitCount = db.commits.filter(c => c.projId === p.id).length;
    const noteCount = db.notes.filter(n => n.projId === p.id).length;
    const last = [...db.commits].filter(c => c.projId === p.id).sort((a,b) => b.date-a.date)[0];
    const typeMap = { github:'blue', local:'green', gitlab:'amber', other:'gray' };
    const stack = p.stack ? p.stack.split(',').slice(0,3).map(s => `<span class="tag tag-gray" style="font-size:10px">${esc(s.trim())}</span>`).join(' ') : '';
    const gitBits = p.git?.isGit ? `<span class="tag tag-${p.git.dirty ? 'amber' : 'green'}" style="font-size:10px">${p.git.dirty ? p.git.dirty + ' changed' : 'clean'}</span><span class="tag tag-gray" style="font-size:10px">${p.git.branch || 'git'}</span>` : '';
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:var(--radius-md);cursor:default;margin-bottom:2px;border-bottom:0.5px solid var(--border-light)">
      <span class="proj-dot" style="background:${safeColor(p.color)};width:10px;height:10px;flex-shrink:0"></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;margin-bottom:2px">${esc(p.name)}</div>
        <div style="font-size:11px;color:var(--text-tertiary)">${esc(p.desc || p.url || '')}</div>
        ${stack || gitBits ? `<div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">${stack} ${gitBits}</div>` : ''}
      </div>
      <div style="display:flex;gap:14px;font-size:12px;color:var(--text-secondary);text-align:center">
        <div><div style="font-size:16px;font-weight:600">${taskCount}</div><div style="font-size:10px;color:var(--text-tertiary)">open</div></div>
        <div><div style="font-size:16px;font-weight:600">${commitCount}</div><div style="font-size:10px;color:var(--text-tertiary)">commits</div></div>
        <div><div style="font-size:16px;font-weight:600">${noteCount}</div><div style="font-size:10px;color:var(--text-tertiary)">notes</div></div>
      </div>
      <div style="text-align:right;min-width:80px">
        <span class="tag tag-${typeMap[p.type]||'gray'}">${esc(p.type)}</span>
        <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">${last ? timeAgo(last.date) : 'No commits'}</div>
      </div>
      <button class="btn btn-sm btn-danger" data-action="delete-project" data-id="${esc(p.id)}" title="Delete project"><i class="ti ti-trash"></i></button>
    </div>`;
  }).join('') : `<div class="empty-state"><i class="ti ti-folder-plus"></i><p>No projects yet</p><div class="sub">Add your first project to get started</div></div>`;
}

// AGENDA
function renderAgenda() {
  let tasks = [...db.tasks].sort((a,b) => {
    const pw = {high:0,normal:1,low:2};
    if (!a.done && b.done) return -1;
    if (a.done && !b.done) return 1;
    return (pw[a.priority]||1) - (pw[b.priority]||1) || b.created - a.created;
  });
  if (taskFilter === 'open') tasks = tasks.filter(t => !t.done);
  else if (taskFilter === 'done') tasks = tasks.filter(t => t.done);
  else if (taskFilter === 'high') tasks = tasks.filter(t => t.priority === 'high');
  const projF = document.getElementById('tf-proj')?.value;
  if (projF) tasks = tasks.filter(t => t.projId === projF);

  const el = document.getElementById('agenda-list');
  if (!tasks.length) {
    el.innerHTML = '<div class="empty-state"><i class="ti ti-checklist"></i><p>No tasks here</p></div>';
    return;
  }
  el.innerHTML = tasks.map(t => {
    const p = proj(t.projId);
    const pColors = {high:'red',low:'gray',normal:''};
    const pc = pColors[t.priority];
    return `<div class="agenda-item">
      <div class="agenda-check ${t.done?'done':''}" data-action="toggle-task" data-id="${esc(t.id)}">${t.done?'<i class="ti ti-check"></i>':''}</div>
      <div style="flex:1">
        <div class="agenda-text ${t.done?'done-text':''}">${esc(t.text)}</div>
        <div class="agenda-meta">
          ${p ? `<span style="color:${safeColor(p.color)}">● ${esc(p.name)}</span>` : ''}
          <span>${timeAgo(t.created)}</span>
          ${t.priority==='high' ? '<span class="tag tag-red" style="font-size:10px">High</span>' : ''}
          ${t.priority==='low' ? '<span class="tag tag-gray" style="font-size:10px">Low</span>' : ''}
        </div>
      </div>
      <button data-action="delete-task" data-id="${esc(t.id)}" class="btn btn-sm btn-danger" title="Delete"><i class="ti ti-trash"></i></button>
    </div>`;
  }).join('');
  updateBadges();
}

function addTask() {
  const text = document.getElementById('task-input').value.trim();
  if (!text) return;
  db.tasks.push({ id:'t'+Date.now(), text, projId: document.getElementById('task-proj').value, priority: document.getElementById('task-priority').value, done:false, created:Date.now() });
  document.getElementById('task-input').value = '';
  save();
  renderAgenda();
  renderOverview();
}

function toggleTask(id) {
  const t = db.tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; save(); renderAgenda(); renderOverview(); }
}

function deleteTask(id) {
  db.tasks = db.tasks.filter(t => t.id !== id);
  save();
  renderAgenda();
  renderOverview();
}

function clearDone() {
  if (!confirm('Delete all completed tasks?')) return;
  db.tasks = db.tasks.filter(t => !t.done);
  save();
  renderAgenda();
  renderOverview();
}

function setFilter(f) {
  taskFilter = f;
  document.querySelectorAll('[id^="tf-"]').forEach(b => { if(b.tagName==='BUTTON') b.style.background=''; });
  const el = document.getElementById('tf-'+f);
  if(el) el.style.background='var(--bg-secondary)';
  renderAgenda();
}

// NOTES
function renderNotesSidebar() {
  const q = (document.getElementById('note-search')?.value || '').toLowerCase();
  const pf = document.getElementById('note-filter-proj')?.value;
  let notes = [...db.notes].sort((a,b) => b.updated - a.updated);
  if (q) notes = notes.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
  if (pf) notes = notes.filter(n => n.projId === pf);
  const tagColors = {idea:'blue',todo:'amber',bug:'red',feature:'green',research:'purple',meeting:'teal'};
  const el = document.getElementById('notes-list');
  el.innerHTML = notes.length ? notes.map(n => {
    const p = proj(n.projId);
    return `<div class="note-card ${n.id===selectedNoteId?'selected':''}" data-action="open-note" data-id="${esc(n.id)}">
      <div class="note-title">${esc(n.title || 'Untitled')}</div>
      <div class="note-preview">${esc(n.body.replace(/[#*`\[\]]/g,'').replace(/\n/g,' '))}</div>
      <div class="note-foot">
        ${p ? `<span style="color:${safeColor(p.color)}">●</span><span>${esc(p.name)}</span>` : ''}
        ${n.tag ? `<span class="tag tag-${tagColors[n.tag]||'gray'}" style="font-size:10px">${esc(n.tag)}</span>` : ''}
        <div style="flex:1"></div>
        <span>${timeAgo(n.updated)}</span>
      </div>
    </div>`;
  }).join('') : '<div style="text-align:center;padding:24px;color:var(--text-tertiary);font-size:12px">No notes found</div>';
  updateBadges();
}

function openNote(id) {
  selectedNoteId = id;
  const n = db.notes.find(n => n.id === id);
  if (!n) return;
  document.getElementById('note-empty').style.display = 'none';
  const form = document.getElementById('note-form');
  form.style.display = 'flex';
  document.getElementById('note-title').value = n.title;
  document.getElementById('note-body').value = n.body;
  document.getElementById('note-proj').value = n.projId || '';
  document.getElementById('note-tag').value = n.tag || '';
  document.getElementById('note-save-status').textContent = 'Saved ' + timeAgo(n.updated);
  renderNotesSidebar();
}

function newNote() {
  populateSelects();
  const n = { id:'n'+Date.now(), title:'New note', projId:'', tag:'', body:'', created:Date.now(), updated:Date.now() };
  db.notes.unshift(n);
  save();
  renderNotesSidebar();
  openNote(n.id);
  setTimeout(() => { document.getElementById('note-title').select(); }, 50);
}

function noteChanged() {
  document.getElementById('note-save-status').textContent = 'Unsaved…';
  clearTimeout(noteAutoSave);
  noteAutoSave = setTimeout(() => saveNote(false), 1800);
}

function saveNote(showFeedback=false) {
  if (!selectedNoteId) return;
  const n = db.notes.find(n => n.id === selectedNoteId);
  if (!n) return;
  n.title = document.getElementById('note-title').value.trim() || 'Untitled';
  n.body = document.getElementById('note-body').value;
  n.projId = document.getElementById('note-proj').value;
  n.tag = document.getElementById('note-tag').value;
  n.updated = Date.now();
  save();
  document.getElementById('note-save-status').textContent = 'Saved just now';
  renderNotesSidebar();
  renderOverview();
}

function deleteNote() {
  if (!selectedNoteId || !confirm('Delete this note?')) return;
  db.notes = db.notes.filter(n => n.id !== selectedNoteId);
  selectedNoteId = null;
  document.getElementById('note-form').style.display = 'none';
  document.getElementById('note-empty').style.display = 'block';
  save();
  renderNotesSidebar();
  renderOverview();
}

// COMMITS
function renderCommits() {
  const q = (document.getElementById('commit-search')?.value || '').toLowerCase();
  const pf = document.getElementById('commit-filter-proj')?.value;
  let commits = [...db.commits].sort((a,b) => b.date - a.date);
  if (q) commits = commits.filter(c => c.msg.toLowerCase().includes(q) || c.hash.toLowerCase().includes(q));
  if (pf) commits = commits.filter(c => c.projId === pf);
  if (commitFilter !== 'all') commits = commits.filter(c => c.msg.startsWith(commitFilter+':'));

  const el = document.getElementById('commit-list');
  if (!commits.length) {
    el.innerHTML = '<div class="empty-state"><i class="ti ti-git-commit"></i><p>No commits found</p><div class="sub">Log a commit manually or paste your git log</div></div>';
    return;
  }

  const byProj = {};
  commits.forEach(c => { const k = c.projId||'none'; if(!byProj[k]) byProj[k]=[]; byProj[k].push(c); });
  const typeColors = {feat:'green',fix:'red',refactor:'purple',style:'blue',docs:'amber',chore:'gray',test:'teal'};

  el.innerHTML = Object.entries(byProj).map(([pid, cs]) => {
    const p = proj(pid);
    return `<div class="card mb12">
      <div class="card-header">
        <span class="card-title">${p ? `<span style="color:${safeColor(p.color)}">●</span> ${esc(p.name)}` : 'No project'}</span>
        <span class="tag tag-gray">${cs.length} commit${cs.length===1?'':'s'}</span>
      </div>
      <div class="commit-list">
        ${cs.map(c => {
          const type = c.msg.split(':')[0];
          const tc = typeColors[type] || 'gray';
          return `<div class="commit-item">
            <code class="commit-hash">${esc(c.hash)}</code>
            <div style="flex:1">
              <div class="commit-msg">
                ${type && c.msg.includes(':') ? `<span class="tag tag-${tc}" style="font-size:10px;margin-right:4px">${esc(type)}</span>` : ''}
                ${esc(c.msg.includes(':') ? c.msg.slice(c.msg.indexOf(':')+1).trim() : c.msg)}
              </div>
              <div class="commit-meta">${c.author ? esc(c.author)+' · ' : ''}${c.branch ? esc(c.branch)+' · ' : ''}${timeAgo(c.date)}</div>
            </div>
            <button data-action="delete-commit" data-id="${esc(c.id)}" class="btn btn-sm btn-danger" title="Delete"><i class="ti ti-trash"></i></button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
  updateBadges();
}

function populateCommitModal() {
  const sel = document.getElementById('cf-proj');
  if (!sel) return;
  sel.innerHTML = '<option value="">No project</option>';
  db.projects.forEach(p => { const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; sel.appendChild(o); });
}

function saveCommit() {
  const msg = document.getElementById('cf-msg').value.trim();
  if (!msg) { document.getElementById('cf-msg').focus(); return; }
  db.commits.push({
    id: 'c'+Date.now(),
    projId: document.getElementById('cf-proj').value,
    hash: document.getElementById('cf-hash').value.trim() || randHash(),
    msg,
    branch: document.getElementById('cf-branch').value.trim() || 'main',
    author: document.getElementById('cf-author').value.trim() || db.settings.author || 'you',
    date: Date.now()
  });
  ['cf-msg','cf-hash','cf-branch','cf-author'].forEach(id => document.getElementById(id).value = '');
  save();
  closeModal('modal-commit');
  renderCommits();
  renderOverview();
}

function deleteCommit(id) {
  db.commits = db.commits.filter(c => c.id !== id);
  save();
  renderCommits();
  renderOverview();
}

function setCommitFilter(f) {
  commitFilter = f;
  document.querySelectorAll('[id^="ctf-"]').forEach(b => b.style.background = '');
  document.getElementById('ctf-'+f).style.background = 'var(--bg-secondary)';
  renderCommits();
}

// FILES
function renderFileProjSel() {
  const sel = document.getElementById('file-proj-sel');
  sel.innerHTML = '<option value="">Select project</option>';
  db.projects.forEach(p => { const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; sel.appendChild(o); });
  if (db.projects.length) { sel.value = db.projects[0].id; renderFileTree(); }
}

async function renderFileTree() {
  const pid = document.getElementById('file-proj-sel').value;
  const el = document.getElementById('file-tree');
  const p = proj(pid);
  if (!pid) { el.innerHTML = '<div style="color:var(--text-tertiary);padding:12px;font-size:12px">Select a project to browse files</div>'; return; }
  if (serverBacked && p?.type === 'local' && p.url) {
    el.innerHTML = '<div style="color:var(--text-tertiary);padding:12px;font-size:12px">Loading files...</div>';
    try {
      const data = await api(`/api/projects/${encodeURIComponent(pid)}/tree`);
      el.innerHTML = buildServerTree(pid, data.tree, 0);
      return;
    } catch(e) {
      el.innerHTML = `<div style="color:var(--text-tertiary);padding:12px;font-size:12px">${esc(e.message)}</div>`;
      return;
    }
  }
  if (!db.files[pid]) { el.innerHTML = '<div style="color:var(--text-tertiary);padding:12px;font-size:12px">No file snapshot for this project</div>'; return; }
  el.innerHTML = buildTree(db.files[pid], 0);
}

function buildServerTree(pid, nodes, depth) {
  return nodes.map(node => {
    const pad = depth * 16 + 6;
    if (node.type === 'dir') {
      const id = 'dir-' + Math.random().toString(36).slice(2);
      return `<div class="file-item dir-item" style="padding-left:${pad}px" data-action="toggle-dir" data-target="${id}">
        <i class="ti ti-folder" style="color:#854F0B"></i>${esc(node.name)}/
      </div>
      <div id="${id}">${buildServerTree(pid, node.children || [], depth+1)}</div>`;
    }
    const ext = node.name.split('.').pop();
    const icons = {tsx:'ti-brand-typescript',ts:'ti-brand-typescript',js:'ti-brand-javascript',jsx:'ti-brand-react',md:'ti-markdown',json:'ti-braces',css:'ti-palette',html:'ti-brand-html5',env:'ti-lock',sh:'ti-terminal'};
    const icon = icons[ext] || 'ti-file';
    const ec = {tsx:'#185FA5',ts:'#185FA5',js:'#854F0B',jsx:'#0F6E56',md:'#5f5e5a',json:'#639922',css:'#993556'}[ext] || 'var(--text-tertiary)';
    return `<div class="file-item" style="padding-left:${pad}px" data-action="view-real-file" data-project="${esc(pid)}" data-path="${encodeURIComponent(node.path)}">
      <i class="ti ${icon}" style="color:${ec}"></i>${esc(node.name)}
    </div>`;
  }).join('');
}

async function viewRealFile(pid, encodedPath) {
  const rel = decodeURIComponent(encodedPath);
  document.getElementById('file-viewer-name').innerHTML = `<i class="ti ti-file"></i> ${esc(rel)}`;
  document.getElementById('file-content').textContent = 'Loading...';
  try {
    const data = await api(`/api/projects/${encodeURIComponent(pid)}/file?path=${encodeURIComponent(rel)}`);
    document.getElementById('file-content').textContent = data.content;
  } catch(e) {
    document.getElementById('file-content').textContent = e.message;
  }
}

function buildTree(dir, depth) {
  return Object.entries(dir).map(([name, node]) => {
    const pad = depth * 16 + 6;
    if (node.type === 'dir') {
      const id = 'dir-' + Math.random().toString(36).slice(2);
      const extIcons = { src:'ti-folder-code', components:'ti-components', routes:'ti-route', middleware:'ti-shield', pages:'ti-layout' };
      const icon = extIcons[name] || 'ti-folder';
      return `<div class="file-item dir-item" style="padding-left:${pad}px" data-action="toggle-dir" data-target="${id}">
        <i class="ti ${icon}" style="color:#854F0B"></i>${esc(name)}/
      </div>
      <div id="${id}">${buildTree(node.children, depth+1)}</div>`;
    } else {
      const ext = name.split('.').pop();
      const icons = {tsx:'ti-brand-typescript',ts:'ti-brand-typescript',js:'ti-brand-javascript',jsx:'ti-brand-react',md:'ti-markdown',json:'ti-braces',css:'ti-palette',html:'ti-brand-html5',env:'ti-lock',sh:'ti-terminal'};
      const icon = icons[ext] || 'ti-file';
      const ec = {tsx:'#185FA5',ts:'#185FA5',js:'#854F0B',jsx:'#0F6E56',md:'#5f5e5a',json:'#639922',css:'#993556'}[ext] || 'var(--text-tertiary)';
      const key = 'file-' + Math.random().toString(36).slice(2);
      fileContentCache[key] = { name, content: node.content };
      return `<div class="file-item" style="padding-left:${pad}px" data-action="view-cached-file" data-key="${key}">
        <i class="ti ${icon}" style="color:${ec}"></i>${esc(name)}
      </div>`;
    }
  }).join('');
}

function viewFile(name, content) {
  document.getElementById('file-viewer-name').innerHTML = `<i class="ti ti-file"></i> ${esc(name)}`;
  document.getElementById('file-content').textContent = content;
}

function copyFile(btn) {
  const c = document.getElementById('file-content').textContent;
  navigator.clipboard.writeText(c).catch(() => {});
  btn.innerHTML = '<i class="ti ti-check"></i> Copied!';
  setTimeout(() => btn.innerHTML = '<i class="ti ti-copy"></i> Copy', 1500);
}

function saveFileAsNote() {
  const content = document.getElementById('file-content').textContent;
  const name = document.getElementById('file-viewer-name').textContent.trim();
  if (!content || content === 'Select a file from the tree to view its contents here.') return;
  const n = { id:'n'+Date.now(), title:name||'File note', projId: document.getElementById('file-proj-sel').value, tag:'research', body:'```\n'+content+'\n```', created:Date.now(), updated:Date.now() };
  db.notes.unshift(n);
  save();
  showPanel('notes');
  setTimeout(() => openNote(n.id), 50);
}

function saveFileAsNoteFromPaste() {
  const content = document.getElementById('paste-area').value.trim();
  if (!content) return;
  const n = { id:'n'+Date.now(), title:'Pasted snippet', projId:'', tag:'research', body:content, created:Date.now(), updated:Date.now() };
  db.notes.unshift(n);
  save();
  showPanel('notes');
  setTimeout(() => openNote(n.id), 50);
}

// AI
function initAI() {
  const el = document.getElementById('ai-messages');
  el.innerHTML = '';
  appendMsg('Hi! I\'m your dev assistant with context about your projects, tasks, and notes. What can I help with?', 'assistant');
}

function clearAIChat() {
  document.getElementById('ai-messages').innerHTML = '';
  initAI();
}

function appendMsg(text, role) {
  const el = document.getElementById('ai-messages');
  const d = document.createElement('div');
  d.className = 'ai-msg ' + role;
  d.textContent = text;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

function aiHistory() {
  return [...document.getElementById('ai-messages').querySelectorAll('.ai-msg')].map(d => ({
    role: d.classList.contains('user') ? 'user' : 'assistant',
    content: d.textContent
  })).slice(-12);
}

async function sendAI() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendMsg(msg, 'user');
  const thinking = document.createElement('div');
  thinking.className = 'ai-msg assistant thinking';
  thinking.textContent = 'Thinking…';
  document.getElementById('ai-messages').appendChild(thinking);
  document.getElementById('ai-status').textContent = 'Generating…';

  const ctx = `You are DevFlow, a dev assistant embedded in a developer dashboard.

WORKSPACE CONTEXT:
Projects (${db.projects.length}): ${db.projects.map(p => `${p.name} [${p.type}${p.stack?' | '+p.stack:''}${p.desc?' | '+p.desc:''}]`).join('; ')}

Open tasks (${db.tasks.filter(t=>!t.done).length}):
${db.tasks.filter(t=>!t.done).map(t => { const p=proj(t.projId); return `- ${t.text}${p?' ['+p.name+']':''}${t.priority==='high?' }` }).join('\n') || 'None'}

Recent commits (last 8):
${[...db.commits].sort((a,b)=>b.date-a.date).slice(0,8).map(c => { const p=proj(c.projId); return `- ${c.hash} ${c.msg}${p?' ('+p.name+')':''}` }).join('\n') || 'None'}

Notes (${db.notes.length}):
${db.notes.slice(0,4).map(n => { const p=proj(n.projId); return `- "${n.title}"${p?' ['+p.name+']':''}${n.tag?' #'+n.tag:''}` }).join('\n') || 'None'}

Be concise, practical, and specific. Use the context above to give personalized answers. Format code in backticks.`;

  try {
    const data = await api('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: db.settings?.ollamaModel || 'llama3.2:3b',
        system: ctx,
        messages: aiHistory().slice(0,-1)
      })
    });
    thinking.remove();
    const reply = data.reply || 'Could not get a response. Try again.';
    appendMsg(reply, 'assistant');
    document.getElementById('ai-status').textContent = 'Powered by Ollama · ' + (db.settings?.ollamaModel || 'llama3.2:3b') + ' · ' + new Date().toLocaleTimeString();
  } catch(e) {
    thinking.remove();
    appendMsg('Ollama connection error. Make sure Ollama is running and llama3.2:3b is installed.', 'assistant');
    document.getElementById('ai-status').textContent = 'Error';
  }
}

function aiQuick(msg) {
  document.getElementById('ai-input').value = msg;
  sendAI();
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'show-panel') showPanel(target.dataset.panel);
    else if (action === 'open-modal') openModal(target.dataset.modal);
    else if (action === 'close-modal') closeModal(target.dataset.modal);
    else if (action === 'modal-bg-close') bgClose(event, target.dataset.modal);
    else if (action === 'topbar-action') topbarAction();
    else if (action === 'add-task') addTask();
    else if (action === 'set-filter') setFilter(target.dataset.filter);
    else if (action === 'clear-done') clearDone();
    else if (action === 'new-note') newNote();
    else if (action === 'delete-note') deleteNote();
    else if (action === 'save-note') saveNote(true);
    else if (action === 'set-commit-filter') setCommitFilter(target.dataset.filter);
    else if (action === 'save-file-note') saveFileAsNote();
    else if (action === 'copy-file') copyFile(target);
    else if (action === 'save-paste-note') saveFileAsNoteFromPaste();
    else if (action === 'clear-paste') document.getElementById('paste-area').value = '';
    else if (action === 'clear-ai') clearAIChat();
    else if (action === 'send-ai') sendAI();
    else if (action === 'ai-quick') aiQuick(target.dataset.message);
    else if (action === 'inspect-project') inspectProjectPath();
    else if (action === 'save-project') saveProject();
    else if (action === 'save-commit') saveCommit();
    else if (action === 'pick-color') pickColor(target, target.dataset.color);
    else if (action === 'toggle-task') toggleTask(target.dataset.id);
    else if (action === 'delete-project') deleteProject(target.dataset.id);
    else if (action === 'delete-task') deleteTask(target.dataset.id);
    else if (action === 'open-note') openNote(target.dataset.id);
    else if (action === 'delete-commit') deleteCommit(target.dataset.id);
    else if (action === 'toggle-dir') {
      const el = document.getElementById(target.dataset.target);
      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    } else if (action === 'view-real-file') {
      viewRealFile(target.dataset.project, target.dataset.path);
    } else if (action === 'view-cached-file') {
      const item = fileContentCache[target.dataset.key];
      if (item) viewFile(item.name, item.content);
    }
  });

  document.addEventListener('input', (event) => {
    const action = event.target.dataset?.inputAction;
    if (action === 'render-notes') renderNotesSidebar();
    else if (action === 'render-commits') renderCommits();
    else if (action === 'note-changed') noteChanged();
  });

  document.addEventListener('change', (event) => {
    const action = event.target.dataset?.changeAction;
    if (action === 'render-notes') renderNotesSidebar();
    else if (action === 'render-commits') renderCommits();
    else if (action === 'render-agenda') renderAgenda();
    else if (action === 'render-file-tree') renderFileTree();
  });

  document.addEventListener('keydown', (event) => {
    const action = event.target.dataset?.keyAction;
    if (action === 'add-task-enter' && event.key === 'Enter') addTask();
    if (action === 'send-ai-enter' && event.key === 'Enter' && !event.shiftKey) sendAI();
  });
}

// INIT
async function init() {
  bindEvents();
  await hydrateFromServer();
  renderSidebar();
  renderOverview();
  setFilter('all');
  setCommitFilter('all');
  initAI();
}
init();

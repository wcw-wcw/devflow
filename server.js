import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4177);
const DATA_DIR = path.join(__dirname, '.devflow');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const MAX_BODY = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.turbo', '.cache', 'coverage', 'vendor']);

function emptyState() {
  return { projects: [], tasks: [], notes: [], commits: [], files: {}, settings: { author: os.userInfo().username } };
}

async function loadState() {
  try {
    return { ...emptyState(), ...JSON.parse(await readFile(DATA_FILE, 'utf8')) };
  } catch {
    return emptyState();
  }
}

async function saveState(state) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify({ ...emptyState(), ...state }, null, 2));
}

function send(res, status, payload, headers = {}) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': typeof payload === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
    ...headers
  });
  res.end(body);
}

function sendFile(res, filePath, contentType) {
  readFile(filePath)
    .then((body) => {
      res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
      res.end(body);
    })
    .catch(() => send(res, 404, { error: 'Not found' }));
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) throw new Error('Request body too large');
  }
  return body ? JSON.parse(body) : {};
}

function expandHome(input = '') {
  if (!input) return '';
  if (input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return input;
}

function projectPath(project) {
  const repoPath = project?.localPath || (project?.type === 'local' ? project?.url : '');
  if (!repoPath) return '';
  return path.resolve(expandHome(repoPath));
}

function resolveInside(root, rel = '') {
  const target = path.resolve(root, rel || '.');
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path escapes project root');
  return target;
}

function runGit(cwd, args) {
  return new Promise((resolve) => {
    execFile('git', ['-C', cwd, ...args], { timeout: 15000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function cleanGithubUrl(url = '') {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('git@github.com:')) return `https://github.com/${raw.slice('git@github.com:'.length).replace(/\.git$/, '')}`;
  if (raw.startsWith('https://github.com/') || raw.startsWith('http://github.com/')) return raw.replace(/^http:/, 'https:').replace(/\.git$/, '').replace(/\/$/, '');
  return raw;
}

function projectRepoUrl(project, repoInfo) {
  return cleanGithubUrl(project?.repoUrl || (project?.type === 'github' ? project?.url : '') || repoInfo?.remoteUrl || '');
}

async function inspectRepo(repoPath) {
  const info = { path: repoPath, exists: false, isGit: false, branch: '', dirty: 0, ahead: 0, behind: 0, remoteUrl: '', lastCommit: null };
  try {
    const s = await stat(repoPath);
    info.exists = s.isDirectory();
  } catch {
    return info;
  }

  const inside = await runGit(repoPath, ['rev-parse', '--is-inside-work-tree']);
  info.isGit = inside.ok && inside.stdout === 'true';
  if (!info.isGit) return info;

  const branch = await runGit(repoPath, ['branch', '--show-current']);
  info.branch = branch.stdout || 'detached';
  const remote = await runGit(repoPath, ['remote', 'get-url', 'origin']);
  info.remoteUrl = cleanGithubUrl(remote.stdout || '');

  const status = await runGit(repoPath, ['status', '--porcelain=v1', '--branch']);
  const lines = status.stdout.split('\n').filter(Boolean);
  info.dirty = lines.filter((line) => !line.startsWith('##')).length;
  const header = lines.find((line) => line.startsWith('##')) || '';
  const ahead = header.match(/ahead (\d+)/);
  const behind = header.match(/behind (\d+)/);
  info.ahead = ahead ? Number(ahead[1]) : 0;
  info.behind = behind ? Number(behind[1]) : 0;

  const last = await runGit(repoPath, ['log', '-1', '--format=%H%x1f%s%x1f%an%x1f%ct']);
  if (last.ok && last.stdout) {
    const [hash, msg, author, unix] = last.stdout.split('\x1f');
    info.lastCommit = { hash, msg, author, date: Number(unix) * 1000 };
  }
  return info;
}

async function gitCommits(project, limit = 0) {
  const repoPath = projectPath(project);
  const repo = await inspectRepo(repoPath);
  if (!repo.isGit) return [];
  const args = ['log', '--format=%H%x1f%s%x1f%an%x1f%ct'];
  if (limit > 0) args.splice(1, 0, `-${limit}`);
  const log = await runGit(repoPath, args);
  if (!log.ok || !log.stdout) return [];
  const repoUrl = projectRepoUrl(project, repo);
  return log.stdout.split('\n').filter(Boolean).map((line) => {
    const [hash, msg, author, unix] = line.split('\x1f');
    return {
      id: `git-${project.id}-${hash}`,
      projId: project.id,
      hash,
      msg,
      author,
      branch: repo.branch,
      date: Number(unix) * 1000,
      source: 'git',
      url: repoUrl && hash ? `${repoUrl}/commit/${hash}` : ''
    };
  });
}

async function fileTree(root, rel = '', depth = 0, budget = { count: 0 }) {
  if (depth > 5 || budget.count > 450) return [];
  const dir = resolveInside(root, rel);
  const entries = await readdir(dir, { withFileTypes: true });
  const sorted = entries
    .filter((entry) => !entry.name.startsWith('.') || entry.name === '.env.example')
    .filter((entry) => !(entry.isDirectory() && SKIP_DIRS.has(entry.name)))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .slice(0, 120);

  const out = [];
  for (const entry of sorted) {
    budget.count += 1;
    const childRel = path.posix.join(rel.split(path.sep).join(path.posix.sep), entry.name);
    if (entry.isDirectory()) {
      out.push({ type: 'dir', name: entry.name, path: childRel, children: await fileTree(root, childRel, depth + 1, budget) });
    } else {
      const full = resolveInside(root, childRel);
      const s = await stat(full);
      out.push({ type: 'file', name: entry.name, path: childRel, size: s.size });
    }
  }
  return out;
}

function inferStack(files = []) {
  const names = new Set(files.map((f) => f.name));
  const stack = [];
  if (names.has('package.json')) stack.push('JavaScript/TypeScript');
  if (names.has('vite.config.ts') || names.has('vite.config.js')) stack.push('Vite');
  if (names.has('next.config.js') || names.has('next.config.mjs')) stack.push('Next.js');
  if (names.has('Cargo.toml')) stack.push('Rust');
  if (names.has('pyproject.toml') || names.has('requirements.txt')) stack.push('Python');
  if (names.has('go.mod')) stack.push('Go');
  return stack.join(', ');
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/state') {
    return send(res, 200, await loadState());
  }

  if (req.method === 'PUT' && url.pathname === '/api/state') {
    const state = await readJson(req);
    await saveState(state);
    return send(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/projects/inspect') {
    const { repoPath } = await readJson(req);
    const root = path.resolve(expandHome(repoPath || ''));
    const entries = existsSync(root) ? await readdir(root, { withFileTypes: true }).catch(() => []) : [];
    return send(res, 200, {
      name: path.basename(root),
      url: root,
      type: 'local',
      stack: inferStack(entries),
      git: await inspectRepo(root)
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/sync') {
    const state = await loadState();
    const gitCommitsByProject = [];
    for (const project of state.projects.filter((p) => projectPath(p))) {
      project.git = await inspectRepo(projectPath(project));
      if (!project.repoUrl && project.git.remoteUrl) project.repoUrl = project.git.remoteUrl;
      gitCommitsByProject.push(...await gitCommits(project));
    }
    state.commits = [...gitCommitsByProject, ...state.commits.filter((commit) => commit.source !== 'git')];
    await saveState(state);
    return send(res, 200, state);
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/chat') {
    const payload = await readJson(req);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const ollama = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: payload.model || 'llama3.2:3b',
          stream: false,
          messages: [
            { role: 'system', content: payload.system || 'You are DevFlow, a local development assistant.' },
            ...(payload.messages || []).map((message) => ({
              role: message.role === 'assistant' ? 'assistant' : 'user',
              content: String(message.content || '')
            }))
          ]
        })
      });
      const data = await ollama.json();
      if (!ollama.ok) return send(res, ollama.status, { error: data.error || 'Ollama request failed' });
      return send(res, 200, { reply: data.message?.content || '' });
    } finally {
      clearTimeout(timeout);
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/ollama/status') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const ollama = await fetch('http://127.0.0.1:11434/api/tags', { signal: controller.signal });
      const data = await ollama.json();
      if (!ollama.ok) return send(res, ollama.status, { error: data.error || 'Ollama request failed' });
      return send(res, 200, { ok: true, models: (data.models || []).map((model) => model.name).filter(Boolean) });
    } finally {
      clearTimeout(timeout);
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/projects/open') {
    const { path: repoPath, target } = await readJson(req);
    const root = path.resolve(expandHome(repoPath || ''));
    const exists = await stat(root).then((s) => s.isDirectory()).catch(() => false);
    if (!exists) return send(res, 400, { error: 'Project path is not readable' });
    const args = target === 'terminal' ? ['-a', 'Terminal', root] : [root];
    const result = await new Promise((resolve) => {
      execFile('open', args, { timeout: 8000 }, (error) => resolve({ ok: !error, error }));
    });
    if (!result.ok) return send(res, 500, { error: 'Open command failed' });
    return send(res, 200, { ok: true });
  }

  const treeMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/tree$/);
  if (req.method === 'GET' && treeMatch) {
    const state = await loadState();
    const project = state.projects.find((p) => p.id === decodeURIComponent(treeMatch[1]));
    const root = projectPath(project);
    if (!root) return send(res, 400, { error: 'Project is not a local repository' });
    return send(res, 200, { root, tree: await fileTree(root) });
  }

  const fileMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/file$/);
  if (req.method === 'GET' && fileMatch) {
    const state = await loadState();
    const project = state.projects.find((p) => p.id === decodeURIComponent(fileMatch[1]));
    const root = projectPath(project);
    if (!root) return send(res, 400, { error: 'Project is not a local repository' });
    const rel = url.searchParams.get('path') || '';
    const full = resolveInside(root, rel);
    const s = await stat(full);
    if (!s.isFile()) return send(res, 400, { error: 'Not a file' });
    if (s.size > MAX_FILE_BYTES) return send(res, 413, { error: 'File is larger than 1 MB' });
    return send(res, 200, { path: rel, content: await readFile(full, 'utf8') });
  }

  return send(res, 404, { error: 'Unknown API route' });
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const filePath = resolveInside(path.join(__dirname, 'dist'), rel);
    if (existsSync(filePath)) {
      return sendFile(res, filePath, contentType(filePath));
    }
    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    return send(res, 500, { error: error.message || 'Server error' });
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`DevFlow local app running at http://127.0.0.1:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});

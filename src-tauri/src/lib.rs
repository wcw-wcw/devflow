use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    env,
    fs,
    io::{Read, Write},
    net::TcpStream,
    path::{Path, PathBuf},
    process::Command,
    time::Duration,
};
use tauri::{AppHandle, Manager};

const MAX_FILE_BYTES: u64 = 1024 * 1024;
const MAX_TREE_DEPTH: usize = 5;
const MAX_TREE_ITEMS: usize = 450;

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Project {
    id: String,
    name: Option<String>,
    #[serde(default)]
    r#type: String,
    url: Option<String>,
    local_path: Option<String>,
    repo_url: Option<String>,
    deploy_url: Option<String>,
    color: Option<String>,
    desc: Option<String>,
    stack: Option<String>,
    git: Option<RepoInfo>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RepoInfo {
    path: String,
    exists: bool,
    is_git: bool,
    branch: String,
    dirty: usize,
    ahead: usize,
    behind: usize,
    remote_url: String,
    last_commit: Option<CommitInfo>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CommitInfo {
    hash: String,
    msg: String,
    author: String,
    date: u64,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommitEntry {
    id: String,
    proj_id: String,
    hash: String,
    msg: String,
    author: String,
    branch: String,
    date: u64,
    source: String,
    url: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct TreeNode {
    r#type: String,
    name: String,
    path: String,
    size: Option<u64>,
    children: Option<Vec<TreeNode>>,
}

#[derive(Debug, Deserialize, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

fn http_localhost(port: u16, request: &str, timeout_secs: u64) -> Result<String, String> {
    let mut stream = TcpStream::connect(("127.0.0.1", port))
        .map_err(|error| format!("Could not connect to 127.0.0.1:{port}: {error}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(timeout_secs)))
        .map_err(|error| format!("Could not set read timeout: {error}"))?;
    stream
        .write_all(request.as_bytes())
        .map_err(|error| format!("Could not send request: {error}"))?;
    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| format!("Could not read response: {error}"))?;
    let (_, body) = response
        .split_once("\r\n\r\n")
        .ok_or_else(|| "Invalid HTTP response".to_string())?;
    Ok(body.to_string())
}

fn default_state() -> Value {
    json!({
        "projects": [],
        "tasks": [],
        "notes": [],
        "commits": [],
        "files": {},
        "settings": { "author": env::var("USER").unwrap_or_else(|_| "you".to_string()) }
    })
}

fn data_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not resolve app data directory: {error}"))?;
    fs::create_dir_all(&dir).map_err(|error| format!("Could not create app data directory: {error}"))?;
    Ok(dir.join("data.json"))
}

fn read_state(app: &AppHandle) -> Result<Value, String> {
    let file = data_file(app)?;
    let text = fs::read_to_string(file).unwrap_or_default();
    if text.trim().is_empty() {
        return Ok(default_state());
    }
    let mut state: Value = serde_json::from_str(&text).map_err(|error| format!("State file is not valid JSON: {error}"))?;
    merge_defaults(&mut state);
    Ok(state)
}

fn write_state(app: &AppHandle, state: Value) -> Result<(), String> {
    let mut state = state;
    merge_defaults(&mut state);
    let file = data_file(app)?;
    let text = serde_json::to_string_pretty(&state).map_err(|error| format!("Could not serialize state: {error}"))?;
    fs::write(file, text).map_err(|error| format!("Could not write state: {error}"))
}

fn merge_defaults(state: &mut Value) {
    let defaults = default_state();
    for key in ["projects", "tasks", "notes", "commits", "files", "settings"] {
        if state.get(key).is_none() {
            state[key] = defaults[key].clone();
        }
    }
}

fn expand_home(input: &str) -> PathBuf {
    if input == "~" {
        return home_dir();
    }
    if let Some(rest) = input.strip_prefix("~/") {
        return home_dir().join(rest);
    }
    PathBuf::from(input)
}

fn home_dir() -> PathBuf {
    env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
}

fn project_path(project: &Project) -> Option<PathBuf> {
    project
        .local_path
        .as_deref()
        .filter(|path| !path.is_empty())
        .or_else(|| {
            if project.r#type == "local" {
                project.url.as_deref().filter(|url| !url.is_empty())
            } else {
                None
            }
        })
        .map(expand_home)
}

fn resolve_inside(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let root = root.canonicalize().map_err(|error| format!("Project path is not readable: {error}"))?;
    let target = root.join(rel).canonicalize().map_err(|error| format!("Path is not readable: {error}"))?;
    if !target.starts_with(&root) {
        return Err("Path escapes project root".to_string());
    }
    Ok(target)
}

fn run_git(cwd: &Path, args: &[&str]) -> Option<String> {
    let output = Command::new("git").arg("-C").arg(cwd).args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn clean_github_url(url: &str) -> String {
    let raw = url.trim();
    if raw.is_empty() {
        return String::new();
    }
    if let Some(rest) = raw.strip_prefix("git@github.com:") {
        return format!("https://github.com/{}", rest.trim_end_matches(".git"));
    }
    if raw.starts_with("https://github.com/") || raw.starts_with("http://github.com/") {
        return raw
            .replacen("http://", "https://", 1)
            .trim_end_matches(".git")
            .trim_end_matches('/')
            .to_string();
    }
    raw.to_string()
}

fn project_repo_url(project: &Project, repo: &RepoInfo) -> String {
    project
        .repo_url
        .as_deref()
        .filter(|url| !url.is_empty())
        .or_else(|| {
            if project.r#type == "github" {
                project.url.as_deref().filter(|url| !url.is_empty())
            } else {
                None
            }
        })
        .map(clean_github_url)
        .unwrap_or_else(|| repo.remote_url.clone())
}

fn inspect_repo(repo_path: &Path) -> RepoInfo {
    let path = repo_path.to_string_lossy().to_string();
    let exists = repo_path.is_dir();
    let mut info = RepoInfo {
        path,
        exists,
        is_git: false,
        branch: String::new(),
        dirty: 0,
        ahead: 0,
        behind: 0,
        remote_url: String::new(),
        last_commit: None,
    };
    if !exists {
        return info;
    }

    info.is_git = run_git(repo_path, &["rev-parse", "--is-inside-work-tree"]).as_deref() == Some("true");
    if !info.is_git {
        return info;
    }

    info.branch = run_git(repo_path, &["branch", "--show-current"]).unwrap_or_else(|| "detached".to_string());
    info.remote_url = run_git(repo_path, &["remote", "get-url", "origin"])
        .map(|url| clean_github_url(&url))
        .unwrap_or_default();
    let status = run_git(repo_path, &["status", "--porcelain=v1", "--branch"]).unwrap_or_default();
    let lines: Vec<&str> = status.lines().collect();
    info.dirty = lines.iter().filter(|line| !line.starts_with("##")).count();
    if let Some(header) = lines.iter().find(|line| line.starts_with("##")) {
        info.ahead = parse_status_count(header, "ahead");
        info.behind = parse_status_count(header, "behind");
    }
    if let Some(line) = run_git(repo_path, &["log", "-1", "--format=%H%x1f%s%x1f%an%x1f%ct"]) {
        info.last_commit = parse_commit_line(&line);
    }
    info
}

fn parse_status_count(header: &str, label: &str) -> usize {
    header
        .split(label)
        .nth(1)
        .and_then(|rest| rest.trim_start().split(|c: char| !c.is_ascii_digit()).next())
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(0)
}

fn parse_commit_line(line: &str) -> Option<CommitInfo> {
    let parts: Vec<&str> = line.split('\x1f').collect();
    if parts.len() != 4 {
        return None;
    }
    Some(CommitInfo {
        hash: parts[0].to_string(),
        msg: parts[1].to_string(),
        author: parts[2].to_string(),
        date: parts[3].parse::<u64>().unwrap_or(0) * 1000,
    })
}

fn git_commits(project: &Project, limit: usize) -> Vec<CommitEntry> {
    let Some(repo_path) = project_path(project) else {
        return Vec::new();
    };
    let repo = inspect_repo(&repo_path);
    if !repo.is_git {
        return Vec::new();
    }
    let limit_arg = format!("-{limit}");
    let args = if limit > 0 {
        vec!["log", limit_arg.as_str(), "--format=%H%x1f%s%x1f%an%x1f%ct"]
    } else {
        vec!["log", "--format=%H%x1f%s%x1f%an%x1f%ct"]
    };
    let Some(log) = run_git(&repo_path, &args) else {
        return Vec::new();
    };
    let repo_url = project_repo_url(project, &repo);
    log.lines()
        .filter_map(parse_commit_line)
        .map(|commit| {
            let url = if repo_url.is_empty() {
                String::new()
            } else {
                format!("{repo_url}/commit/{}", commit.hash)
            };
            CommitEntry {
                id: format!("git-{}-{}", project.id, commit.hash),
                proj_id: project.id.clone(),
                hash: commit.hash,
                msg: commit.msg,
                author: commit.author,
                branch: repo.branch.clone(),
                date: commit.date,
                source: "git".to_string(),
                url,
            }
        })
        .collect()
}

fn infer_stack(entries: &[fs::DirEntry]) -> String {
    let names: HashSet<String> = entries
        .iter()
        .filter_map(|entry| entry.file_name().into_string().ok())
        .collect();
    let mut stack = Vec::new();
    if names.contains("package.json") {
        stack.push("JavaScript/TypeScript");
    }
    if names.contains("vite.config.ts") || names.contains("vite.config.js") {
        stack.push("Vite");
    }
    if names.contains("next.config.js") || names.contains("next.config.mjs") {
        stack.push("Next.js");
    }
    if names.contains("Cargo.toml") {
        stack.push("Rust");
    }
    if names.contains("pyproject.toml") || names.contains("requirements.txt") {
        stack.push("Python");
    }
    if names.contains("go.mod") {
        stack.push("Go");
    }
    stack.join(", ")
}

fn file_tree(root: &Path, rel: &str, depth: usize, count: &mut usize) -> Result<Vec<TreeNode>, String> {
    if depth > MAX_TREE_DEPTH || *count > MAX_TREE_ITEMS {
        return Ok(Vec::new());
    }
    let dir = resolve_inside(root, rel)?;
    let mut entries: Vec<fs::DirEntry> = fs::read_dir(dir)
        .map_err(|error| format!("Could not read directory: {error}"))?
        .filter_map(Result::ok)
        .filter(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            (!name.starts_with('.') || name == ".env.example") && !skip_dir(&name)
        })
        .collect();
    entries.sort_by_key(|entry| {
        let is_file = entry.file_type().map(|t| t.is_file()).unwrap_or(true);
        (is_file, entry.file_name().to_string_lossy().to_ascii_lowercase())
    });

    let mut out = Vec::new();
    for entry in entries.into_iter().take(120) {
        *count += 1;
        if *count > MAX_TREE_ITEMS {
            break;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        let child_rel = if rel.is_empty() { name.clone() } else { format!("{rel}/{name}") };
        let file_type = entry.file_type().map_err(|error| format!("Could not read file type: {error}"))?;
        if file_type.is_dir() {
            out.push(TreeNode {
                r#type: "dir".to_string(),
                name,
                path: child_rel.clone(),
                size: None,
                children: Some(file_tree(root, &child_rel, depth + 1, count)?),
            });
        } else if file_type.is_file() {
            let size = entry.metadata().map(|meta| meta.len()).ok();
            out.push(TreeNode {
                r#type: "file".to_string(),
                name,
                path: child_rel,
                size,
                children: None,
            });
        }
    }
    Ok(out)
}

fn skip_dir(name: &str) -> bool {
    matches!(
        name,
        ".git" | "node_modules" | "dist" | "build" | ".next" | ".turbo" | ".cache" | "coverage" | "vendor"
    )
}

fn projects_from_state(state: &Value) -> Result<Vec<Project>, String> {
    serde_json::from_value(state.get("projects").cloned().unwrap_or_else(|| json!([])))
        .map_err(|error| format!("Projects are not valid: {error}"))
}

#[tauri::command]
fn load_state(app: AppHandle) -> Result<Value, String> {
    read_state(&app)
}

#[tauri::command]
fn save_state(app: AppHandle, state: Value) -> Result<Value, String> {
    write_state(&app, state)?;
    Ok(json!({ "ok": true }))
}

#[tauri::command]
fn inspect_project(repo_path: String) -> Result<Value, String> {
    let root = expand_home(&repo_path);
    let entries: Vec<fs::DirEntry> = fs::read_dir(&root).map(|read| read.filter_map(Result::ok).collect()).unwrap_or_default();
    Ok(json!({
        "name": root.file_name().and_then(|name| name.to_str()).unwrap_or("project"),
        "url": root.to_string_lossy(),
        "type": "local",
        "stack": infer_stack(&entries),
        "git": inspect_repo(&root)
    }))
}

#[tauri::command]
fn sync_workspace(app: AppHandle) -> Result<Value, String> {
    let mut state = read_state(&app)?;
    let mut projects = projects_from_state(&state)?;
    let mut synced_commits = Vec::new();
    for project in projects.iter_mut().filter(|project| project.r#type == "local") {
        if let Some(path) = project_path(project) {
            project.git = Some(inspect_repo(&path));
            if project.repo_url.as_deref().unwrap_or("").is_empty() {
                if let Some(remote_url) = project.git.as_ref().map(|git| git.remote_url.clone()).filter(|url| !url.is_empty()) {
                    project.repo_url = Some(remote_url);
                }
            }
            synced_commits.extend(git_commits(project, 0));
        }
    }
    let manual_commits: Vec<Value> = state
        .get("commits")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|commit| commit.get("source").and_then(Value::as_str) != Some("git"))
        .collect();
    let mut commits: Vec<Value> = synced_commits.into_iter().map(|commit| serde_json::to_value(commit).unwrap_or(Value::Null)).collect();
    commits.extend(manual_commits);
    state["projects"] = serde_json::to_value(projects).map_err(|error| error.to_string())?;
    state["commits"] = Value::Array(commits);
    write_state(&app, state.clone())?;
    Ok(state)
}

#[tauri::command]
fn project_tree(app: AppHandle, project_id: String) -> Result<Value, String> {
    let state = read_state(&app)?;
    let project = projects_from_state(&state)?
        .into_iter()
        .find(|project| project.id == project_id)
        .ok_or_else(|| "Project not found".to_string())?;
    let root = project_path(&project).ok_or_else(|| "Project is not a local repository".to_string())?;
    let mut count = 0;
    Ok(json!({ "root": root.to_string_lossy(), "tree": file_tree(&root, "", 0, &mut count)? }))
}

#[tauri::command]
fn read_project_file(app: AppHandle, project_id: String, path: String) -> Result<Value, String> {
    let state = read_state(&app)?;
    let project = projects_from_state(&state)?
        .into_iter()
        .find(|project| project.id == project_id)
        .ok_or_else(|| "Project not found".to_string())?;
    let root = project_path(&project).ok_or_else(|| "Project is not a local repository".to_string())?;
    let file = resolve_inside(&root, &path)?;
    let meta = fs::metadata(&file).map_err(|error| format!("Could not read file metadata: {error}"))?;
    if !meta.is_file() {
        return Err("Not a file".to_string());
    }
    if meta.len() > MAX_FILE_BYTES {
        return Err("File is larger than 1 MB".to_string());
    }
    let content = fs::read_to_string(file).map_err(|error| format!("Could not read file as UTF-8 text: {error}"))?;
    Ok(json!({ "path": path, "content": content }))
}

#[tauri::command]
fn ollama_chat(model: Option<String>, system: Option<String>, messages: Option<Vec<ChatMessage>>) -> Result<Value, String> {
    let mut chat_messages = Vec::new();
    chat_messages.push(json!({
        "role": "system",
        "content": system.unwrap_or_else(|| "You are DevFlow, a local development assistant.".to_string())
    }));
    for message in messages.unwrap_or_default() {
        chat_messages.push(json!({
            "role": if message.role == "assistant" { "assistant" } else { "user" },
            "content": message.content
        }));
    }

    let body = serde_json::to_string(&json!({
        "model": model.unwrap_or_else(|| "llama3.2:3b".to_string()),
        "stream": false,
        "messages": chat_messages
    }))
    .map_err(|error| format!("Could not serialize Ollama request: {error}"))?;

    let request = format!(
        "POST /api/chat HTTP/1.1\r\nHost: 127.0.0.1:11434\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.as_bytes().len(),
        body
    );
    let body = http_localhost(11434, &request, 60)?;
    let data: Value = serde_json::from_str(&body).map_err(|error| format!("Ollama returned invalid JSON: {error}"))?;
    if let Some(error) = data.get("error").and_then(Value::as_str) {
        return Err(error.to_string());
    }
    Ok(json!({ "reply": data.pointer("/message/content").and_then(Value::as_str).unwrap_or("") }))
}

#[tauri::command]
fn ollama_status() -> Result<Value, String> {
    let request = "GET /api/tags HTTP/1.1\r\nHost: 127.0.0.1:11434\r\nConnection: close\r\n\r\n";
    let body = http_localhost(11434, request, 5)?;
    let data: Value = serde_json::from_str(&body).map_err(|error| format!("Ollama returned invalid JSON: {error}"))?;
    let models = data
        .get("models")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|model| model.get("name").and_then(Value::as_str).map(str::to_string))
        .collect::<Vec<String>>();
    Ok(json!({ "ok": true, "models": models }))
}

#[tauri::command]
fn open_project_path(path: String, target: String) -> Result<Value, String> {
    let root = expand_home(&path)
        .canonicalize()
        .map_err(|error| format!("Project path is not readable: {error}"))?;
    let status = if target == "terminal" {
        Command::new("open").arg("-a").arg("Terminal").arg(&root).status()
    } else {
        Command::new("open").arg(&root).status()
    }
    .map_err(|error| format!("Could not open project path: {error}"))?;
    if !status.success() {
        return Err("Open command failed".to_string());
    }
    Ok(json!({ "ok": true }))
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            inspect_project,
            sync_workspace,
            project_tree,
            read_project_file,
            ollama_chat,
            ollama_status,
            open_project_path
        ])
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running DevFlow");
}

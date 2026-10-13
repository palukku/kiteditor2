// The editor's backend. With the local server (editor/server.mjs) these are
// HTTP calls; on a static host (GitHub Pages) the browser does the same work
// itself (browser-backend-service.js). The rest of the UI does not care.

async function json(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? response.statusText);
  return body;
}

const serverBackend = {
  getProject: () => fetch("api/project").then(json),
  getMeta: () => fetch("api/meta").then(json),
  saveProject: (project) => fetch("api/project", { method: "PUT", body: JSON.stringify(project) }).then(json),
  uploadAsset: (name, file) => fetch(`api/asset/${encodeURIComponent(name)}`, { method: "POST", body: file }).then(json),
  buildApp: () => fetch("api/build", { method: "POST" }).then(json),
};

async function pickBackend() {
  const hasServer = await fetch("api/meta").then((response) => response.ok, () => false);
  if (hasServer) return serverBackend;
  return (await import("./browser-backend-service.js")).createBrowserBackend();
}

// Created on first use, so a failure surfaces in the caller (editor-main shows it)
let backend = null;
const use = () => (backend ??= pickBackend());

export const getProject = async () => (await use()).getProject();

export const getMeta = async () => (await use()).getMeta();

export const saveProject = async (project) => (await use()).saveProject(project);

export const uploadAsset = async (name, file) => (await use()).uploadAsset(name, file);

// → { files, dir, url, download? }: url opens the build; with "download" it is a zip to save
export const buildApp = async () => (await use()).buildApp();

// Only the browser backend has these (the local server keeps the project as files); null otherwise
export const projectFileActions = async () => {
  const { exportProject, importProject } = await use();
  return exportProject ? { exportProject, importProject } : null;
};

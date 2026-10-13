// Talks to the local KITEditor server (editor/server.mjs)

async function json(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? response.statusText);
  return body;
}

export const getProject = () => fetch("/api/project").then(json);

export const getMeta = () => fetch("/api/meta").then(json);

export const saveProject = (project) => fetch("/api/project", { method: "PUT", body: JSON.stringify(project) }).then(json);

export const uploadAsset = (name, file) => fetch(`/api/asset/${encodeURIComponent(name)}`, { method: "POST", body: file }).then(json);

export const buildApp = () => fetch("/api/build", { method: "POST" }).then(json);

// The time stamp defeats the browser's image cache after a new upload
export const assetUrl = (name) => `/api/asset/${encodeURIComponent(name)}?t=${Date.now()}`;

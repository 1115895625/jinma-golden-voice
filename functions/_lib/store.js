// Cloudflare Pages Functions - 数据存储层（GitHub API）
const DATA_DIR = 'data';

async function githubRequest(env, path, options = {}) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${DATA_DIR}/${path}`;
  
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `token ${env.GITHUB_TOKEN}`,
      'User-Agent': 'jinma-vote',
      Accept: 'application/vnd.github.v3+json',
      ...options.headers,
    },
  });
  
  return res;
}

export async function readJSON(env, filename, defaultValue) {
  const res = await githubRequest(env, filename + `?ref=${env.GITHUB_BRANCH || 'main'}`);
  
  if (res.status === 404) {
    return { data: defaultValue, sha: null };
  }
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
  }
  
  const file = await res.json();
  const content = atob(file.content);
  return { data: JSON.parse(content), sha: file.sha };
}

export async function writeJSON(env, filename, data, sha) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  
  const body = {
    message: `update ${filename}`,
    content,
    branch: env.GITHUB_BRANCH || 'main',
  };
  
  if (sha) {
    body.sha = sha;
  }
  
  const res = await githubRequest(env, filename, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Write failed: ${res.status} ${text.slice(0, 200)}`);
  }
  
  return true;
}

export async function updateJSON(env, filename, defaultValue, updater, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, sha } = await readJSON(env, filename, defaultValue);
      const newData = updater(data);
      await writeJSON(env, filename, newData, sha);
      return newData;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 200));
    }
  }
}

export async function getVotes(env) {
  const { data } = await readJSON(env, 'votes.json', null);
  return data;
}

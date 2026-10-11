// 数据存储层 - 通过 GitHub API 读写 JSON 文件
const { initialVotes } = require('./config');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // owner/repo
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const DATA_DIR = 'data';

const BASE_URL = 'https://api.github.com/repos';

// 读取文件
async function readFile(filename) {
  const path = `${DATA_DIR}/${filename}`;
  const url = `${BASE_URL}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'User-Agent': 'jinma-vote',
      Accept: 'application/vnd.github.v3+json',
    },
  });
  
  if (res.status === 404) {
    return { content: null, sha: null };
  }
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
  }
  
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { content, sha: data.sha };
}

// 写入文件
async function writeFile(filename, content, sha) {
  const path = `${DATA_DIR}/${filename}`;
  const url = `${BASE_URL}/${GITHUB_REPO}/contents/${path}`;
  
  const body = {
    message: `update ${filename}`,
    content: Buffer.from(content).toString('base64'),
    branch: GITHUB_BRANCH,
  };
  
  if (sha) {
    body.sha = sha;
  }
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'User-Agent': 'jinma-vote',
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub write ${res.status}: ${text.slice(0, 200)}`);
  }
  
  return true;
}

// 读取 JSON
async function readJSON(filename, defaultValue) {
  const { content, sha } = await readFile(filename);
  if (content === null) {
    return { data: defaultValue, sha: null };
  }
  return { data: JSON.parse(content), sha };
}

// 写入 JSON
async function writeJSON(filename, data, sha) {
  await writeFile(filename, JSON.stringify(data, null, 2), sha);
}

// 安全更新 JSON（带重试）
async function updateJSON(filename, defaultValue, updater, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, sha } = await readJSON(filename, defaultValue);
      const newData = updater(data);
      await writeJSON(filename, newData, sha);
      return newData;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 200));
    }
  }
}

// 便捷方法：获取票数
async function getVotes() {
  const { data } = await readJSON('votes.json', initialVotes);
  return data;
}

// 便捷方法：获取投票者记录
async function getVoters() {
  const { data } = await readJSON('voters.json', {});
  return data;
}

// 便捷方法：获取抽奖记录
async function getLotteries() {
  const { data } = await readJSON('lotteries.json', []);
  return data;
}

module.exports = {
  readJSON,
  writeJSON,
  updateJSON,
  getVotes,
  getVoters,
  getLotteries,
};

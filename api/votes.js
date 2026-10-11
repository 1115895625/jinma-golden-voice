// GET /api/votes - 获取所有选手票数
const { getVotes } = require('./_lib/store');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const votes = await getVotes();
    return res.status(200).json(votes);
  } catch (e) {
    console.error('Get votes error:', e);
    return res.status(500).json({ error: '获取票数失败' });
  }
};

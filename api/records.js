// GET /api/records - 管理员查看所有记录
const { getVoters, getLotteries, getVotes } = require('./_lib/store');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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
  
  // 简单密码验证
  const password = req.query.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }
  
  try {
    const [voters, lotteries, votes] = await Promise.all([
      getVoters(),
      getLotteries(),
      getVotes(),
    ]);
    
    // 统计数据
    const totalVoters = Object.keys(voters).length;
    const totalVotes = Object.values(voters).reduce((sum, v) => sum + Object.keys(v.votes).length, 0);
    const totalLotteries = lotteries.length;
    const winners = lotteries.filter(l => l.won);
    
    return res.status(200).json({
      stats: {
        totalVoters,
        totalVotes,
        totalLotteries,
        winners: winners.length,
      },
      voters: Object.entries(voters).map(([phone, v]) => ({
        phone,
        name: v.name,
        voteCount: Object.keys(v.votes).length,
        votes: v.votes,
        createdAt: v.createdAt,
      })),
      lotteries,
      votes,
    });
    
  } catch (e) {
    console.error('Get records error:', e);
    return res.status(500).json({ error: '获取记录失败' });
  }
};

// POST /api/vote - 投票
const { updateJSON, getVotes } = require('./_lib/store');
const { MAX_VOTES_PER_PERSON } = require('./_lib/config');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { name, phone, category, index } = req.body;
    
    // 验证参数
    if (!name || !phone || !category || index === undefined) {
      return res.status(400).json({ error: '参数不完整' });
    }
    
    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }
    
    if (category !== 'individual' && category !== 'team') {
      return res.status(400).json({ error: '分类错误' });
    }
    
    const voteKey = `${category}-${index}`;
    
    // 更新投票者记录 + 票数（原子操作）
    let voterResult = null;
    
    await updateJSON('voters.json', {}, (voters) => {
      const voter = voters[phone] || { name, votes: {}, createdAt: new Date().toISOString() };
      
      // 检查是否已经投过这个选手
      if (voter.votes[voteKey]) {
        voterResult = { alreadyVoted: true };
        return voters; // 不修改
      }
      
      // 检查投票数是否超过上限
      const voteCount = Object.keys(voter.votes).length;
      if (voteCount >= MAX_VOTES_PER_PERSON) {
        voterResult = { limitReached: true };
        return voters; // 不修改
      }
      
      // 记录投票
      voter.votes[voteKey] = new Date().toISOString();
      voter.name = name; // 更新姓名
      voters[phone] = voter;
      voterResult = { success: true, remaining: MAX_VOTES_PER_PERSON - voteCount - 1 };
      
      return voters;
    });
    
    if (voterResult.alreadyVoted) {
      return res.status(400).json({ error: '你已经为这位选手投过票了' });
    }
    
    if (voterResult.limitReached) {
      return res.status(400).json({ error: `每人最多投 ${MAX_VOTES_PER_PERSON} 票` });
    }
    
    // 更新票数
    await updateJSON('votes.json', null, (votes) => {
      if (!votes) {
        // 不应该发生，但做个兜底
        const { initialVotes } = require('./_lib/config');
        votes = JSON.parse(JSON.stringify(initialVotes));
      }
      if (votes[category] && votes[category][index]) {
        votes[category][index].votes++;
      }
      return votes;
    });
    
    // 返回最新票数
    const latestVotes = await getVotes();
    
    return res.status(200).json({
      success: true,
      remaining: voterResult.remaining,
      votes: latestVotes,
    });
    
  } catch (e) {
    console.error('Vote error:', e);
    return res.status(500).json({ error: '投票失败，请稍后重试' });
  }
};

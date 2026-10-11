// POST /api/lottery - 抽奖
const { updateJSON } = require('./_lib/store');
const { LOTTERY_WIN_RATE, LOTTERY_PRIZE } = require('./_lib/config');

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
    const { name, phone } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: '参数不完整' });
    }
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }
    
    let result = null;
    
    // 检查是否已经抽过奖
    await updateJSON('lotteries.json', [], (records) => {
      const already = records.find(r => r.phone === phone);
      
      if (already) {
        result = { alreadyDrawn: true, prize: already.prize, won: already.won };
        return records;
      }
      
      // 决定是否中奖
      const won = Math.random() < LOTTERY_WIN_RATE;
      const prize = won ? LOTTERY_PRIZE : '谢谢参与';
      
      const record = {
        name,
        phone,
        prize,
        won,
        time: new Date().toISOString(),
      };
      
      records.push(record);
      result = { success: true, won, prize };
      
      return records;
    });
    
    if (result.alreadyDrawn) {
      return res.status(400).json({ 
        error: '你已经抽过奖了', 
        prize: result.prize,
        won: result.won 
      });
    }
    
    return res.status(200).json(result);
    
  } catch (e) {
    console.error('Lottery error:', e);
    return res.status(500).json({ error: '抽奖失败，请稍后重试' });
  }
};

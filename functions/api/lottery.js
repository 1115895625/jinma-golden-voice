// POST /api/lottery
import { updateJSON } from '../_lib/store';

const WIN_RATE = 1 / 3;
const PRIZE = 'π学院小熊';

export async function onRequest(context) {
  return handle(context);
}

async function handle({ request, env }) {
  const origin = request.headers.get('Origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const { name, phone } = await request.json();
    
    if (!name || !phone) {
      return new Response(JSON.stringify({ error: '参数不完整' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return new Response(JSON.stringify({ error: '手机号格式不正确' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    let result = null;
    
    await updateJSON(env, 'lotteries.json', [], (records) => {
      const already = records.find(r => r.phone === phone);
      
      if (already) {
        result = { alreadyDrawn: true, prize: already.prize, won: already.won };
        return records;
      }
      
      const won = Math.random() < WIN_RATE;
      const prize = won ? PRIZE : '谢谢参与';
      
      records.push({
        name,
        phone,
        prize,
        won,
        time: new Date().toISOString(),
      });
      
      result = { success: true, won, prize };
      return records;
    });
    
    if (result.alreadyDrawn) {
      return new Response(JSON.stringify({ 
        error: '你已经抽过奖了', 
        prize: result.prize,
        won: result.won 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (e) {
    console.error('Lottery error:', e);
    return new Response(JSON.stringify({ error: '抽奖失败，请稍后重试' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

// POST /api/vote
import { updateJSON, getVotes } from '../_lib/store';

const MAX_VOTES_PER_PERSON = 3;

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
    const { name, phone, category, index } = await request.json();
    
    if (!name || !phone || !category || index === undefined) {
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
    
    if (category !== 'individual' && category !== 'team') {
      return new Response(JSON.stringify({ error: '分类错误' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    const voteKey = `${category}-${index}`;
    let result = null;
    
    // 更新投票者记录
    await updateJSON(env, 'voters.json', {}, (voters) => {
      const voter = voters[phone] || { name, votes: {}, createdAt: new Date().toISOString() };
      
      if (voter.votes[voteKey]) {
        result = { alreadyVoted: true };
        return voters;
      }
      
      const voteCount = Object.keys(voter.votes).length;
      if (voteCount >= MAX_VOTES_PER_PERSON) {
        result = { limitReached: true };
        return voters;
      }
      
      voter.votes[voteKey] = new Date().toISOString();
      voter.name = name;
      voters[phone] = voter;
      result = { success: true, remaining: MAX_VOTES_PER_PERSON - voteCount - 1 };
      
      return voters;
    });
    
    if (result.alreadyVoted) {
      return new Response(JSON.stringify({ error: '你已经为这位选手投过票了' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    if (result.limitReached) {
      return new Response(JSON.stringify({ error: `每人最多投 ${MAX_VOTES_PER_PERSON} 票` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    // 更新票数
    await updateJSON(env, 'votes.json', null, (votes) => {
      if (!votes) return votes;
      if (votes[category] && votes[category][index]) {
        votes[category][index].votes++;
      }
      return votes;
    });
    
    const latestVotes = await getVotes(env);
    
    return new Response(JSON.stringify({
      success: true,
      remaining: result.remaining,
      votes: latestVotes,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (e) {
    console.error('Vote error:', e);
    return new Response(JSON.stringify({ error: '投票失败，请稍后重试' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

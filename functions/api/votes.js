// Cloudflare Pages Function - GET /api/votes
import { getVotes } from './_lib/store';

export async function onRequest(context) {
  const res = await handle(context);
  return res;
}

async function handle({ request, env }) {
  const origin = request.headers.get('Origin') || '*';
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const votes = await getVotes(env);
    return new Response(JSON.stringify(votes), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Get votes error:', e);
    return new Response(JSON.stringify({ error: '获取票数失败' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

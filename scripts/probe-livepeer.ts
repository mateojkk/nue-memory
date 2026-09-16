/**
 * Livepeer Agent MCP probe.
 *
 * Verifies the real end-to-end contract used by lib/nue-memory/media-memory/livepeer-agent.ts:
 *   1. MCP initialize handshake (Streamable HTTP, JSON-RPC 2.0)
 *   2. tools/list - confirms create_media exists on the live surface
 *   3. create_media - a real render (defaults to keyless demo credit, ~$10 free)
 *
 * Usage:
 *   npx tsx scripts/probe-livepeer.ts [prompt]
 * Env (all optional):
 *   LIVEPEER_API_KEY        sk_... key from app.daydream.live (omit = keyless demo)
 *   LIVEPEER_AGENT_MCP_URL  defaults to https://agent.livepeer.org/api/mcp/creative
 *   PROBE_MODEL             defaults to flux-schnell
 */

const ENDPOINT = process.env.LIVEPEER_AGENT_MCP_URL || 'https://agent.livepeer.org/api/mcp/creative';
const BEARER = process.env.LIVEPEER_API_KEY || process.env.LIVEPEER_AGENT_KEY;
const MODEL = process.env.PROBE_MODEL || 'flux-schnell';
const PROMPT = process.argv[2] || 'A watercolor sunset over Tokyo, pixel-art style, warm bronze accents';

let sessionId: string | null = null;
let nextId = 1;

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
    ...(BEARER ? { Authorization: `Bearer ${BEARER}` } : {}),
  };
}

/** POST a JSON-RPC message; returns parsed result, transparently unwrapping SSE envelopes. */
async function rpc(method: string, params?: unknown): Promise<any> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, ...(params !== undefined ? { params } : {}) }),
  });

  const sid = res.headers.get('mcp-session-id');
  if (sid && !sessionId) sessionId = sid;

  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on ${method}: ${raw.slice(0, 500)}`);
  }

  let payload: any;
  if (contentType.includes('text/event-stream')) {
    // Take the last data: line carrying JSON-RPC with our result
    const lines = raw.split('\n').filter((l) => l.startsWith('data:'));
    payload = lines
      .map((l) => {
        try { return JSON.parse(l.slice(5).trim()); } catch { return null; }
      })
      .filter((p) => p && (p.result || p.error))
      .pop();
  } else {
    payload = JSON.parse(raw);
  }

  if (!payload) throw new Error(`No JSON-RPC payload returned for ${method}. Raw: ${raw.slice(0, 300)}`);
  if (payload.error) throw new Error(`RPC error on ${method}: ${JSON.stringify(payload.error).slice(0, 500)}`);
  return payload.result;
}

async function main() {
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Auth: ${BEARER ? 'sk_ key (full access)' : 'keyless demo credit (~$10 free)'}\n`);

  // 1. Initialize handshake
  const init = await rpc('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'nue-memory-probe', version: '1.0.0' },
  });
  console.log('✓ initialize - server:', init?.serverInfo?.name, init?.serverInfo?.version || '');
  await rpc('notifications/initialized').catch(() => undefined);

  // 2. Confirm create_media exists on the live surface
  const tools = await rpc('tools/list', {});
  const toolNames: string[] = (tools?.tools || []).map((t: any) => t.name);
  console.log(`✓ tools/list - ${toolNames.length} tools. create_media present: ${toolNames.includes('create_media')}`);
  if (toolNames.includes('get_pricing')) {
    const pricing = await rpc('tools/call', { name: 'get_pricing', arguments: { capability: MODEL } });
    const pText = pricing?.structuredContent || pricing?.content?.[0]?.text || pricing;
    console.log(`✓ get_pricing (${MODEL}):`, JSON.stringify(pText).slice(0, 300));
  }

  // 3. Real render - mirrors livepeer-agent.ts arguments exactly
  console.log(`\nRendering "${PROMPT}" on ${MODEL} …`);
  const media = await rpc('tools/call', {
    name: 'create_media',
    arguments: { action: 'generate', prompt: PROMPT, model: MODEL, prefer_fast: true },
  });

  const sc = media?.structuredContent || {};
  const textOut = Array.isArray(media?.content) ? media.content.map((c: any) => c.text).join(' ') : '';
  const url = sc.url || media?.content?.find((c: any) => c.type === 'image' || !!c.url)?.url || (textOut.match(/https?:\/\/\S+/) || [])[0];

  console.log('✓ create_media result:');
  console.log('  capability:', sc.capability || '(not reported)');
  console.log('  url:', url || '(none found)');
  console.log('  raw (truncated):', JSON.stringify(media).slice(0, 600));

  if (!url) {
    console.error('\n✗ FAIL: no media URL in response - do NOT treat this as a successful render.');
    process.exit(1);
  }

  // 4. Verify the URL actually serves media
  const head = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-64' } });
  const type = head.headers.get('content-type') || 'unknown';
  console.log(`\n✓ media fetch check: HTTP ${head.status} · content-type: ${type}`);
  const ok = head.ok && (type.startsWith('image/') || type.startsWith('video/'));
  console.log(ok ? '\n✅ PROBE PASSED - real Livepeer render confirmed end-to-end.' : '\n✗ PROBE FAILED - URL did not serve image/video bytes.');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('\n✗ PROBE FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});

// Offline mock backend for developing Cove without API keys:
//   npm run mock            → http://localhost:8787
//   Anthropic format:  base URL http://localhost:8787            (models: mock-claude, mock-claude-mini)
//   OpenAI format:     base URL http://localhost:8787/v1         (any model id)
//   MCP connector:     http://localhost:8787/mcp                 (tools: echo, pixel)
// Say "pod", "mcp", "js", "slow" or "fail" in a message to exercise tool calls and errors.
// Set MOCK_LOG=path.jsonl to record every request body.
import http from 'node:http';
import fs from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const LOG = process.env.MOCK_LOG;
const PORT = Number(process.env.PORT || 8787);
if (LOG) fs.writeFileSync(LOG, '');
const record = (entry) => LOG && fs.appendFileSync(LOG, JSON.stringify(entry) + '\n');
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function lastUserContent(messages) {
  const m = messages[messages.length - 1];
  return m;
}
function textOf(m) {
  if (!m) return '';
  if (typeof m.content === 'string') return m.content;
  return (m.content || []).map((c) => c.text || '').join(' ');
}

async function anthropic(req, res, body) {
  record({ kind: 'anthropic', url: req.url, headers: req.headers, body });
  res.writeHead(200, { ...cors, 'Content-Type': 'text/event-stream' });
  const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  const last = lastUserContent(body.messages);
  const sys = JSON.stringify(body.system || '');
  const isToolResult = Array.isArray(last.content) && last.content.some((c) => c.type === 'tool_result');
  const utext = textOf(last);
  send('message_start', { message: { id: 'msg_' + Date.now(), type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, usage: { input_tokens: 1200, cache_read_input_tokens: 800, output_tokens: 1 } } });
  let idx = 0;
  const textBlock = async (t) => {
    send('content_block_start', { index: idx, content_block: { type: 'text', text: '' } });
    for (const chunk of t.match(/[\s\S]{1,12}/g)) {
      send('content_block_delta', { index: idx, delta: { type: 'text_delta', text: chunk } });
      await sleep(8);
    }
    send('content_block_stop', { index: idx++ });
  };
  const thinkingBlock = async (t) => {
    send('content_block_start', { index: idx, content_block: { type: 'thinking', thinking: '', signature: '' } });
    for (const chunk of t.match(/[\s\S]{1,10}/g)) {
      send('content_block_delta', { index: idx, delta: { type: 'thinking_delta', thinking: chunk } });
      await sleep(10);
    }
    send('content_block_delta', { index: idx, delta: { type: 'signature_delta', signature: 'sig_' + idx } });
    send('content_block_stop', { index: idx++ });
  };
  const toolUse = async (name, input) => {
    send('content_block_start', { index: idx, content_block: { type: 'tool_use', id: 'toolu_' + Math.random().toString(36).slice(2), name, input: {} } });
    const js = JSON.stringify(input);
    for (const chunk of js.match(/[\s\S]{1,8}/g)) send('content_block_delta', { index: idx, delta: { type: 'input_json_delta', partial_json: chunk } });
    send('content_block_stop', { index: idx++ });
  };
  let stop = 'end_turn';
  if (sys.includes('conversation titles')) {
    await textBlock('Mock Title Here');
  } else if (isToolResult) {
    const results = last.content.filter((c) => c.type === 'tool_result').map((c) => JSON.stringify(c.content).slice(0, 200));
    await textBlock(`Done. Tool said: \`${results.join(' | ').replace(/`/g, "'").slice(0, 160)}\``);
  } else if (/pod/i.test(utext)) {
    await thinkingBlock('The user wants me to remember something. I will write it to a pod.');
    await textBlock('Saving that to your memory pod.');
    await toolUse('pod_write', { pod: 'memory', key: 'favorite_color', value: 'blue' });
    stop = 'tool_use';
  } else if (/mcp/i.test(utext)) {
    const tool = (body.tools || []).find((t) => t.name && t.name.endsWith('__echo'));
    await toolUse(tool ? tool.name : 'missing', { text: 'hello from mcp' });
    stop = 'tool_use';
  } else if (/js/i.test(utext)) {
    await toolUse('run_javascript', { code: 'console.log("hi"); return [1,2,3].map(x=>x*2)' });
    stop = 'tool_use';
  } else if (/slow/i.test(utext)) {
    for (let i = 1; i <= 40; i++) {
      if (res.destroyed) return;
      if (i === 1) send('content_block_start', { index: idx, content_block: { type: 'text', text: '' } });
      send('content_block_delta', { index: idx, delta: { type: 'text_delta', text: `Line ${i} of a slow answer.\n\n` } });
      await sleep(150);
    }
    send('content_block_stop', { index: idx++ });
  } else if (/fail/i.test(utext)) {
    res.end(`event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded (mock)"}}\n\n`);
    return;
  } else {
    await thinkingBlock('Let me write a rich markdown answer.');
    await textBlock(`Here is **markdown** with a list:\n\n- one\n- two with \`code\`\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nMath: $E = mc^2$ and it costs $5 to $10.\n\n\`\`\`python\ndef hello(name):\n    return f"hi {name}"\n\`\`\`\n\n\`\`\`html\n<button onclick="alert(1)">Hi</button>\n\`\`\`\n\nDone.`);
  }
  send('message_delta', { delta: { stop_reason: stop }, usage: { output_tokens: 42 } });
  send('message_stop', {});
  res.end();
}

async function openai(req, res, body) {
  record({ kind: 'openai', url: req.url, body });
  res.writeHead(200, { ...cors, 'Content-Type': 'text/event-stream' });
  const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
  const last = body.messages[body.messages.length - 1];
  const base = { id: 'c1', object: 'chat.completion.chunk', model: body.model };
  if (last.role === 'tool') {
    for (const w of ['Tool ', 'result ', 'was: ', String(last.content).slice(0, 80)]) send({ ...base, choices: [{ index: 0, delta: { content: w } }] });
    send({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] });
  } else if (/pod/i.test(textOf(last))) {
    send({ ...base, choices: [{ index: 0, delta: { reasoning_content: 'thinking about pods...' } }] });
    send({ ...base, choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'pods_list', arguments: '' } }] } }] });
    send({ ...base, choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '{}' } }] } }] });
    send({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] });
  } else {
    for (const w of ['<think>hmm</think>', 'Hello ', 'from ', 'the ', 'OpenAI ', 'mock!']) send({ ...base, choices: [{ index: 0, delta: { content: w } }] });
    send({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] });
  }
  send({ ...base, choices: [], usage: { prompt_tokens: 50, completion_tokens: 7 } });
  res.write('data: [DONE]\n\n');
  res.end();
}

function makeMcp() {
  const server = new McpServer({ name: 'mock-mcp', version: '1.0.0' });
  server.registerTool('echo', { description: 'Echo text back', inputSchema: { text: z.string() }, annotations: { readOnlyHint: true } }, async ({ text }) => ({ content: [{ type: 'text', text: `echo: ${text}` }] }));
  server.registerTool('pixel', { description: 'Returns a tiny image', inputSchema: {} }, async () => ({
    content: [{ type: 'image', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', mimeType: 'image/png' }],
  }));
  return server;
}

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      return res.end();
    }
    let raw = '';
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : undefined;
    try {
      if (req.url.startsWith('/v1/messages')) return await anthropic(req, res, body);
      if (req.url.startsWith('/v1/chat/completions')) return await openai(req, res, body);
      if (req.url.startsWith('/v1/models')) {
        res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ data: [{ id: 'mock-claude', display_name: 'Mock Claude' }, { id: 'mock-claude-mini', display_name: 'Mock Mini' }], has_more: false }));
      }
      if (req.url.startsWith('/mcp')) {
        for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
        const server = makeMcp();
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on('close', () => { transport.close(); server.close(); });
        await server.connect(transport);
        return await transport.handleRequest(req, res, body);
      }
      res.writeHead(404, cors);
      res.end('not found');
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500, cors);
      res.end(String(e));
    }
  })
  .listen(PORT, () => console.log(`Cove mock backend on http://localhost:${PORT}`));

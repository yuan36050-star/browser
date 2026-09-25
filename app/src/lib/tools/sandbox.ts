// Runs model-written JavaScript in an opaque-origin sandboxed iframe (no access to
// this app's IndexedDB / localStorage / cookies), inside a Worker so a runaway
// loop can be terminated.

const FRAME_SRC = `<!doctype html><script>
const WORKER = \`
self.onmessage = async (e) => {
  const logs = [];
  const fmt = (a) => { try { return typeof a === 'string' ? a : JSON.stringify(a, null, 2); } catch { return String(a); } };
  const push = (lvl) => (...args) => logs.push((lvl ? '[' + lvl + '] ' : '') + args.map(fmt).join(' '));
  self.console = { log: push(''), info: push(''), warn: push('warn'), error: push('error'), debug: push('debug'), table: push('') };
  try {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const result = await new AsyncFunction(e.data.code)();
    let out;
    try { out = result === undefined ? undefined : (typeof result === 'string' ? result : JSON.stringify(result, null, 2)); } catch { out = String(result); }
    self.postMessage({ ok: true, logs, result: out });
  } catch (err) {
    self.postMessage({ ok: false, logs, error: String(err && err.stack || err) });
  }
};\`;
window.addEventListener('message', (e) => {
  const { id, code, timeout } = e.data || {};
  if (!id) return;
  let done = false;
  const reply = (msg) => { if (done) return; done = true; parent.postMessage({ id, ...msg }, '*'); };
  let worker;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' })));
  } catch (err) {
    reply({ ok: false, logs: [], error: 'Worker unavailable: ' + err });
    return;
  }
  const t = setTimeout(() => { worker.terminate(); reply({ ok: false, logs: [], error: 'Timed out after ' + timeout + 'ms' }); }, timeout);
  worker.onmessage = (ev) => { clearTimeout(t); worker.terminate(); reply(ev.data); };
  worker.onerror = (ev) => { clearTimeout(t); worker.terminate(); reply({ ok: false, logs: [], error: ev.message }); };
  worker.postMessage({ code });
});
parent.postMessage({ ready: true }, '*');
</script>`;

let frame: HTMLIFrameElement | null = null;
let ready: Promise<void> | null = null;
const waiting = new Map<string, (v: SandboxResult) => void>();

export interface SandboxResult {
  ok: boolean;
  logs: string[];
  result?: string;
  error?: string;
}

function ensureFrame(): Promise<void> {
  if (ready) return ready;
  ready = new Promise((resolve) => {
    frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.style.display = 'none';
    frame.srcdoc = FRAME_SRC;
    window.addEventListener('message', (e) => {
      if (e.source !== frame?.contentWindow) return;
      if (e.data?.ready) resolve();
      const cb = e.data?.id && waiting.get(e.data.id);
      if (cb) {
        waiting.delete(e.data.id);
        cb(e.data as SandboxResult);
      }
    });
    document.body.appendChild(frame);
  });
  return ready;
}

export async function runSandboxed(code: string, timeout = 20000, signal?: AbortSignal): Promise<SandboxResult> {
  await ensureFrame();
  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    signal?.addEventListener('abort', () => {
      waiting.delete(id);
      resolve({ ok: false, logs: [], error: 'Aborted' });
    });
    frame!.contentWindow!.postMessage({ id, code, timeout }, '*');
  });
}

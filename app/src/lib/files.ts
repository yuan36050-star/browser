import type { Attachment } from './types';
import { uid } from './util';

const MAX_IMAGE_EDGE = 1568;
const MAX_TEXT_BYTES = 4 * 1024 * 1024;
const MAX_PDF_BYTES = 32 * 1024 * 1024;

const TEXT_EXT =
  /\.(txt|md|markdown|mdx|json|jsonl|csv|tsv|js|mjs|cjs|jsx|ts|tsx|py|rb|go|rs|java|kt|kts|swift|c|h|cc|cpp|hpp|cs|php|sh|bash|zsh|ps1|bat|sql|html|htm|css|scss|less|xml|svg|yaml|yml|toml|ini|cfg|conf|env|log|tex|r|lua|pl|dart|vue|svelte|astro|gradle|properties|dockerfile|makefile|gitignore|srt|vtt)$/i;

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function looksLikeText(buf: ArrayBuffer): boolean {
  const view = new Uint8Array(buf.slice(0, 4096));
  let weird = 0;
  for (const b of view) {
    if (b === 0) return false;
    if (b < 9 || (b > 13 && b < 32)) weird++;
  }
  return weird / Math.max(1, view.length) < 0.02;
}

async function loadImage(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

function drawToCanvas(img: ImageBitmap | HTMLImageElement, maxEdge: number) {
  const w = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const h = 'naturalHeight' in img ? img.naturalHeight : img.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas, scaled: scale < 1 };
}

async function processImage(file: File): Promise<Attachment> {
  const img = await loadImage(file);
  const keepPng = file.type === 'image/png' || file.type === 'image/gif' || file.type === 'image/webp';
  const { canvas, scaled } = drawToCanvas(img, MAX_IMAGE_EDGE);
  let mime = file.type;
  let data: string;
  const passthrough = !scaled && ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) && file.size < 3.5 * 1024 * 1024;
  if (passthrough) {
    data = arrayBufferToBase64(await file.arrayBuffer());
  } else {
    mime = keepPng ? 'image/png' : 'image/jpeg';
    const url = canvas.toDataURL(mime, 0.88);
    data = url.slice(url.indexOf(',') + 1);
    if (mime === 'image/png' && data.length > 5_000_000) {
      mime = 'image/jpeg';
      const j = canvas.toDataURL(mime, 0.88);
      data = j.slice(j.indexOf(',') + 1);
    }
  }
  const thumb = drawToCanvas(img, 240).canvas.toDataURL('image/jpeg', 0.75);
  if ('close' in img) img.close();
  return {
    id: uid('a_'),
    name: file.name || 'image',
    mime,
    size: Math.round((data.length * 3) / 4),
    kind: 'image',
    data,
    preview: thumb,
  };
}

export async function readAttachment(file: File): Promise<Attachment> {
  const name = file.name || 'file';
  if (file.type.startsWith('image/') || /\.(heic|heif|png|jpe?g|webp|gif|bmp)$/i.test(name)) {
    return processImage(file);
  }
  if (file.type === 'application/pdf' || /\.pdf$/i.test(name)) {
    if (file.size > MAX_PDF_BYTES) throw new Error(`${name}: PDF is larger than 32 MB`);
    return {
      id: uid('a_'),
      name,
      mime: 'application/pdf',
      size: file.size,
      kind: 'pdf',
      data: arrayBufferToBase64(await file.arrayBuffer()),
    };
  }
  const buf = await file.arrayBuffer();
  if (file.type.startsWith('text/') || TEXT_EXT.test(name) || file.type.includes('json') || looksLikeText(buf)) {
    if (buf.byteLength > MAX_TEXT_BYTES) throw new Error(`${name}: text file is larger than 4 MB`);
    return {
      id: uid('a_'),
      name,
      mime: file.type || 'text/plain',
      size: file.size,
      kind: 'text',
      text: new TextDecoder().decode(buf),
    };
  }
  return {
    id: uid('a_'),
    name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    kind: 'binary',
    data: buf.byteLength < 8 * 1024 * 1024 ? arrayBufferToBase64(buf) : undefined,
  };
}

export function textAttachmentBlock(a: { name: string; text?: string }): string {
  return `<file name="${a.name.replace(/"/g, "'")}">\n${a.text ?? ''}\n</file>`;
}

export function pickFiles(accept: string, capture?: 'environment' | 'user'): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = !capture;
    input.accept = accept;
    if (capture) input.setAttribute('capture', capture);
    input.style.display = 'none';
    input.onchange = () => {
      resolve(Array.from(input.files ?? []));
      input.remove();
    };
    input.oncancel = () => {
      resolve([]);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  });
}

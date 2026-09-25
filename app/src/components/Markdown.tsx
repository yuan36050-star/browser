import { Check, Copy, Eye } from 'lucide-react';
import { memo, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { useT } from '../i18n';
import { copyText } from '../lib/util';
import { Sheet } from './ui';

type HastNode = { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] };

function hastText(n: HastNode | undefined): string {
  if (!n) return '';
  if (n.type === 'text') return n.value ?? '';
  return (n.children ?? []).map(hastText).join('');
}

/** Normalise LaTeX delimiters and protect currency, outside of code. */
export function prepareMarkdown(src: string): string {
  const parts = src.split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g);
  return parts
    .map((p, i) => {
      if (i % 2 === 1) return p;
      return p
        .replace(/\\\[([\s\S]+?)\\\]/g, (_, m: string) => `\n$$\n${m.trim()}\n$$\n`)
        .replace(/\\\(([\s\S]+?)\\\)/g, (_, m: string) => `$${m.trim()}$`)
        .replace(/(^|[^\\$])\$(?=\d)/g, '$1\\$');
    })
    .join('');
}

function CodeBlock({ node, children }: { node?: HastNode; children?: ReactNode }) {
  const t = useT();
  const code = node?.children?.find((c) => c.tagName === 'code');
  const cls = (code?.properties?.className as string[] | undefined) ?? [];
  const lang = cls.find((c) => c.startsWith('language-'))?.slice(9) ?? '';
  const text = hastText(code).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const previewable = ['html', 'svg', 'xml'].includes(lang.toLowerCase()) && (lang !== 'xml' || text.includes('<svg'));
  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span className="codeblock-lang">{lang || 'text'}</span>
        <span className="codeblock-actions">
          {previewable && (
            <button onClick={() => setPreview(true)}>
              <Eye size={14} /> {t('code.preview')}
            </button>
          )}
          <button
            onClick={() => {
              void copyText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              });
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t('common.copied') : t('common.copy')}
          </button>
        </span>
      </div>
      <pre>{children}</pre>
      {previewable && (
        <Sheet open={preview} onClose={() => setPreview(false)} title={t('code.preview')} size="lg">
          <iframe
            className="preview-frame"
            sandbox="allow-scripts allow-forms allow-modals allow-popups"
            srcDoc={lang === 'html' ? text : `<!doctype html><body style="margin:0;display:grid;place-items:center;min-height:100vh">${text}</body>`}
            title="preview"
          />
        </Sheet>
      )}
    </div>
  );
}

const components: Components = {
  pre: CodeBlock as Components['pre'],
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
};

const remarkPlugins = [remarkGfm, [remarkMath, { singleDollarTextMath: true }]] as never;
const rehypeFull = [[rehypeKatex, { throwOnError: false, strict: false }], [rehypeHighlight, { detect: false, ignoreMissing: true }]] as never;
const rehypeLight = [[rehypeKatex, { throwOnError: false, strict: false }]] as never;

export const Markdown = memo(function Markdown({ text, streaming }: { text: string; streaming?: boolean }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={streaming ? rehypeLight : rehypeFull} components={components}>
        {prepareMarkdown(text)}
      </ReactMarkdown>
    </div>
  );
});

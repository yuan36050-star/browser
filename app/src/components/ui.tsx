import { ChevronLeft, ChevronRight, Loader2, Menu as MenuIcon, X } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n';
import { goBack } from '../lib/router';
import { setDrawer } from '../lib/store';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="spin" aria-hidden />;
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode; loading?: boolean }) {
  return (
    <button className={cx('btn', `btn-${variant}`, `btn-${size}`, className)} {...rest} disabled={rest.disabled || loading}>
      {loading ? <Spinner size={16} /> : icon}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button className={cx('icon-btn', active && 'active', className)} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cx('switch', checked && 'on')}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <span className="knob" />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cx('segmented', size === 'sm' && 'sm')} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cx(value === o.value && 'on')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, footer, children, action }: { title?: ReactNode; footer?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="section">
      {(title || action) && (
        <div className="section-head">
          {title && <h3>{title}</h3>}
          {action}
        </div>
      )}
      <div className="group">{children}</div>
      {footer && <p className="section-foot">{footer}</p>}
    </section>
  );
}

export function Row({
  icon,
  title,
  subtitle,
  detail,
  onClick,
  chevron,
  right,
  danger,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  detail?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  right?: ReactNode;
  danger?: boolean;
  className?: string;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={cx('row', onClick && 'clickable', danger && 'danger', className)} onClick={onClick} type={onClick ? 'button' : undefined}>
      {icon && <span className="row-icon">{icon}</span>}
      <span className="row-main">
        <span className="row-title">{title}</span>
        {subtitle && <span className="row-sub">{subtitle}</span>}
      </span>
      {detail !== undefined && <span className="row-detail">{detail}</span>}
      {right}
      {chevron && <ChevronRight size={18} className="row-chev" />}
    </Tag>
  );
}

export function Field({ label, hint, children, error }: { label?: ReactNode; hint?: ReactNode; children: ReactNode; error?: string }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx('input', props.className)} spellCheck={props.spellCheck ?? false} autoCapitalize="off" autoCorrect="off" />;
}

export function TextArea({ autoGrow, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { autoGrow?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (!autoGrow || !ref.current) return;
    const el = ref.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 480)}px`;
  }, [props.value, autoGrow]);
  return <textarea ref={ref} {...props} className={cx('input', 'textarea', props.className)} />;
}

export function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select className="input select" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'warn' }) {
  return <span className={cx('badge', `badge-${tone}`)}>{children}</span>;
}

export function StatusDot({ state }: { state: 'idle' | 'connecting' | 'connected' | 'error' | 'auth' | 'off' }) {
  return <span className={cx('dot', `dot-${state}`)} aria-hidden />;
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/** Top bar for secondary screens. */
export function ScreenBar({ title, back = '/', right, onBack }: { title: ReactNode; back?: string | false; right?: ReactNode; onBack?: () => void }) {
  return (
    <header className="topbar screenbar">
      <div className="topbar-side">
        {back !== false ? (
          <IconButton label={t('common.back')} onClick={onBack ?? (() => goBack(back))}>
            <ChevronLeft size={22} />
          </IconButton>
        ) : (
          <IconButton label={t('nav.menu')} className="menu-only" onClick={() => setDrawer(true)}>
            <MenuIcon size={20} />
          </IconButton>
        )}
      </div>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-side right">{right}</div>
    </header>
  );
}

export function Screen({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className="screen scroll">
      <div className={cx('screen-inner', narrow && 'narrow')}>{children}</div>
    </div>
  );
}

/** Bottom sheet on phones, centered dialog on wide screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="sheet-root" role="dialog" aria-modal="true">
      <div className="scrim" onClick={onClose} />
      <div className={cx('sheet', `sheet-${size}`)}>
        <div className="sheet-grip" aria-hidden />
        {title && (
          <div className="sheet-head">
            <h2>{title}</h2>
            <IconButton label={t('common.close')} onClick={onClose}>
              <X size={20} />
            </IconButton>
          </div>
        )}
        <div className="sheet-body scroll">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Small anchored popover menu. */
export function Menu({
  anchor,
  open,
  onClose,
  items,
  align = 'left',
  placement = 'below',
}: {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  items: ({ label: ReactNode; icon?: ReactNode; onClick: () => void; danger?: boolean } | 'sep')[];
  align?: 'left' | 'right';
  placement?: 'above' | 'below';
}) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      ...(placement === 'below' ? { top: r.bottom + 6 } : { bottom: vh - r.top + 6 }),
      ...(align === 'left' ? { left: Math.max(8, r.left) } : { right: Math.max(8, vw - r.right) }),
    });
  }, [open, anchor, align, placement]);
  if (!open) return null;
  return createPortal(
    <div className="menu-root">
      <div className="menu-scrim" onClick={onClose} />
      <div className="menu" style={pos} role="menu">
        {items.map((it, i) =>
          it === 'sep' ? (
            <div key={i} className="menu-sep" />
          ) : (
            <button
              key={i}
              role="menuitem"
              className={cx('menu-item', it.danger && 'danger')}
              onClick={() => {
                onClose();
                it.onClick();
              }}
            >
              {it.icon}
              <span>{it.label}</span>
            </button>
          ),
        )}
      </div>
    </div>,
    document.body,
  );
}

export function useMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return {
    anchor,
    open: !!anchor,
    show: (el: HTMLElement) => setAnchor(el),
    close: () => setAnchor(null),
  };
}

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  addLabel,
}: {
  items: { key: string; value: string }[];
  onChange: (v: { key: string; value: string }[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  addLabel: string;
}) {
  return (
    <div className="kv">
      {items.map((it, i) => (
        <div className="kv-row" key={i}>
          <TextInput value={it.key} placeholder={keyPlaceholder} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
          <TextInput value={it.value} placeholder={valuePlaceholder} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          <IconButton label={t('common.remove')} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X size={16} />
          </IconButton>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...items, { key: '', value: '' }])}>
        + {addLabel}
      </Button>
    </div>
  );
}

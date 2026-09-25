import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n';
import { goBack } from '../lib/router';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const vars = (v: Record<string, string | number>) => v as CSSProperties;

/** iOS activity indicator (8 spokes, stepped rotation). */
export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg className="ios-spinner" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          x1="12"
          y1="2.8"
          x2="12"
          y2="7.4"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          opacity={0.18 + (i / 7) * 0.82}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
    </svg>
  );
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

/** iOS segmented control with a spring-sliding thumb. */
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
  const idx = options.findIndex((o) => o.value === value);
  return (
    <div className={cx('segmented', size === 'sm' && 'sm')} role="radiogroup" style={vars({ '--n': options.length, '--i': Math.max(0, idx) })}>
      {idx >= 0 && <span className="seg-thumb" aria-hidden />}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cx(value === o.value && 'on')}
          onClick={() => onChange(o.value)}
        >
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onCommit,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** Called when the drag ends (pointer/touch/key release). */
  onCommit?: (v: number) => void;
  label: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const commit = (e: { currentTarget: HTMLInputElement }) => onCommit?.(Number(e.currentTarget.value));
  return (
    <input
      type="range"
      className="slider"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      style={vars({ '--pct': `${pct}%` })}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerUp={commit}
      onTouchEnd={commit}
      onKeyUp={commit}
      onBlur={commit}
    />
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
    <Tag
      className={cx('row', onClick && 'clickable', danger && 'danger', !!icon && 'has-icon', className)}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {icon && <span className="row-icon">{icon}</span>}
      <span className="row-main">
        <span className="row-title">{title}</span>
        {subtitle && <span className="row-sub">{subtitle}</span>}
      </span>
      {detail !== undefined && <span className="row-detail">{detail}</span>}
      {right}
      {chevron && <ChevronRight size={17} className="row-chev" />}
    </Tag>
  );
}

export function Field({ label, hint, children, error }: { label?: ReactNode; hint?: ReactNode; children: ReactNode; error?: string }) {
  // A <label> would hand its whole text to the first button of a segmented control,
  // so button groups get a labelled group instead.
  const isGroup = isValidElement(children) && children.type === Segmented;
  const body = (
    <>
      {label && <span className="field-label">{label}</span>}
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </>
  );
  return isGroup ? (
    <div className="field" role="group" aria-label={typeof label === 'string' ? label : undefined}>
      {body}
    </div>
  ) : (
    <label className="field">{body}</label>
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

// ───────── Navigation bar + large title ─────────

/** Tracks the iOS large-title states for a scroll view: scrolled (hard edge on) and collapsed (inline title). */
export function useLargeTitle() {
  const [state, setState] = useState({ scrolled: false, collapsed: false });
  const titleRef = useRef<HTMLHeadingElement>(null);
  const current = useRef(state);
  const onScroll = useCallback((el: HTMLElement) => {
    const y = el.scrollTop;
    const title = titleRef.current;
    if (title) {
      // Rubber-band pull: the large title grows a little, like UIKit.
      title.style.transform = y < 0 ? `scale(${1 + Math.min(-y, 140) / 700})` : '';
    }
    const inset = parseFloat(getComputedStyle(el).paddingTop) || 0;
    const threshold = title ? title.offsetTop + title.offsetHeight - inset - 6 : 0;
    const next = { scrolled: y > 2, collapsed: !title || y > threshold };
    if (next.scrolled !== current.current.scrolled || next.collapsed !== current.current.collapsed) {
      current.current = next;
      setState(next);
    }
  }, []);
  return { state, titleRef, onScroll };
}

/** Tapping the active tab at its root scrolls that tab's page back to the top. */
export function useScrollTopSignal(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const on = () => ref.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('cove:scroll-top', on);
    return () => window.removeEventListener('cove:scroll-top', on);
  }, [ref]);
}

export function NavBar({
  title,
  back,
  left,
  right,
  scrolled,
  collapsed,
  onTitleClick,
}: {
  title: ReactNode;
  back?: string;
  left?: ReactNode;
  right?: ReactNode;
  scrolled: boolean;
  collapsed: boolean;
  onTitleClick?: (el: HTMLElement) => void;
}) {
  return (
    <header className={cx('navbar', scrolled && 'scrolled', collapsed && 'collapsed')}>
      <div className="navbar-side">
        {back !== undefined ? (
          <IconButton className="nav-btn" label={t('common.back')} onClick={() => goBack(back)}>
            <ChevronLeft size={25} />
          </IconButton>
        ) : (
          left
        )}
      </div>
      <div className="navbar-title">
        {onTitleClick ? (
          <button className="navbar-title-btn" onClick={(e) => onTitleClick(e.currentTarget)}>
            {title}
          </button>
        ) : (
          <span>{title}</span>
        )}
      </div>
      <div className="navbar-side right">{right}</div>
    </header>
  );
}

/** An iOS page: glass nav bar + scroll view that starts with a 34pt large title. */
export function Page({
  title,
  back,
  left,
  right,
  children,
  narrow,
  largeTitle = true,
  className,
}: {
  title: ReactNode;
  /** Fallback path for the back chevron; omit on tab roots. */
  back?: string;
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  narrow?: boolean;
  largeTitle?: boolean;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { state, titleRef, onScroll } = useLargeTitle();
  useScrollTopSignal(scrollRef);
  return (
    <div className={cx('page', back !== undefined && 'pushed', className)}>
      <NavBar title={title} back={back} left={left} right={right} scrolled={state.scrolled} collapsed={!largeTitle || state.collapsed} />
      <div className="page-scroll scroll" ref={scrollRef} onScroll={(e) => onScroll(e.currentTarget)}>
        <div className={cx('page-inner', narrow && 'narrow')}>
          {largeTitle && (
            <h1 ref={titleRef} className="large-title">
              {title}
            </h1>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// ───────── Sheets ─────────

/** iOS bottom sheet: spring entrance, grabber, drag down to dismiss. Never a centered dialog. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  variant = 'default',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'action';
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; t0: number; dy: number } | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const h = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, 280);
    return () => clearTimeout(h);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, select')) return;
    drag.current = { y0: e.clientY, t0: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !sheetRef.current) return;
    const raw = e.clientY - d.y0;
    d.dy = raw > 0 ? raw : -Math.sqrt(-raw) * 2; // rubber band upward
    sheetRef.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    const el = sheetRef.current;
    if (!d || !el) return;
    const velocity = d.dy / Math.max(1, performance.now() - d.t0);
    el.style.transition = '';
    if (d.dy > 110 || velocity > 0.7) onClose();
    else el.style.transform = '';
  };

  if (!mounted) return null;
  return createPortal(
    <div className={cx('sheet-root', closing && 'closing')} role="dialog" aria-modal="true">
      <div className="scrim" onClick={onClose} />
      <div ref={sheetRef} className={cx('sheet glass strong', `sheet-${size}`, variant === 'action' && 'sheet-action')}>
        <div className="sheet-grab" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <div className="grabber" aria-hidden />
          {title && (
            <div className="sheet-head">
              <span className="sheet-head-side" />
              <h2>{title}</h2>
              <span className="sheet-head-side right">
                {variant !== 'action' && (
                  <IconButton className="sheet-close" label={t('common.close')} onClick={onClose}>
                    <X size={17} />
                  </IconButton>
                )}
              </span>
            </div>
          )}
        </div>
        <div className="sheet-body scroll">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ───────── Context menus ─────────

type MenuItem = { label: ReactNode; icon?: ReactNode; onClick: () => void; danger?: boolean };

/** iOS context menu: glass, label on the left, symbol on the right, springs out of its anchor. */
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
  items: (MenuItem | 'sep')[];
  align?: 'left' | 'right';
  placement?: 'above' | 'below';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number; origin: string }>({ origin: 'top left' });
  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const h = ref.current?.offsetHeight ?? items.length * 46;
    let below = placement === 'below';
    if (below && r.bottom + 8 + h > vh - 8) below = false;
    if (!below && r.top - 8 - h < 8) below = true;
    const width = ref.current?.offsetWidth ?? 250;
    const alignLeft = align === 'left' ? r.left + width <= vw - 8 : r.right - width < 8;
    setPos({
      ...(below ? { top: r.bottom + 8 } : { bottom: vh - r.top + 8 }),
      ...(alignLeft ? { left: Math.max(8, r.left) } : { right: Math.max(8, vw - r.right) }),
      origin: `${below ? 'top' : 'bottom'} ${alignLeft ? 'left' : 'right'}`,
    });
  }, [open, anchor, align, placement, items.length]);
  if (!open) return null;
  return createPortal(
    <div className="menu-root">
      <div className="menu-scrim" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <div ref={ref} className="menu glass strong" style={{ top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right, transformOrigin: pos.origin }} role="menu">
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
              <span>{it.label}</span>
              {it.icon}
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

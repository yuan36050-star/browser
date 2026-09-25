import { create } from 'zustand';

export interface DialogField {
  label?: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
}

interface DialogState {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  field?: DialogField;
  resolve?: (v: string | boolean | null) => void;
}

export const useDialog = create<DialogState>(() => ({ open: false, title: '' }));

export function confirmDialog(opts: { title: string; message?: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    useDialog.setState({ open: true, ...opts, field: undefined, resolve: (v) => resolve(v === true) });
  });
}

export function promptDialog(opts: { title: string; message?: string; confirmLabel?: string; field: DialogField }): Promise<string | null> {
  return new Promise((resolve) => {
    useDialog.setState({
      open: true,
      danger: false,
      ...opts,
      resolve: (v) => resolve(typeof v === 'string' ? v : null),
    });
  });
}

export function closeDialog(v: string | boolean | null) {
  const r = useDialog.getState().resolve;
  useDialog.setState({ open: false, resolve: undefined });
  r?.(v);
}

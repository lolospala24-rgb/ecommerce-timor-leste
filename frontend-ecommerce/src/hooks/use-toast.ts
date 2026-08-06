import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
  variant?: 'default' | 'destructive';
}

export interface ToastActionElement {
  altText: string;
  action: React.ReactNode;
}

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = Toast & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type ActionType = typeof actionTypes;

interface State {
  toasts: ToasterToast[];
}

interface Action {
  type: keyof ActionType;
  toast?: ToasterToast;
  toastId?: string;
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const useToast = () => {
  const [state, setState] = useState<State>({
    toasts: [],
  });

  const addToast = useCallback(
    (toast: Omit<ToasterToast, 'id'>) => {
      const id = genId();

      const update = (props: ToasterToast) => {
        setState((state) => ({
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === id ? { ...t, ...props } : t
          ),
        }));
      };

      const dismiss = () => update({ id, open: false } as ToasterToast);

      setState((state) => ({
        ...state,
        toasts: [
          { ...toast, id, open: true, onOpenChange: dismiss },
          ...state.toasts,
        ].slice(0, TOAST_LIMIT),
      }));

      return {
        id: id,
        dismiss,
        update,
      };
    },
    []
  );

  const dismissToast = useCallback((toastId?: string) => {
    if (toastId) {
      addToRemoveQueue(toastId);
    } else {
      setState((state) => ({
        ...state,
        toasts: [],
      }));
    }
  }, []);

  return {
    toasts: state.toasts,
    toast: addToast,
    dismiss: dismissToast,
  };
};

export type ToastType = "success" | "error" | "info";

export type ToastPayload = {
  id: number;
  message: string;
  type: ToastType;
};

type Listener = (t: ToastPayload) => void;

const listeners = new Set<Listener>();
let idSeq = 0;

export function subscribeToast(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function showToast(message: string, type: ToastType = "info"): void {
  const payload: ToastPayload = { id: ++idSeq, message, type };
  listeners.forEach((l) => l(payload));
}

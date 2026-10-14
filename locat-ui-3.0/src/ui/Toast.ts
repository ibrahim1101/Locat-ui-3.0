import { createContext, useContext } from "react";

export type ToastTone = "ok" | "danger" | "warn" | "neutral" | "pending";
export type ToastItem = { id: number; title: string; body?: string; tone: ToastTone };
export type ToastApi = { show(t: Omit<ToastItem, "id">): void };
export const ToastContext = createContext<ToastApi>({ show: () => undefined });

export const useToast = () => useContext(ToastContext);

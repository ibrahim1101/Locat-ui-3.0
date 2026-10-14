import { useCallback } from "react";
import type { OperationResult } from "@/contracts/common";
import { useToast } from "@/ui/Toast";

/**
 * Turns any OperationResult into honest feedback. `integration-pending` is never
 * shown as success — it renders the "Preview · not connected" toast.
 */
export function useReport() {
  const toast = useToast();
  return useCallback(<T,>(result: OperationResult<T>, success: string) => {
    switch (result.status) {
      case "ok": toast.show({ title: success, tone: "ok" }); break;
      case "integration-pending": toast.show({ title: "Preview only — nothing was sent or saved", body: result.reason, tone: "pending" }); break;
      case "error": toast.show({ title: result.message, tone: "danger" }); break;
      case "denied": toast.show({ title: "Not allowed", body: result.reason, tone: "danger" }); break;
      case "unsupported": toast.show({ title: "Unsupported here", body: result.reason, tone: "warn" }); break;
    }
    return result;
  }, [toast]);
}

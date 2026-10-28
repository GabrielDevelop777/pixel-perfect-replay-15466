import { STATUS_LABEL } from "@/lib/account";
import { cn } from "@/lib/utils";

const STYLE: Record<string, string> = {
  queued: "border-warning/40 text-warning",
  processing: "border-neon/40 text-neon",
  completed: "border-success/40 text-success",
  failed: "border-destructive/40 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs", STYLE[status])}>
      {(status === "processing" || status === "queued") && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

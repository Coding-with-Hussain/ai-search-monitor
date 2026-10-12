import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex gap-3 rounded-xl border p-4 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", {
  variants: {
    variant: {
      info: "border-primary/20 bg-primary-soft text-primary-soft-foreground",
      success: "border-success/25 bg-success-soft text-success-text",
      warning: "border-warning/40 bg-warning-soft text-warning-text",
      danger: "border-danger/30 bg-danger-soft text-danger-text",
      neutral: "border-border bg-surface-muted text-muted-foreground",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert, neutral: Info };

function Alert({
  className,
  variant = "info",
  title,
  children,
  action,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & { title?: React.ReactNode; action?: React.ReactNode }) {
  const Icon = icons[variant ?? "info"];
  return (
    <div role={variant === "danger" ? "alert" : "status"} className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium text-foreground">{title}</p>}
        {children && <div className={cn(title && "mt-1", "text-[13px] leading-relaxed")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export { Alert };

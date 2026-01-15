import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        success:
          "border-green-500/50 bg-green-50 text-green-900 dark:border-green-500/30 dark:bg-green-950/50 dark:text-green-100 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
        error:
          "border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/30 dark:bg-destructive/10 dark:text-destructive [&>svg]:text-destructive",
        warning:
          "border-amber-500/50 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-100 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        info: "border-blue-500/50 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-950/50 dark:text-blue-100 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const alertIconMap = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode;
  onClose?: () => void;
}

function Alert({
  className,
  variant = "default",
  icon,
  onClose,
  children,
  ...props
}: AlertProps) {
  const IconComponent = alertIconMap[variant ?? "default"];

  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {icon ?? <IconComponent className="size-4" />}
      {children}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Dismiss"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };

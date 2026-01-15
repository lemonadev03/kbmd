"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group bg-card/95 backdrop-blur-md border-border text-foreground shadow-lg rounded-xl",
          title: "text-foreground font-medium",
          description: "text-muted-foreground text-sm",
          actionButton: "bg-primary text-primary-foreground hover:bg-primary/90",
          cancelButton: "bg-muted text-muted-foreground hover:bg-muted/80",
          closeButton:
            "bg-background border-border text-foreground hover:bg-accent",
          success: "border-l-4 border-l-green-500 dark:border-l-green-400",
          error: "border-l-4 border-l-destructive",
          warning: "border-l-4 border-l-amber-500 dark:border-l-amber-400",
          info: "border-l-4 border-l-blue-500 dark:border-l-blue-400",
        },
      }}
    />
  );
}

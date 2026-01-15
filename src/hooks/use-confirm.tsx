"use client";

import * as React from "react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

const initialState: ConfirmState = {
  isOpen: false,
  title: "",
  description: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  variant: "default",
  resolve: null,
};

const ConfirmContext = React.createContext<{
  state: ConfirmState;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
} | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState>(initialState);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  React.useEffect(() => {
    resolveRef.current = state.resolve;
  }, [state.resolve]);

  const confirm = React.useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setState({
          ...initialState,
          ...options,
          isOpen: true,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState(initialState);
  }, []);

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState(initialState);
  }, []);

  return (
    <ConfirmContext.Provider
      value={{ state, confirm, handleConfirm, handleCancel }}
    >
      {children}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}

export function useConfirmState() {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirmState must be used within a ConfirmProvider");
  }
  return context;
}

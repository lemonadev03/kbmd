import { toast as sonnerToast, type ExternalToast } from "sonner";

interface ToastOptions extends ExternalToast {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    sonnerToast.success(message, options),

  error: (message: string, options?: ToastOptions) =>
    sonnerToast.error(message, options),

  warning: (message: string, options?: ToastOptions) =>
    sonnerToast.warning(message, options),

  info: (message: string, options?: ToastOptions) =>
    sonnerToast.info(message, options),

  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: Error) => string);
    }
  ) => sonnerToast.promise(promise, options),

  dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
};

import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmProvider } from "@/hooks/use-confirm";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const metadata: Metadata = {
  title: "Knowledge Base",
  description: "A clean, searchable knowledge base editor.",
};

const themeScript = `
(() => {
  try {
    const storageKey = "kb-theme";
    const stored = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "dark" || stored === "light" ? stored : (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (err) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="font-sans antialiased">
        <ConfirmProvider>
          {children}
          <ConfirmDialog />
        </ConfirmProvider>
        <Toaster />
      </body>
    </html>
  );
}

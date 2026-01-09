"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Skeleton */}
      <aside className="fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <div className="p-3 space-y-2">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <div className="pt-2 space-y-2 pl-6">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* Search Bar */}
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>

          {/* Custom Rules Section */}
          <div className="mb-6 border rounded-lg">
            <div className="p-3 flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="p-4 border-t">
              <Skeleton className="h-32 w-full rounded-md" />
            </div>
          </div>

          {/* Variables Section */}
          <div className="mb-6 border rounded-lg">
            <div className="p-3 flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div className="border-t p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-24 rounded" />
                <Skeleton className="h-4 w-3" />
                <Skeleton className="h-7 flex-1 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-32 rounded" />
                <Skeleton className="h-4 w-3" />
                <Skeleton className="h-7 flex-1 rounded" />
              </div>
            </div>
          </div>

          {/* FAQ Section Skeleton */}
          {[1, 2].map((i) => (
            <div key={i} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-7 w-40" />
              </div>
              <div className="border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="flex bg-muted/50 border-b p-2">
                  <Skeleton className="h-4 w-20 mx-2" />
                  <Skeleton className="h-4 w-16 mx-2" />
                  <Skeleton className="h-4 w-12 mx-2" />
                </div>
                {/* Rows */}
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex border-b last:border-b-0 p-3 gap-4">
                    <Skeleton className="h-16 w-[30%]" />
                    <Skeleton className="h-16 w-[40%]" />
                    <Skeleton className="h-16 w-[30%]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

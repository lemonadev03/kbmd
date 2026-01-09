"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ContentSkeleton() {
  return (
    <>
      {/* Custom Rules Section Skeleton */}
      <div className="mb-6 border rounded-lg">
        <div className="p-3 flex items-center gap-2 border-b">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-4">
          <Skeleton className="h-40 w-full rounded-md" />
        </div>
      </div>

      {/* Variables Section Skeleton */}
      <div className="mb-6 border rounded-lg">
        <div className="p-3 flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="border-t p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-28 rounded" />
            <Skeleton className="h-4 w-3" />
            <Skeleton className="h-7 flex-1 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-36 rounded" />
            <Skeleton className="h-4 w-3" />
            <Skeleton className="h-7 flex-1 rounded" />
          </div>
        </div>
      </div>

      {/* FAQ Section Skeletons */}
      {[1, 2].map((i) => (
        <div key={i} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-7 w-44" />
          </div>
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex bg-muted/50 border-b">
              <div className="w-[30%] p-2 px-3">
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="w-[40%] p-2 px-3">
                <Skeleton className="h-4 w-14" />
              </div>
              <div className="w-[30%] p-2 px-3">
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
            {/* Rows */}
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex border-b last:border-b-0">
                <div className="w-[30%] p-3">
                  <Skeleton className="h-14 w-full rounded" />
                </div>
                <div className="w-[40%] p-3">
                  <Skeleton className="h-14 w-full rounded" />
                </div>
                <div className="w-[30%] p-3">
                  <Skeleton className="h-14 w-full rounded" />
                </div>
              </div>
            ))}
            {/* Add FAQ row */}
            <div className="flex items-center gap-2 p-2 px-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

"use client";

import { Suspense } from "react";
import JobFeeContent from "./JobFeeContent";

export default function JobFeePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <JobFeeContent />
    </Suspense>
  );
}
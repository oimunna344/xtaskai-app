"use client";
import { Suspense } from "react";
import CheckinContent from "./CheckinContent";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

export default function CheckinPage() {
  return <Suspense fallback={<LoadingScreen />}><CheckinContent /></Suspense>;
}

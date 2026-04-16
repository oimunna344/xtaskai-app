"use client";
import { Suspense } from "react";
import LotteryBuyContent from "./LotteryBuyContent";

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

export default function LotteryBuyPage() {
  return <Suspense fallback={<LoadingScreen />}><LotteryBuyContent /></Suspense>;
}

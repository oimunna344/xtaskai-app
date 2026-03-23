import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { address, referralCode } = await req.json();
    
    // Simple session creation
    const sessionId = Math.random().toString(36).substring(2, 15);
    
    return NextResponse.json({ 
      success: true, 
      sessionId,
      address,
      referralCode
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Verification failed" });
  }
}
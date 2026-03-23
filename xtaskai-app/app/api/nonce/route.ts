import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { address } = await req.json();
  const nonce = Math.random().toString(36).substring(2, 15);
  return NextResponse.json({ nonce });
}
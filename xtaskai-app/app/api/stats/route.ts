import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://xtaskai.com/base-mini-app/api/get-stats.php");
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ users: 58, tasks: 18, earned: 0.22 });
  }
}
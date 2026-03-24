import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ username: null }, { status: 401 })
  }
  return NextResponse.json({ username: session.username })
}

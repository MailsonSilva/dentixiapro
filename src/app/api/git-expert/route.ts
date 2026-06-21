import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "deprecated", message: "Use .agent/skills/git-expert/SKILL.md instead." });
}

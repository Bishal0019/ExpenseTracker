import connectDB from "@/lib/mongodb";
import MonthSummary from "@/models/MonthSummary";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const monthGroup = searchParams.get("month");

  try {
    // Look for the summary belonging to this SPECIFIC user
    const summary = await MonthSummary.findOne({ monthGroup, userId });
    return NextResponse.json(summary || { initialBalance: 0 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  try {
    const { monthGroup, initialBalance } = await req.json();

    const summary = await MonthSummary.findOneAndUpdate(
      { monthGroup, userId }, // Filter by both month AND userId
      { initialBalance },
      { upsert: true, new: true }
    );

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
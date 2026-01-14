import connectDB from "@/lib/mongodb";
import MonthSummary from "@/models/MonthSummary";
import Transaction from "@/models/Transaction"; // Import this to clean up both collections
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  try {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    const cutOffMonth = d.toISOString().substring(0, 7);

    // Clean up ONLY this user's old data
    await MonthSummary.deleteMany({ userId, monthGroup: { $lt: cutOffMonth } });
    await Transaction.deleteMany({ userId, monthGroup: { $lt: cutOffMonth } });

    const summaries = await MonthSummary.find({ userId }).sort({ monthGroup: -1 });
    return NextResponse.json(summaries);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
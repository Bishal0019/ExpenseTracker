import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import MonthSummary from "@/models/MonthSummary";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server"; // Import Clerk Auth

// 1. GET: Fetch transactions for the current user and current month
export async function GET() {
  try {
    const { userId } = await auth();
    
    // Check if user is logged in
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const currentMonth = new Date().toISOString().substring(0, 7); // e.g., "2026-01"
    
    // FILTER: We now only find transactions belonging to THIS userId
    const transactions = await Transaction.find({ 
      userId: userId, 
      monthGroup: currentMonth 
    });
    
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// 2. POST: Save a new transaction and update the summary for this specific user
export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { description, amount, type, date } = body;
    const monthGroup = date.substring(0, 7);

    // Create the transaction and attach the userId
    const newTransaction = await Transaction.create({ 
      ...body, 
      monthGroup, 
      userId // CRITICAL: Link this transaction to the logged-in user
    });

    // Update the Summary for THIS user only
    const updateLogic = type === 'expense' 
      ? { $inc: { totalExpenses: amount, currentBalance: -amount } }
      : { $inc: { totalCredits: amount, currentBalance: amount } };

    await MonthSummary.findOneAndUpdate(
      { monthGroup, userId }, // Ensure we only update the summary for THIS user
      updateLogic,
      { upsert: true, new: true } 
    );

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
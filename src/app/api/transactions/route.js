import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import MonthSummary from "@/models/MonthSummary";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// 1. GET: Fetch transactions for the current user and current month
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    const transactions = await Transaction.find({ 
      userId: userId, 
      monthGroup: currentMonth 
    });
    
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// 2. POST: Save a new transaction and update the summary
export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { amount, type, date } = body;
    const monthGroup = date.substring(0, 7);

    const newTransaction = await Transaction.create({ 
      ...body, 
      monthGroup, 
      userId 
    });

    const updateLogic = type === 'expense' 
      ? { $inc: { totalExpenses: amount, currentBalance: -amount } }
      : { $inc: { totalCredits: amount, currentBalance: amount } };

    await MonthSummary.findOneAndUpdate(
      { monthGroup, userId },
      updateLogic,
      { upsert: true, new: true } 
    );

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. DELETE: Remove a transaction and reverse its impact on the summary
export async function DELETE(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await connectDB();

    // 1. Find the transaction first to know its amount and type
    const transaction = await Transaction.findOne({ _id: id, userId });
    if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    // 2. Reverse the math in MonthSummary
    const reverseUpdate = transaction.type === 'expense'
      ? { $inc: { totalExpenses: -transaction.amount, currentBalance: transaction.amount } }
      : { $inc: { totalCredits: -transaction.amount, currentBalance: -transaction.amount } };

    await MonthSummary.findOneAndUpdate(
      { monthGroup: transaction.monthGroup, userId },
      reverseUpdate
    );

    // 3. Delete the transaction
    await Transaction.findByIdAndDelete(id);

    return NextResponse.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

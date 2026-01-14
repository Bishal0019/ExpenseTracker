import connectDB from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import MonthSummary from "@/models/MonthSummary";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const currentMonth = new Date().toISOString().substring(0, 7);

    const transactions = await Transaction.find({
      userId,
      monthGroup: currentMonth,
    }).sort({ createdAt: 1 });

    return NextResponse.json(transactions, { status: 200 });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const body = await req.json();

    const description = (body.description || "").trim();
    const type = body.type;
    const date = body.date;
    const numericAmount = Number(body.amount);

    if (!description || !type || !date || isNaN(numericAmount)) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    const monthGroup = date.substring(0, 7);

    const newTransaction = await Transaction.create({
      userId,
      monthGroup,
      description,
      amount: numericAmount,
      type,
      date,
    });

    await MonthSummary.updateOne(
      { userId, monthGroup },
      {
        $setOnInsert: {
          userId,
          monthGroup,
          initialBalance: 0,
          totalExpenses: 0,
          totalCredits: 0,
          currentBalance: 0,
        },
      },
      { upsert: true }
    );

    const incUpdate =
      type === "expense"
        ? { totalExpenses: numericAmount, currentBalance: -numericAmount }
        : { totalCredits: numericAmount, currentBalance: numericAmount };

    await MonthSummary.updateOne(
      { userId, monthGroup },
      { $inc: incUpdate }
    );

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to save transaction", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await connectDB();

    const transaction = await Transaction.findOne({ _id: id, userId });
    if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    const amt = Number(transaction.amount) || 0;

    const reverseInc =
      transaction.type === "expense"
        ? { totalExpenses: -amt, currentBalance: amt }
        : { totalCredits: -amt, currentBalance: -amt };

    await MonthSummary.updateOne(
      { userId, monthGroup: transaction.monthGroup },
      { $inc: reverseInc }
    );

    await Transaction.findByIdAndDelete(id);

    return NextResponse.json({ message: "Transaction deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction", details: error.message },
      { status: 500 }
    );
  }
}

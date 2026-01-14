import mongoose from "mongoose";

const MonthSummarySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },

    monthGroup: { type: String, required: true },

    initialBalance: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

MonthSummarySchema.index({ userId: 1, monthGroup: 1 }, { unique: true });

export default mongoose.models.MonthSummary ||
  mongoose.model("MonthSummary", MonthSummarySchema);

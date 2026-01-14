import mongoose from 'mongoose';

const MonthSummarySchema = new mongoose.Schema({
  monthGroup: { type: String, required: true, unique: true }, // e.g., "2026-01"
  initialBalance: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  totalCredits: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.MonthSummary || mongoose.model('MonthSummary', MonthSummarySchema);
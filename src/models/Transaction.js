import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['expense', 'credit'], required: true },
  date: { type: String, required: true },
  monthGroup: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
'use client'
import { useState, useEffect, use } from 'react';
import Link from 'next/link';

export default function MonthDetailPage({ params }) {
  // Use 'use' hook to unwrap the params object (Standard for Next.js 15)
  const resolvedParams = use(params);
  const month = resolvedParams.month; // This MUST match the folder name [month]

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonthData = async () => {
      try {
        const res = await fetch('/api/transactions');
        const data = await res.json();
        
        // Filter transactions where the date string (YYYY-MM-DD) 
        // starts with our month string (YYYY-MM)
        const filtered = data.filter(t => t.date.startsWith(month));
        setTransactions(filtered);
      } catch (err) {
        console.error("Error loading month details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (month) fetchMonthData();
  }, [month]);

  // UI Helper: Converts "2026-01" to "January 2026"
  const displayTitle = month 
    ? new Date(month + "-02").toLocaleString('default', { month: 'long', year: 'numeric' })
    : "Loading...";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/history" className="text-amber-600 hover:underline mb-6 inline-block font-medium">
          ← Back to All History
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 bg-white border-b border-gray-100">
            <h1 className="text-3xl font-bold text-gray-800">{displayTitle}</h1>
            <p className="text-gray-500">Transaction Breakdown</p>
          </div>

          {loading ? (
            <div className="p-20 text-center text-amber-500 font-medium">Loading transactions...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-gray-600 font-semibold">Date</th>
                  <th className="p-4 text-gray-600 font-semibold">Description</th>
                  <th className="p-4 text-right text-gray-600 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-500">{t.date}</td>
                    <td className="p-4 font-medium text-gray-800">{t.description}</td>
                    <td className={`p-4 text-right font-bold ${t.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                      {t.type === 'expense' ? '-' : '+'} ${t.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && transactions.length === 0 && (
            <div className="p-20 text-center text-gray-400 italic">
              No transactions found for this month.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link'; // Import Link for navigation

export default function HistoryPage() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/history'); 
        const data = await res.json();
        setSummaries(data);
      } catch (err) {
        console.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="container mx-auto p-10 max-w-4xl">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Financial History</h1>
          <p className="text-gray-500 mt-2">Track your monthly performance at a glance.</p>
        </div>
        
        {/* Storage Notice */}
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-right">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-tight">Cloud Storage Optimization</p>
          <p className="text-[11px] text-amber-700">Records older than 12 months are auto-deleted.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {summaries.map((s) => (
            /* CHANGE: Wrapped the div in a Link component for dynamic navigation */
            <Link 
              href={`/history/${s.monthGroup}`} 
              key={s._id} 
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-amber-400 hover:shadow-md transition-all group"
            >
              <div>
                <h3 className="text-xl font-bold text-gray-700 group-hover:text-amber-600 transition-colors">
                  {new Date(s.monthGroup + "-02").toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-sm text-gray-500 font-medium">Starting Balance: ${s.initialBalance.toLocaleString()}</p>
              </div>
              
              <div className="flex gap-10 text-right items-center">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Spent</p>
                  <p className="text-lg font-bold text-red-500">-${s.totalExpenses.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Saved</p>
                  <p className="text-lg font-bold text-green-500">+${s.totalCredits.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Final</p>
                  <p className="text-lg font-bold text-gray-800">${s.currentBalance.toLocaleString()}</p>
                </div>
                {/* Arrow indicator to show it is clickable */}
                <div className="text-gray-300 group-hover:text-amber-500 transition-colors pl-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}

          {summaries.length === 0 && (
            <div className="text-center bg-gray-50 rounded-xl py-20 border-2 border-dashed border-gray-200">
              <p className="text-gray-400 italic">No history found yet. Start by adding data to your dashboard!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
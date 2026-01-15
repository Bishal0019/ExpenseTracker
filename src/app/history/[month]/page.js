'use client'
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function MonthDetailPage({ params }) {
  const resolvedParams = use(params);
  const month = resolvedParams.month;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchMonthData = async () => {
      try {
        const res = await fetch('/api/transactions', { cache: "no-store" });
        const data = await res.json();

        const filtered = Array.isArray(data)
          ? data.filter(t => t.date?.startsWith(month))
          : [];

        setTransactions(filtered);
      } catch (err) {
        console.error("Error loading month details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (month) fetchMonthData();
  }, [month]);

  const displayTitle = month
    ? new Date(month + "-02").toLocaleString('default', { month: 'long', year: 'numeric' })
    : "Loading...";

  // ✅ Make amount PDF-safe + consistent width
  const formatAmountForPDF = (amount = 0) => {
    const num = Number(amount || 0);
    // fixed 2 decimals and NO commas (avoid weird spacing)
    return num.toFixed(2);
  };

  const handleDownloadPDF = async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      const doc = new jsPDF();

      // ----- HEADER -----
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(17, 24, 39);
      doc.text("Expense", 14, 18);

      const expenseWidth = doc.getTextWidth("Expense");
      doc.setTextColor(245, 158, 11);
      doc.text("Tracker", 14 + expenseWidth + 2, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(107, 114, 128);
      doc.text(`Your transactions in ${displayTitle}`, 14, 28);

      doc.setDrawColor(229, 231, 235);
      doc.line(14, 32, 196, 32);

      // ----- TABLE DATA -----
      const rows = transactions.map((t) => {
        const sign = t.type === "expense" ? "-" : "+";
        const amt = formatAmountForPDF(t.amount);

        return [
          t.date || "-",
          t.description || "-",
          t.type === "expense" ? "Expense" : "Credit",
          `${sign} ₹${amt}`, // ✅ consistent formatting
        ];
      });

      autoTable(doc, {
        startY: 38,
        head: [["Date", "Description", "Type", "Amount"]],
        body: rows,
        styles: {
          font: "helvetica",
          fontSize: 10,
          textColor: [55, 65, 81],
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [249, 250, 251],
          textColor: [55, 65, 81],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 80 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35, halign: "right" },
        },

        // ✅ Fix amount weird sizing + gaps by forcing monospace on Amount column
        didParseCell: function (data) {
          if (data.section === "body" && data.column.index === 3) {
            const rowIndex = data.row.index;
            const tx = transactions[rowIndex];

            // ✅ Make digits perfectly aligned (fixed width)
            data.cell.styles.font = "courier";
            data.cell.styles.fontStyle = "bold";

            if (tx?.type === "expense") {
              data.cell.styles.textColor = [239, 68, 68];
            } else {
              data.cell.styles.textColor = [34, 197, 94];
            }
          }
        },
      });

      doc.save(`ExpenseTracker_${month}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/history"
          className="text-amber-600 hover:underline mb-6 inline-block font-medium"
        >
          ← Back to All History
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 break-words">
                  {displayTitle}
                </h1>
                <p className="text-gray-500">Transaction Breakdown</p>
              </div>

              {/* ✅ Download PDF Button */}
              <button
                onClick={handleDownloadPDF}
                disabled={loading || isDownloading || transactions.length === 0}
                className={`bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-100 transition-all w-full sm:w-auto ${
                  loading || isDownloading || transactions.length === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-amber-600 active:scale-95'
                }`}
              >
                {isDownloading ? "Preparing PDF..." : "Download PDF"}
              </button>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="p-16 sm:p-20 text-center text-amber-500 font-medium">
              Loading transactions...
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left min-w-[520px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-gray-600 font-semibold whitespace-nowrap">Date</th>
                    <th className="p-4 text-gray-600 font-semibold">Description</th>
                    <th className="p-4 text-right text-gray-600 font-semibold whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr
                      key={t._id}
                      className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                        {t.date}
                      </td>
                      <td className="p-4 font-medium text-gray-800 break-words">
                        {t.description}
                      </td>
                      <td
                        className={`p-4 text-right font-bold whitespace-nowrap ${
                          t.type === 'expense' ? 'text-red-500' : 'text-green-500'
                        }`}
                      >
                        {t.type === 'expense' ? '-' : '+'} ₹{Number(t.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && transactions.length === 0 && (
            <div className="p-16 sm:p-20 text-center text-gray-400 italic">
              No transactions found for this month.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

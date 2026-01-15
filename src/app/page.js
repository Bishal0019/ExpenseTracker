'use client';
import { useState, useEffect } from 'react';
import { useUser, SignInButton } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn, isLoaded, user } = useUser();

  const getCurrentMonthStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const getTodayStr = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
  };

  const [currentSystemMonth, setCurrentSystemMonth] = useState(getCurrentMonthStr());
  const [initialBalance, setInitialBalance] = useState('0');
  const [transactions, setTransactions] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [date, setDate] = useState(getTodayStr()); // ✅ always today by default

  // ✅ Freeze states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ✅ Fetch transactions safely (always fresh)
  const fetchTransactions = async () => {
    try {
      const tRes = await fetch('/api/transactions', { cache: "no-store" });
      const tData = await tRes.json();
      if (Array.isArray(tData)) setTransactions(tData);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };
  const fetchSummary = async (month) => {
    try {
      const sRes = await fetch(`/api/summary?month=${month}`, { cache: "no-store" });
      const sData = await sRes.json();

      if (sData && typeof sData.initialBalance !== "undefined") {
        setInitialBalance(String(sData.initialBalance));
      } else {
        setInitialBalance('0');
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
      setInitialBalance('0');
    }
  };

  useEffect(() => {
    if (!isSignedIn) return;

    const fetchData = async () => {
      const month = getCurrentMonthStr();
      setCurrentSystemMonth(month);

      await Promise.all([
        fetchTransactions(),
        fetchSummary(month),
      ]);
      setDate(getTodayStr());
    };

    fetchData();
  }, [isSignedIn]);
  useEffect(() => {
    if (!isSignedIn) return;

    const interval = setInterval(async () => {
      const nowMonth = getCurrentMonthStr();
      if (nowMonth !== currentSystemMonth) {
        setCurrentSystemMonth(nowMonth);
        // ✅ Reset UI state
        setTransactions([]);
        setInitialBalance('0');

        // ✅ Reset date to today
        setDate(getTodayStr());

        // ✅ refetch from DB for new month
        await Promise.all([
          fetchTransactions(),
          fetchSummary(nowMonth),
        ]);
      }
    }, 1000 * 60);

    return () => clearInterval(interval);
  }, [currentSystemMonth, isSignedIn]);

  const handleBalanceChange = async (e) => {
    const rawValue = e.target.value;
    setInitialBalance(rawValue);

    const numericVal = Number(rawValue);
    const safeValue = isNaN(numericVal) ? 0 : numericVal;

    try {
      await fetch('/api/summary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthGroup: currentSystemMonth,
          initialBalance: safeValue,
        }),
      });
    } catch (err) {
      console.error("Failed to save initial balance:", err);
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();

    if (!description || !amount || !date) return;
    if (!date.startsWith(currentSystemMonth)) return;

    if (isSubmitting) return;

    setIsSubmitting(true);

    const newEntry = {
      description,
      amount: parseFloat(amount),
      type,
      date,
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
      if (!res.ok) {
        console.error("Failed to add transaction:", await res.text());
        return;
      }
      // ✅ Always re-fetch after add
      await fetchTransactions();
      await fetchSummary(currentSystemMonth);

      // ✅ Reset fields
      setDescription('');
      setAmount('');
      setType('expense');
      setDate(getTodayStr());

    } catch (err) {
      console.error("Add Transaction Error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTransaction = async (id) => {
    if (deletingId) return;

    setDeletingId(id);

    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        console.error("Failed to delete transaction:", await res.text());
        return;
      }

      // ✅ refresh properly after delete
      await fetchTransactions();
      await fetchSummary(currentSystemMonth);

    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // --- CALCULATIONS ---
  const monthlyTransactions = transactions.filter(t => t.date?.startsWith(currentSystemMonth));

  const totalExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalCredits = monthlyTransactions
    .filter(t => t.type === 'credit')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const currentBalance = Number(initialBalance || 0) + totalCredits - totalExpenses;

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 transform transition-all">
          <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-4xl font-black text-gray-800 mb-4 tracking-tight">
            Master Your <span className="text-amber-500">Wealth</span>
          </h2>
          <p className="text-gray-500 mb-10 leading-relaxed text-lg">
            A secure, private space to track your daily expenses and monthly goals.
          </p>

          <SignInButton mode="modal">
            <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-amber-200 active:scale-95 text-xl">
              Get Started Now
            </button>
          </SignInButton>

          <div className="mt-8 flex items-center justify-center gap-2 text-gray-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <p className="text-xs font-medium uppercase tracking-widest">Secure Cloud Storage Enabled</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800">
            Welcome, <span className="text-amber-500">{user.firstName || 'User'}</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Overview for{" "}
            <span className="font-semibold text-gray-700">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
          </p>
        </div>
        <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-green-200">
          ● Private Account Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-[6px] border-l-blue-500">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Starting Balance</p>
          <div className="flex items-baseline gap-1">
            <span className="text-gray-400 text-xl font-bold">₹</span>
            <input
              type="number"
              className="text-2xl font-black w-full outline-none text-gray-800"
              placeholder="0"
              value={initialBalance}
              onChange={handleBalanceChange}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-[6px] border-l-red-500">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Expenses</p>
          <p className="text-2xl font-black text-red-500">-₹{totalExpenses.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 border-l-[6px] border-l-green-500">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Available Funds</p>
          <p className={`text-2xl font-black ${currentBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>
            ₹{currentBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <form
        onSubmit={addTransaction}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-end"
      >
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="block w-full border-gray-200 bg-gray-50 rounded-xl p-3 outline-amber-500 text-sm font-medium"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
          <input
            type="text"
            placeholder="Salary, Rent..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full border-gray-200 bg-gray-50 rounded-xl p-3 outline-amber-500 text-sm font-medium"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Amount & Type</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="block w-full border-gray-200 bg-gray-50 rounded-xl p-3 outline-amber-500 text-sm font-medium"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border-gray-200 bg-gray-50 rounded-xl p-2 text-xs font-bold text-gray-600"
            >
              <option value="expense">Exp</option>
              <option value="credit">Cred</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`bg-amber-500 text-white p-3.5 rounded-xl transition-all font-bold shadow-lg shadow-amber-100 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-600'
            }`}
        >
          {isSubmitting ? 'Adding...' : 'Add Entry'}
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-widest">Date</th>
              <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-widest">Description</th>
              <th className="p-5 font-bold text-xs text-right text-gray-400 uppercase tracking-widest">Amount</th>
              <th className="p-5 font-bold text-xs text-center text-gray-400 uppercase tracking-widest">Action</th>
            </tr>
          </thead>

          <tbody>
            {monthlyTransactions.map((t) => {
              const id = t._id || t.id;
              const isDeletingThis = deletingId === id;

              return (
                <tr
                  key={id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="p-5 text-sm text-gray-500 font-medium">{t.date}</td>
                  <td className="p-5 font-bold text-gray-700">{t.description}</td>
                  <td className={`p-5 text-right font-black ${t.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                    {t.type === 'expense' ? '-' : '+'} ₹{Number(t.amount || 0).toLocaleString()}
                  </td>
                  <td className="p-5 text-center">
                    <button
                      onClick={() => deleteTransaction(id)}
                      disabled={isDeletingThis}
                      className={`transition-colors p-2 ${isDeletingThis
                          ? 'text-gray-300 cursor-not-allowed opacity-50'
                          : 'text-gray-300 hover:text-red-500'
                        }`}
                    >
                      {isDeletingThis ? (
                        <span className="text-xs font-bold text-gray-400">...</span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {monthlyTransactions.length === 0 && (
          <div className="p-20 text-center text-gray-400 italic font-medium">
            No transactions recorded for this month.
          </div>
        )}
      </div>
    </div>
  );
}

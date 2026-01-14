'use client'
import { useState, useEffect } from 'react';
import { useUser, SignInButton } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn, isLoaded, user } = useUser();

  // --- HELPERS ---
  const getCurrentMonthStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // --- STATE ---
  const [currentSystemMonth, setCurrentSystemMonth] = useState(getCurrentMonthStr());
  const [initialBalance, setInitialBalance] = useState(''); 
  const [transactions, setTransactions] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // --- DATABASE SYNC: INITIAL LOAD ---
  useEffect(() => {
    if (!isSignedIn) return; // Only fetch if user is signed in

    const fetchData = async () => {
      try {
        const month = getCurrentMonthStr();
        const tRes = await fetch('/api/transactions');
        const tData = await tRes.json();
        if (Array.isArray(tData)) setTransactions(tData);

        const sRes = await fetch(`/api/summary?month=${month}`);
        const sData = await sRes.json();
        if (sData) setInitialBalance(sData.initialBalance?.toString() || '0');
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    fetchData();
  }, [isSignedIn]);

  // --- AUTO-RESET LOGIC ---
  useEffect(() => {
    if (!isSignedIn) return;
    const interval = setInterval(() => {
      const nowMonth = getCurrentMonthStr();
      if (nowMonth !== currentSystemMonth) {
        setCurrentSystemMonth(nowMonth);
        setTransactions([]);
        setInitialBalance('0');
        alert(`Welcome to a new month: ${nowMonth}. Data has been reset.`);
      }
    }, 1000 * 60);
    return () => clearInterval(interval);
  }, [currentSystemMonth, isSignedIn]);

  // --- HANDLERS ---
  const handleBalanceChange = async (e) => {
    const rawValue = e.target.value;
    setInitialBalance(rawValue);
    const numericVal = parseFloat(rawValue) || 0;

    try {
      await fetch('/api/summary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          monthGroup: currentSystemMonth, 
          initialBalance: numericVal 
        }),
      });
    } catch (err) {
      console.error("Failed to save initial balance");
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!description || !amount || !date) return;
    if (!date.startsWith(currentSystemMonth)) {
        alert("You can only add transactions for the current month.");
        return;
    }

    const newEntry = { description, amount: parseFloat(amount), type, date };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });

      if (res.ok) {
        const savedTransaction = await res.json();
        setTransactions([...transactions, savedTransaction]);
        setDescription('');
        setAmount('');
      }
    } catch (err) {
      alert("Error saving transaction to database");
    }
  };

  // --- CALCULATIONS ---
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentSystemMonth));
  const totalExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalCredits = monthlyTransactions
    .filter(t => t.type === 'credit')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const currentBalance = Number(initialBalance || 0) + totalCredits - totalExpenses;

  // 1. LOADING STATE (Prevents flickering)
  if (!isLoaded) return null;

  // 2. LANDING VIEW (For Unsigned Users)
  if (!isSignedIn) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 transform transition-all">
          <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h2 className="text-4xl font-black text-gray-800 mb-4 tracking-tight">Master Your <span className="text-amber-500">Wealth</span></h2>
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

  // 3. DASHBOARD VIEW (For Signed In Users)
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800">
            Welcome, <span className="text-amber-500">{user.firstName || 'User'}</span>
          </h1>
          <p className="text-gray-500 mt-1">
             Overview for <span className="font-semibold text-gray-700">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          </p>
        </div>
        <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-green-200">
          ● Private Account Active
        </span>
      </div>

      {/* Summary Cards */}
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

      {/* Input Form */}
      <form onSubmit={addTransaction} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full border-gray-200 bg-gray-50 rounded-xl p-3 outline-amber-500 text-sm font-medium" />
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
          <input type="text" placeholder="Salary, Rent..." value={description} onChange={(e) => setDescription(e.target.value)} className="block w-full border-gray-200 bg-gray-50 rounded-xl p-3 outline-amber-500 text-sm font-medium" />
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Amount & Type</label>
          <div className="flex gap-2">
            <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="block w-full border-gray-200 bg-gray-50 rounded-xl p-3 outline-amber-500 text-sm font-medium" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="border-gray-200 bg-gray-50 rounded-xl p-2 text-xs font-bold text-gray-600">
              <option value="expense">Exp</option>
              <option value="credit">Cred</option>
            </select>
          </div>
        </div>
        <button type="submit" className="bg-amber-500 text-white p-3.5 rounded-xl hover:bg-amber-600 transition-all font-bold shadow-lg shadow-amber-100">Add Entry</button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-widest">Date</th>
              <th className="p-5 font-bold text-xs text-gray-400 uppercase tracking-widest">Description</th>
              <th className="p-5 font-bold text-xs text-right text-gray-400 uppercase tracking-widest">Amount</th>
            </tr>
          </thead>
          <tbody>
            {monthlyTransactions.map((t) => (
              <tr key={t._id || t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="p-5 text-sm text-gray-500 font-medium">{t.date}</td>
                <td className="p-5 font-bold text-gray-700">{t.description}</td>
                <td className={`p-5 text-right font-black ${t.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                  {t.type === 'expense' ? '-' : '+'} ${t.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {monthlyTransactions.length === 0 && (
          <div className="p-20 text-center text-gray-400 italic font-medium">No transactions recorded for this month.</div>
        )}
      </div>
    </div>
  );
}
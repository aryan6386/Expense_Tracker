import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// Color palette for charts
const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
];

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]); // unfiltered — for analytics & totals
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('all');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'expense',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  // Single function that refreshes BOTH the filtered list AND all-time analytics data
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      // Run both fetches in parallel for speed
      const [filteredRes, allRes] = await Promise.all([
        api.get(`/transactions?period=${filterPeriod === 'all' ? '' : filterPeriod}`),
        api.get('/transactions?period='),
      ]);
      setTransactions(filteredRes.data.transactions);
      setAllTransactions(allRes.data.transactions);
    } catch (error) {
      console.error('Error fetching transaction data:', error);
    } finally {
      setLoading(false);
    }
  }, [filterPeriod]);

  // Re-run whenever the filter changes (useCallback ensures no stale closures)
  useEffect(() => {
    refreshData();
  }, [filterPeriod, refreshData]);

  // --- Analytics AND totals computed from all-time data (never stale) ---
  const analyticsData = useMemo(() => {
    const expenseMap = {};
    const incomeMap = {};
    allTransactions.forEach((t) => {
      if (t.type === 'expense') {
        expenseMap[t.category] = (expenseMap[t.category] || 0) + t.amount;
      } else if (t.type === 'income') {
        incomeMap[t.category] = (incomeMap[t.category] || 0) + t.amount;
      }
    });
    const expenseByCategory = Object.entries(expenseMap).map(([name, value]) => ({ name, value }));
    const incomeByCategory  = Object.entries(incomeMap).map(([name, value])  => ({ name, value }));
    const allCategories = Array.from(
      new Set([...Object.keys(expenseMap), ...Object.keys(incomeMap)])
    );
    const barData = allCategories.map((cat) => ({
      name: cat,
      Income: incomeMap[cat] || 0,
      Expense: expenseMap[cat] || 0,
    }));
    return { expenseByCategory, incomeByCategory, barData };
  }, [allTransactions]);

  // Totals derived from allTransactions — always reflect all-time real totals
  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    allTransactions.forEach((t) => {
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'expense') totalExpenses += t.amount;
    });
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  }, [allTransactions]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/transactions/${editId}`, formData);
      } else {
        await api.post('/transactions', formData);
      }
      setShowModal(false);
      await refreshData();
      resetForm();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await api.delete(`/transactions/${transactionToDelete}`);
      await refreshData();
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setShowDeleteModal(false);
    }
  };

  const openDeleteModal = (id) => {
    setTransactionToDelete(id);
    setShowDeleteModal(true);
  };

  const openEditModal = (transaction) => {
    setIsEditing(true);
    setEditId(transaction._id);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: new Date(transaction.date).toISOString().split('T')[0],
      description: transaction.description || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      type: 'expense',
      category: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                FinDash
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 font-medium">Hello, {user?.name}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Overview of your finances</p>
          </div>
          <div className="flex space-x-3 items-center">
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-4 py-2.5 shadow-sm"
            >
              <option value="all">All Time</option>
              <option value="daily">Today</option>
              <option value="weekly">This Week</option>
              <option value="monthly">This Month</option>
            </select>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              <span>+ Add Transaction</span>
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Income */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Income</p>
            <h3 className="text-3xl font-bold text-emerald-600">₹{totals.totalIncome.toFixed(2)}</h3>
          </div>
          {/* Total Expenses */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
            <h3 className="text-3xl font-bold text-red-600">₹{totals.totalExpenses.toFixed(2)}</h3>
          </div>
          {/* Balance */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-lg text-white flex flex-col justify-center">
            <p className="text-sm font-medium text-indigo-100 mb-1">Current Balance</p>
            <h3 className="text-4xl font-bold tracking-tight"> ₹{totals.balance.toFixed(2)}</h3>
          </div>
        </div>

        {/* ── Analytics / Summary Section ── */}
        {transactions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Summary Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Donut chart – Expenses by Category */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Expenses by Category
                </p>
                {analyticsData.expenseByCategory.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No expense data</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={analyticsData.expenseByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {analyticsData.expenseByCategory.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `₹${v.toFixed(2)}`} />
                        <Legend iconType="circle" iconSize={10} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Legend table */}
                    <div className="mt-2 space-y-2">
                      {analyticsData.expenseByCategory.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-gray-600">{item.name}</span>
                          </div>
                          <span className="font-medium text-red-600">₹{item.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Bar chart – Expense by Category only */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Expense by Category
                </p>
                {analyticsData.expenseByCategory.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No expense data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={analyticsData.expenseByCategory} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip formatter={(v) => [`₹${Number(v).toFixed(2)}`, 'Expense']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {analyticsData.expenseByCategory.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions found</h3>
                <p className="text-gray-500 max-w-sm">You haven't added any transactions yet. Get started by adding your first income or expense.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{tx.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}>
                          {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <button onClick={() => openEditModal(tx)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                        <button onClick={() => openDeleteModal(tx._id)} className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Transaction Modal */}
      {showModal && (
        <div className="fixed border inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="flex gap-4">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="expense"
                      checked={formData.type === 'expense'}
                      onChange={handleInputChange}
                      className="peer sr-only"
                    />
                    <div className="text-center px-4 py-2 rounded-lg border border-gray-200 peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-700 transition-all font-medium">
                      Expense
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="income"
                      checked={formData.type === 'income'}
                      onChange={handleInputChange}
                      className="peer sr-only"
                    />
                    <div className="text-center px-4 py-2 rounded-lg border border-gray-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 transition-all font-medium">
                      Income
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  name="category"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g. Groceries, Salary, Utilities"
                  list="category-defaults"
                />
                <datalist id="category-defaults">
                  <option value="Food & Dining" />
                  <option value="Transportation" />
                  <option value="Housing" />
                  <option value="Utilities" />
                  <option value="Salary" />
                  <option value="Entertainment" />
                  <option value="Healthcare" />
                  <option value="Shopping" />
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                  value={formData.date}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  name="description"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Short note about this transaction"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
                >
                  {isEditing ? 'Save Changes' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Transaction?</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this transaction? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setTransactionToDelete(null); }}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

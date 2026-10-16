import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, IndianRupee, ShoppingBag, Heart, Star, PlusCircle, ArrowUpRight } from 'lucide-react';

export default function CreatorDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCreatorData = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
        const response = await fetch(`${baseUrl}/creator/analytics`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.analytics);
          setPrompts(data.prompts || []);
          setRecentSales(data.recentSales || []);
        }
      } catch (err) {
        console.error('Failed to load creator analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreatorData();
  }, []);

  return (
    <div className="min-h-screen bg-[#070B16] text-white flex flex-col justify-between">
      <div>
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <TrendingUp size={13} />
                <span>Creator Monetization Hub</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold">Creator Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">
                Track prompt sales, platform earnings, and verified customer engagement metrics.
              </p>
            </div>

            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-500/25 self-start sm:self-auto"
            >
              <PlusCircle size={16} />
              <span>List New Prompt</span>
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-gray-400">Loading creator analytics...</div>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                <div className="bg-[#10172A] p-6 rounded-2xl border border-white/10 shadow-lg">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Withdrawable Net</span>
                    <IndianRupee size={18} className="text-emerald-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    ₹{analytics?.balanceInr || '0.00'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">90% of gross revenue after platform fee</p>
                </div>

                <div className="bg-[#10172A] p-6 rounded-2xl border border-white/10 shadow-lg">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Units Sold</span>
                    <ShoppingBag size={18} className="text-blue-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {analytics?.totalSalesUnits || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total completed prompt orders</p>
                </div>

                <div className="bg-[#10172A] p-6 rounded-2xl border border-white/10 shadow-lg">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Active Prompts</span>
                    <TrendingUp size={18} className="text-purple-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white">
                    {analytics?.totalPrompts || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Published prompts in marketplace</p>
                </div>

                <div className="bg-[#10172A] p-6 rounded-2xl border border-white/10 shadow-lg">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Community Rating</span>
                    <Star size={18} className="text-amber-400 fill-amber-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white flex items-center space-x-2">
                    <span>{analytics?.overallAverageRating || '5.0'}</span>
                    <span className="text-xs text-gray-500 font-normal">/ 5.0</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Heart size={12} className="text-red-400 fill-red-400" /> {analytics?.totalLikes || 0} total likes
                  </p>
                </div>
              </div>

              {/* Listings Performance Table */}
              <div className="bg-[#10172A] rounded-2xl border border-white/10 p-6 mb-10 shadow-xl">
                <h2 className="text-xl font-bold mb-4">Prompt Performance & Earnings</h2>

                {prompts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                      <thead className="text-xs uppercase bg-[#0A0F1E] text-gray-400 border-b border-white/10">
                        <tr>
                          <th className="py-3 px-4">Prompt</th>
                          <th className="py-3 px-4">Engine</th>
                          <th className="py-3 px-4">Price</th>
                          <th className="py-3 px-4">Sold</th>
                          <th className="py-3 px-4">Revenue</th>
                          <th className="py-3 px-4">Rating</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {prompts.map((p) => (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition">
                            <td className="py-3.5 px-4 font-semibold text-white flex items-center space-x-3">
                              <img
                                src={p.imageUrl}
                                alt={p.title}
                                className="w-10 h-10 rounded-lg object-cover bg-gray-900 border border-white/10 flex-shrink-0"
                              />
                              <span className="line-clamp-1">{p.title}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="bg-blue-500/10 text-blue-300 text-xs px-2 py-0.5 rounded">
                                {p.aiModel}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-white">
                              {p.pricePaise === 0 ? 'FREE' : `₹${(p.pricePaise / 100).toFixed(0)}`}
                            </td>
                            <td className="py-3.5 px-4">{p.salesCount}</td>
                            <td className="py-3.5 px-4 font-semibold text-emerald-400">
                              ₹{(p.revenuePaise / 100).toFixed(0)}
                            </td>
                            <td className="py-3.5 px-4 flex items-center space-x-1 text-amber-400">
                              <Star size={13} className="fill-amber-400" />
                              <span>{p.averageRating || '—'}</span>
                              <span className="text-gray-500 text-xs">({p.reviewsCount})</span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                to={`/prompt/${p.id}`}
                                className="inline-flex items-center text-xs font-semibold text-blue-400 hover:text-blue-300"
                              >
                                <span>View</span>
                                <ArrowUpRight size={14} className="ml-0.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500 text-sm">
                    No prompts listed yet. Click "List New Prompt" to start monetizing.
                  </div>
                )}
              </div>

              {/* Recent Sales Ledger */}
              {recentSales.length > 0 && (
                <div className="bg-[#10172A] rounded-2xl border border-white/10 p-6 shadow-xl">
                  <h2 className="text-xl font-bold mb-4">Recent Sales Transactions</h2>
                  <div className="divide-y divide-white/5">
                    {recentSales.map((sale) => (
                      <div key={sale.orderId} className="py-3 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-semibold text-white">{sale.promptTitle}</p>
                          <p className="text-xs text-gray-500">
                            Purchased by @{sale.buyerUsername} • {new Date(sale.paidAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="font-extrabold text-emerald-400 text-base">
                          +₹{(sale.amountPaise / 100).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

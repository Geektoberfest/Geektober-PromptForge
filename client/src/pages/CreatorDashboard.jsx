import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  Heart,
  Star,
  PlusCircle,
  ArrowUpRight,
  Download,
  Loader2,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreatorDashboard({ isLoggedIn }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [days] = useState(30);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    const fetchCreatorData = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

        const [analyticsRes, timeSeriesRes] = await Promise.all([
          fetch(`${baseUrl}/creator/analytics`, {
            method: 'GET',
            credentials: 'include',
          }),
          fetch(`${baseUrl}/creator/analytics/time-series?days=${days}`, {
            method: 'GET',
            credentials: 'include',
          }),
        ]);

        const analyticsData = await analyticsRes.json();
        if (analyticsData.success) {
          setAnalytics(analyticsData.analytics);
          setPrompts(analyticsData.prompts || []);
          setRecentSales(analyticsData.recentSales || []);
        }

        const timeSeriesData = await timeSeriesRes.json();
        if (timeSeriesData.success) {
          setTimeSeries(timeSeriesData.timeSeries || timeSeriesData.data || []);
        }
      } catch (err) {
        console.error('Failed to load creator analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreatorData();
  }, [isLoggedIn, navigate, days]);

  const handleDownloadCSV = async () => {
    try {
      setIsExporting(true);
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseUrl}/creator/analytics/export`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate export');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      let filename = `promptforge-creator-statement-${new Date().toISOString().slice(0, 10)}.csv`;
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Statement downloaded successfully');
    } catch (err) {
      console.error('Download statement error:', err);
      toast.error('Failed to download statement');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper values for rendering SVG revenue curve
  const chartWidth = 720;
  const chartHeight = 160;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 30;

  const maxRevenueInr = Math.max(
    ...timeSeries.map((p) => Number(p.dailyRevenueInr) || 0),
    10
  );

  const points = timeSeries.map((p, i) => {
    const x =
      paddingX +
      (timeSeries.length > 1 ? (i / (timeSeries.length - 1)) * (chartWidth - paddingX * 2) : 0);
    const val = Number(p.dailyRevenueInr) || 0;
    const y = paddingTop + (1 - val / maxRevenueInr) * chartHeight;
    return { ...p, x, y, val };
  });

  const linePathD = points.reduce((acc, pt, i) => {
    return `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  const areaPathD =
    points.length > 0
      ? `${linePathD} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} Z`
      : '';

  return (
    <div className="min-h-screen bg-[#070B16] text-white flex flex-col justify-between">
      <div>
        <Navbar isLoggedIn={isLoggedIn} />

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

            <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={handleDownloadCSV}
                disabled={isExporting}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#10172A] hover:bg-[#1E293B] border border-white/10 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                title="Download official statement in CSV format"
              >
                {isExporting ? (
                  <Loader2 size={16} className="animate-spin text-blue-400" />
                ) : (
                  <Download size={16} className="text-blue-400" />
                )}
                <span>{isExporting ? 'Generating...' : 'Download Statement (CSV)'}</span>
              </button>

              <Link
                to="/upload"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-blue-500/25"
              >
                <PlusCircle size={16} />
                <span>List New Prompt</span>
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-gray-400">Loading creator analytics...</div>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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

              {/* Time-Series 30-Day Revenue Trend Chart */}
              <div className="bg-[#111827] rounded-2xl border border-white/10 p-6 mb-10 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp size={18} className="text-[#4F7FFF]" />
                      <h2 className="text-lg font-bold text-white">30-Day Revenue & Sales Curve</h2>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Daily gross revenue aggregation in INR with continuous zero-filled trendline.
                    </p>
                  </div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300">
                    <Calendar size={13} className="text-[#4F7FFF]" />
                    <span>Past 30 Days</span>
                  </div>
                </div>

                {/* SVG Chart Container */}
                <div className="w-full relative">
                  {hoveredPoint && (
                    <div
                      className="absolute z-10 pointer-events-none -top-2 transform -translate-x-1/2 -translate-y-full bg-[#1F2937] border border-[#4F7FFF]/40 rounded-xl px-3 py-2 shadow-2xl text-xs"
                      style={{
                        left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                      }}
                    >
                      <div className="font-semibold text-white mb-0.5">{hoveredPoint.date}</div>
                      <div className="text-[#4F7FFF] font-bold">
                        ₹{Number(hoveredPoint.dailyRevenueInr || 0).toFixed(2)} gross
                      </div>
                      <div className="text-emerald-400 text-[11px]">
                        ₹{Number(hoveredPoint.dailyNetEarningsInr || 0).toFixed(2)} net
                      </div>
                      <div className="text-gray-400 text-[11px]">
                        {hoveredPoint.unitsSold} {hoveredPoint.unitsSold === 1 ? 'unit' : 'units'} sold
                      </div>
                    </div>
                  )}

                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight + paddingTop + paddingBottom}`}
                    className="w-full h-56 overflow-visible"
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F7FFF" stopOpacity="0.4" />
                        <stop offset="90%" stopColor="#4F7FFF" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = paddingTop + chartHeight * (1 - ratio);
                      return (
                        <g key={ratio}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={chartWidth - paddingX}
                            y2={y}
                            stroke="rgba(255, 255, 255, 0.07)"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={paddingX - 8}
                            y={y + 4}
                            textAnchor="end"
                            fontSize="10"
                            fill="rgba(156, 163, 175, 0.7)"
                          >
                            ₹{(maxRevenueInr * ratio).toFixed(0)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Gradient Area Fill */}
                    {areaPathD && <path d={areaPathD} fill="url(#areaGradient)" />}

                    {/* Revenue Curve Line */}
                    {linePathD && (
                      <path
                        d={linePathD}
                        fill="none"
                        stroke="#4F7FFF"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Interactive Data Points and Hover Triggers */}
                    {points.map((pt, i) => {
                      const isHovered = hoveredPoint?.date === pt.date;
                      return (
                        <g key={pt.date || i}>
                          {/* Visible point circle */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 5.5 : pt.val > 0 ? 3.5 : 2}
                            fill={isHovered ? '#60A5FA' : '#4F7FFF'}
                            stroke="#111827"
                            strokeWidth="2"
                            className="transition-all duration-150"
                          />

                          {/* Invisible hover trigger */}
                          <rect
                            x={pt.x - (chartWidth / points.length) / 2}
                            y={paddingTop}
                            width={chartWidth / points.length}
                            height={chartHeight}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPoint(pt)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />

                          {/* X-axis date labels for intervals */}
                          {(i === 0 ||
                            i === Math.floor(points.length / 4) ||
                            i === Math.floor(points.length / 2) ||
                            i === Math.floor((points.length * 3) / 4) ||
                            i === points.length - 1) && (
                            <text
                              x={pt.x}
                              y={paddingTop + chartHeight + 18}
                              textAnchor="middle"
                              fontSize="10"
                              fill="rgba(156, 163, 175, 0.7)"
                            >
                              {pt.date?.slice(5)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
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
                              <span>{p.averageRating || 'N/A'}</span>
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

      <Footer />
    </div>
  );
}

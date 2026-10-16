import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
        const response = await fetch(`${baseUrl}/orders/my-orders`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-[#070B16] text-white flex flex-col justify-between">
      <div>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShoppingBag size={13} />
              <span>Purchased Digital Assets</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold">My Purchases & Licenses</h1>
            <p className="text-gray-400 text-sm mt-1">
              All generative prompts licensed through your Razorpay account with permanent access.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-gray-400">Loading purchase history...</div>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const prompt = order.promptId;
                const formattedPrice =
                  order.amountPaise === 0 ? 'FREE' : `₹${(order.amountPaise / 100).toFixed(0)}`;

                return (
                  <div
                    key={order._id}
                    className="bg-[#10172A] p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-5 hover:border-white/20 transition shadow-lg"
                  >
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-950 flex-shrink-0 border border-white/10">
                        {prompt?.imageUrl ? (
                          <img
                            src={prompt.imageUrl}
                            alt={prompt.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                            Sample
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-white line-clamp-1">
                          {prompt?.title || 'Prompt Asset'}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                          {prompt?.category && (
                            <span className="bg-white/5 px-2 py-0.5 rounded text-gray-300">
                              {prompt.category}
                            </span>
                          )}
                          {prompt?.aiModel && (
                            <span className="bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded">
                              {prompt.aiModel}
                            </span>
                          )}
                          <span>
                            • {new Date(order.paidAt || order.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto">
                      <div className="text-right">
                        <span className="font-extrabold text-base text-white block">
                          {formattedPrice}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                          <ShieldCheck size={12} /> Licensed
                        </span>
                      </div>

                      {prompt?._id ? (
                        <Link
                          to={`/prompt/${prompt._id}`}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-md shadow-blue-500/20"
                        >
                          <span>View Prompt</span>
                          <ArrowRight size={14} />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#10172A] rounded-2xl border border-white/5 p-8">
              <Sparkles size={40} className="text-gray-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold mb-2">No purchases yet</h2>
              <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
                Explore trending prompts created by top AI artists and license them directly to your account.
              </p>
              <Link
                to="/explore"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition"
              >
                Browse Marketplace
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

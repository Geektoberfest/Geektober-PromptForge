import { useState, useEffect } from 'react';
import {
  Heart,
  Copy,
  Share2,
  CornerUpLeft,
  Lock,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Star,
  MessageSquare,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { initiateCheckout } from '../utils/razorpay';
import { updateLike } from '../utils/like';
import { useAuth } from '../context/useAuth.js';

const Prompt = (props) => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(props.isUnlocked || false);
  const [currentPromptText, setCurrentPromptText] = useState(props.promptText || '');
  const [negativePrompt, setNegativePrompt] = useState(props.negativePrompt || '');
  const [seed, setSeed] = useState(props.seed || '');
  const [likes, setLikes] = useState(props.likes || 0);
  const [isLiked, setIsLiked] = useState(props.isLiked || false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(props.averageRating || 0);
  const [reviewsCount, setReviewsCount] = useState(props.reviewsCount || 0);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const pricePaise = props.pricePaise || 0;
  const isFree = pricePaise === 0;
  const priceDisplay = isFree ? 'FREE' : `₹${(pricePaise / 100).toFixed(0)}`;

  useEffect(() => {
    if (props.id) {
      const fetchReviews = async () => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
          const res = await fetch(`${baseUrl}/reviews/prompt/${props.id}`);
          const data = await res.json();
          if (data.success) {
            setReviews(data.reviews || []);
            setReviewsCount(data.count || 0);
          }
        } catch (err) {
          console.error('Failed to load reviews:', err);
        }
      };
      fetchReviews();
    }
  }, [props.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentPromptText);
      toast.success('Prompt copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy text');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `PromptForge - ${props.title}`,
          text: `Check out this AI image prompt on PromptForge!`,
          url: window.location.href,
        });
      } catch {
        // Ignored
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleLike = async () => {
    if (!isLoggedIn) {
      toast.error('Log in to like prompts!');
      setTimeout(() => navigate('/login'), 800);
      return;
    }
    try {
      const data = await updateLike(isLiked, props.id);
      if (data && data.success) {
        setIsLiked(!isLiked);
        setLikes(data.prompt?.likes ?? (isLiked ? likes - 1 : likes + 1));
      } else {
        toast.error(data?.error || data?.message || 'Failed to update like');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error updating like');
    }
  };

  const handleBuyPrompt = () => {
    if (!isLoggedIn) {
      toast.error('Please log in to purchase and unlock prompts');
      setTimeout(() => navigate('/login'), 800);
      return;
    }

    setIsProcessingPayment(true);
    initiateCheckout({
      promptId: props.id,
      promptTitle: props.title,
      onSuccess: (result) => {
        setIsUnlocked(true);
        if (result.fullPromptText) {
          setCurrentPromptText(result.fullPromptText);
        }
        if (result.negativePrompt) setNegativePrompt(result.negativePrompt);
        if (result.seed) setSeed(result.seed);
        setIsProcessingPayment(false);
      },
      onFailure: () => {
        setIsProcessingPayment(false);
      },
    });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      const res = await fetch(`${baseUrl}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptId: props.id,
          rating: newRating,
          comment: newComment,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Review posted successfully!');
        setReviews([data.review, ...reviews]);
        if (data.averageRating) setAverageRating(data.averageRating);
        setReviewsCount(reviewsCount + 1);
        setNewComment('');
      } else {
        toast.error(data.message || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      toast.error('Network error during review submission');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B16] text-white flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row bg-[#10172A] rounded-3xl shadow-2xl overflow-hidden border border-white/10 mb-8">
        {/* Left Column: Image Sample */}
        <div className="relative lg:w-3/5 bg-gray-950 flex flex-col p-6 items-center justify-center">
          <button
            className="absolute top-6 left-6 text-gray-400 hover:text-white text-sm font-semibold flex items-center space-x-1.5 transition z-10 cursor-pointer"
            onClick={() => navigate(-1)}
          >
            <CornerUpLeft size={16} />
            <span>Back to gallery</span>
          </button>

          <div className="w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10 mt-10 lg:mt-0 relative group">
            {props.imageSrc ? (
              <img
                src={props.imageSrc}
                alt={props.title}
                className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-500 text-sm">
                Image Placeholder
              </div>
            )}

            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="bg-black/70 backdrop-blur-md text-xs px-3 py-1 rounded-full uppercase font-bold tracking-wider text-white border border-white/10">
                {props.category}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Prompt Details & Checkout */}
        <div className="lg:w-2/5 p-6 sm:p-8 bg-[#0B1120] flex flex-col justify-between">
          <div>
            {/* Header Tags */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {isUnlocked ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    <CheckCircle2 size={13} />
                    <span>UNLOCKED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                    <Lock size={13} />
                    <span>PROTECTED PROMPT</span>
                  </span>
                )}
                {props.aiModel && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                    {props.aiModel}
                  </span>
                )}
              </div>

              <span className="text-lg font-extrabold text-white bg-white/5 px-3 py-1 rounded-xl border border-white/10">
                {priceDisplay}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight">
              {props.title}
            </h1>

            <div className="flex items-center space-x-3 text-sm text-gray-400 mb-4">
              <span>
                By <span className="text-blue-400 font-semibold">@{props.author || 'Anonymous'}</span>
              </span>
              {averageRating > 0 && (
                <div className="flex items-center space-x-1 text-amber-400 font-bold">
                  <Star size={13} className="fill-amber-400" />
                  <span>{averageRating}</span>
                  <span className="text-gray-500 text-xs font-normal">({reviewsCount})</span>
                </div>
              )}
            </div>

            <div className="bg-[#10172A] p-4 rounded-xl border border-white/5 mb-6 text-sm text-gray-300 leading-relaxed">
              {props.description || 'No description provided.'}
            </div>

            {/* Prompt Box */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                  {isUnlocked ? 'Full Generation Prompt' : 'Masked Prompt Teaser'}
                </span>
                {isUnlocked && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck size={14} /> Verified Parameters
                  </span>
                )}
              </div>

              <div
                className={`p-4 rounded-xl border font-mono text-sm leading-relaxed max-h-52 overflow-y-auto ${
                  isUnlocked
                    ? 'bg-[#141E33] border-blue-500/30 text-gray-200'
                    : 'bg-[#10172A]/80 border-amber-500/30 text-amber-200/80 select-none'
                }`}
              >
                {currentPromptText}
              </div>

              {isUnlocked && (negativePrompt || seed) && (
                <div className="mt-3 space-y-2 text-xs bg-[#141E33]/60 p-3 rounded-lg border border-white/5">
                  {negativePrompt && (
                    <div>
                      <span className="text-gray-400 font-semibold uppercase">Negative Prompt: </span>
                      <span className="text-gray-200 font-mono">{negativePrompt}</span>
                    </div>
                  )}
                  {seed && (
                    <div>
                      <span className="text-gray-400 font-semibold uppercase">Seed: </span>
                      <span className="text-gray-200 font-mono">{seed}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            {isUnlocked ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  <Copy size={16} />
                  <span>Copy Full Prompt</span>
                </button>
                <a
                  href="https://gemini.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  Try in AI
                </a>
              </div>
            ) : (
              <button
                onClick={handleBuyPrompt}
                disabled={isProcessingPayment}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold rounded-xl transition shadow-xl shadow-blue-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={18} />
                <span>
                  {isProcessingPayment
                    ? 'Processing Order...'
                    : isFree
                    ? 'Unlock Prompt (Free)'
                    : `Unlock Full Prompt — ${priceDisplay}`}
                </span>
              </button>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleLike}
                className="flex items-center space-x-1.5 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <Heart
                  size={18}
                  className={isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'}
                />
                <span className="text-sm font-semibold text-white">{likes}</span>
                <span className="text-xs text-gray-400">Likes</span>
              </button>

              <button
                onClick={handleShare}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition cursor-pointer"
                title="Share prompt link"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Reviews Section */}
      <div className="w-full max-w-6xl bg-[#10172A] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <MessageSquare size={20} className="text-blue-400" />
            <h2 className="text-xl font-bold">Verified Buyer Reviews ({reviewsCount})</h2>
          </div>
        </div>

        {/* Submit Review Form if unlocked */}
        {isUnlocked && isLoggedIn && (
          <form
            onSubmit={handleReviewSubmit}
            className="mb-8 p-5 bg-[#0B1120] rounded-2xl border border-white/5 space-y-4"
          >
            <h3 className="text-sm font-bold text-gray-200">Leave a Verified Review</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Rating:</span>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setNewRating(star)}
                    className="p-1 cursor-pointer focus:outline-none"
                  >
                    <Star
                      size={18}
                      className={
                        star <= newRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-600'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows="2"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="How were the prompt generation results? Share parameters or lighting tips..."
              required
              className="w-full px-4 py-2.5 rounded-xl bg-[#10172A] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            ></textarea>

            <button
              type="submit"
              disabled={isSubmittingReview}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isSubmittingReview ? 'Submitting...' : 'Post Review'}
            </button>
          </form>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div
                key={r._id}
                className="p-4 rounded-xl bg-[#0B1120] border border-white/5 space-y-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">@{r.userId?.username || 'Verified Buyer'}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium">
                      <ShieldCheck size={12} /> Verified Purchase
                    </span>
                  </div>
                  <div className="flex items-center space-x-0.5 text-amber-400">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} size={13} className="fill-amber-400" />
                    ))}
                  </div>
                </div>

                <p className="text-gray-300 leading-relaxed text-xs sm:text-sm">{r.comment}</p>
                <p className="text-[11px] text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            No reviews yet. Be the first verified buyer to rate this prompt!
          </div>
        )}
      </div>

      <Toaster position="top-center" />
    </div>
  );
};

export default Prompt;
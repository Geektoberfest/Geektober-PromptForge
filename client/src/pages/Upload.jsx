import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import createPost from '../utils/createPost.js';

export default function Upload() {
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const input = document.getElementById('image');
    if (input) {
      input.files = e.dataTransfer.files;
    }
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.target);

    try {
      const result = await createPost(formData);
      if (result) {
        toast.success('Prompt published to marketplace!');
        setTimeout(() => {
          navigate(`/prompt/${result}`);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to create prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-white pb-16">
      <div className="max-w-5xl mx-auto px-6 mt-8">
        <form
          onSubmit={handleSubmit}
          className="bg-[#111827] p-8 sm:p-10 rounded-2xl shadow-2xl border border-white/10"
        >
          <div className="border-b border-white/10 pb-6 mb-8">
            <h1 className="text-3xl font-bold">List New Prompt</h1>
            <p className="text-gray-400 text-sm mt-1">
              Publish and monetize your tested image generation prompts with zero-knowledge protection.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Details */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
                  Prompt Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. Cyberpunk Rainy Tokyo Alleyway"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a2033] border border-white/10 focus:outline-none focus:border-[#5b85f9] transition"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
                  Description *
                </label>
                <textarea
                  rows="2"
                  name="description"
                  required
                  placeholder="What makes this prompt unique, lighting tips, recommended aspect ratios..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a2033] border border-white/10 focus:outline-none focus:border-[#5b85f9] transition"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
                    Category *
                  </label>
                  <select
                    name="category"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a2033] border border-white/10 focus:outline-none focus:border-[#5b85f9] transition"
                  >
                    <option>Photography</option>
                    <option>Concept Art</option>
                    <option>Graphic Design</option>
                    <option>Illustration</option>
                    <option>Digital Art</option>
                    <option>3D Render</option>
                    <option>Anime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
                    AI Generation Engine *
                  </label>
                  <select
                    name="aiModel"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a2033] border border-white/10 focus:outline-none focus:border-[#5b85f9] transition"
                  >
                    <option>Midjourney v6</option>
                    <option>DALL-E 3</option>
                    <option>Stable Diffusion XL</option>
                    <option>Flux.1</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
                  Price in INR (₹) — Set 0 for Free
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-gray-400 font-semibold">₹</span>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    step="1"
                    defaultValue="0"
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#1a2033] border border-white/10 focus:outline-none focus:border-[#5b85f9] transition"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Paid prompts are automatically masked until bought via Razorpay.</p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
                  Full Generation Prompt *
                </label>
                <textarea
                  rows="3"
                  name="prompt"
                  required
                  placeholder="Enter the exact prompt text, weights, stylize parameters..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a2033] border border-white/10 focus:outline-none focus:border-[#5b85f9] transition font-mono text-sm"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
                  Negative Prompt / Seed (Optional)
                </label>
                <input
                  type="text"
                  name="negativePrompt"
                  placeholder="e.g. --no blur, watermark, deformed, ugly"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a2033] border border-white/10 focus:outline-none focus:border-[#5b85f9] transition font-mono text-sm"
                />
              </div>
            </div>

            {/* Right Column: Image Preview Dropzone */}
            <div className="flex flex-col">
              <label className="block text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1.5">
                Output Image Sample *
              </label>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="flex-1 border-2 border-dashed border-white/10 bg-[#1a2033] hover:border-[#5b85f9] transition rounded-2xl flex flex-col items-center justify-center cursor-pointer p-6 min-h-[300px] overflow-hidden group"
                onClick={() => document.getElementById('image')?.click()}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain rounded-xl max-h-[360px]"
                  />
                ) : (
                  <div className="text-center p-6">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-14 w-14 text-gray-400 mx-auto mb-3 group-hover:text-[#5b85f9] transition"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                    <p className="text-gray-200 text-sm font-medium">Drag & drop output sample image here</p>
                    <p className="text-gray-500 text-xs mt-1">PNG, JPG, or WEBP up to 10MB</p>
                  </div>
                )}

                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  required
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>
          </div>

          <Toaster position="top-center" />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Publishing Prompt...' : 'Publish Prompt to Marketplace'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Renders while the shared auth session is still being restored,
 * so protected/public-only routes never flash or redirect prematurely.
 */
export function AuthLoading() {
  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center text-white">
      <div className="flex flex-col items-center space-y-4" role="status">
        <div className="w-10 h-10 border-4 border-[#4F7FFF] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm tracking-wide">Connecting to PromptForge...</p>
      </div>
    </div>
  );
}

export default AuthLoading;

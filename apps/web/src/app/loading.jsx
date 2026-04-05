export default function Loading() {
  return (
    <div className="flex items-center justify-center py-20 min-h-[50vh]">
      <div className="flex flex-col items-center gap-6">
        {/* Celestial spinner with multiple rings */}
        <div className="relative w-14 h-14">
          {/* Outer ring - gold */}
          <div 
            className="absolute inset-0 rounded-full animate-spin border-3 border-transparent border-t-yellow-400"
            style={{ animationDuration: '1.5s' }}
          />
          {/* Middle ring - emerald */}
          <div 
            className="absolute inset-1 rounded-full animate-spin border-3 border-transparent border-t-emerald-400"
            style={{ animationDuration: '1s', animationDirection: 'reverse' }}
          />
          {/* Inner ring - rose */}
          <div 
            className="absolute inset-2 rounded-full animate-spin border-3 border-transparent border-t-rose-400"
            style={{ animationDuration: '0.75s' }}
          />
          {/* Center gem */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-2xl animate-pulse">💎</span>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-emerald-400 to-rose-400 animate-pulse">
            Loading...
          </p>
          <p className="text-sm text-slate-400">
            Preparing your experience
          </p>
        </div>
      </div>
    </div>
  );
}


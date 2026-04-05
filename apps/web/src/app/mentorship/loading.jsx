export default function MentorshipLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="h-8 w-64 bg-slate-700/50 rounded-lg" />
        <div className="h-4 w-96 bg-slate-700/30 rounded" />
      </div>
      
      {/* Search and filter skeleton */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="h-12 flex-1 max-w-md bg-slate-700/40 rounded-xl" />
        <div className="h-12 w-36 bg-slate-700/40 rounded-xl" />
        <div className="h-12 w-32 bg-slate-700/40 rounded-xl" />
      </div>
      
      {/* Mentor cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className="p-6 rounded-xl border border-slate-700/50"
            style={{
              background: 'linear-gradient(135deg, rgba(45, 27, 105, 0.3), rgba(74, 46, 122, 0.2))',
            }}
          >
            {/* Avatar and name */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-slate-600/50" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-slate-600/50 rounded mb-2" />
                <div className="h-4 w-24 bg-slate-700/40 rounded" />
              </div>
            </div>
            
            {/* Expertise tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="h-6 w-20 bg-purple-500/20 rounded-full" />
              <div className="h-6 w-24 bg-emerald-500/20 rounded-full" />
              <div className="h-6 w-16 bg-rose-500/20 rounded-full" />
            </div>
            
            {/* Bio preview */}
            <div className="space-y-2 mb-4">
              <div className="h-3 w-full bg-slate-700/30 rounded" />
              <div className="h-3 w-3/4 bg-slate-700/30 rounded" />
            </div>
            
            {/* Stats */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-700/30">
              <div className="flex gap-4">
                <div className="h-4 w-16 bg-slate-700/40 rounded" />
                <div className="h-4 w-20 bg-slate-700/40 rounded" />
              </div>
              <div className="h-8 w-24 bg-yellow-500/20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

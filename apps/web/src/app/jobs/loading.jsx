export default function JobsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="h-8 w-48 bg-slate-700/50 rounded-lg" />
        <div className="h-4 w-96 bg-slate-700/30 rounded" />
      </div>
      
      {/* Filter bar skeleton */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="h-10 w-32 bg-slate-700/40 rounded-lg" />
        <div className="h-10 w-40 bg-slate-700/40 rounded-lg" />
        <div className="h-10 w-28 bg-slate-700/40 rounded-lg" />
        <div className="h-10 flex-1 max-w-md bg-slate-700/40 rounded-lg" />
      </div>
      
      {/* Job cards skeleton */}
      <div className="grid gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div 
            key={i} 
            className="p-6 rounded-xl border border-slate-700/50"
            style={{
              background: 'linear-gradient(135deg, rgba(45, 27, 105, 0.3), rgba(74, 46, 122, 0.2))',
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="h-6 w-64 bg-slate-600/50 rounded mb-2" />
                <div className="h-4 w-40 bg-slate-700/40 rounded" />
              </div>
              <div className="h-8 w-24 bg-yellow-500/20 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="h-6 w-20 bg-slate-700/40 rounded-full" />
              <div className="h-6 w-28 bg-slate-700/40 rounded-full" />
              <div className="h-6 w-24 bg-slate-700/40 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-700/30 rounded" />
              <div className="h-3 w-4/5 bg-slate-700/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

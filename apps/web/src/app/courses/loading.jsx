export default function CoursesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="h-8 w-56 bg-slate-700/50 rounded-lg" />
        <div className="h-4 w-80 bg-slate-700/30 rounded" />
      </div>
      
      {/* Category tabs skeleton */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-28 bg-slate-700/40 rounded-full shrink-0" />
        ))}
      </div>
      
      {/* Course cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className="rounded-xl border border-slate-700/50 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(45, 27, 105, 0.3), rgba(74, 46, 122, 0.2))',
            }}
          >
            {/* Image placeholder */}
            <div className="h-40 bg-slate-700/40" />
            
            <div className="p-5">
              {/* Title */}
              <div className="h-5 w-4/5 bg-slate-600/50 rounded mb-2" />
              {/* Provider */}
              <div className="h-4 w-1/2 bg-slate-700/40 rounded mb-4" />
              
              {/* Tags */}
              <div className="flex gap-2 mb-4">
                <div className="h-6 w-16 bg-emerald-500/20 rounded-full" />
                <div className="h-6 w-20 bg-purple-500/20 rounded-full" />
              </div>
              
              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-700/30">
                <div className="h-4 w-20 bg-slate-700/40 rounded" />
                <div className="h-8 w-24 bg-yellow-500/20 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

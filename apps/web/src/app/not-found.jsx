import Link from 'next/link';
import { Crown, Home, Briefcase, HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 bg-gradient-to-b from-purple-50 via-pink-50 to-white dark:from-[#0a0a1a] dark:via-[#151530] dark:to-[#1a1a2e]">
      {/* Celestial Background - dark mode only */}
      <div className="fixed inset-0 -z-10 hidden dark:block">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,215,0,0.15) 1px, transparent 0)',
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      <div className="text-center max-w-lg">
        {/* Animated 404 badge */}
        <div 
          className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-8"
          style={{ 
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(183, 110, 121, 0.15))',
            border: '2px solid rgba(255, 215, 0, 0.4)',
            boxShadow: '0 0 40px rgba(255, 215, 0, 0.2)'
          }}
        >
          <span className="text-5xl">💎</span>
        </div>
        
        <h1 
          className="text-6xl font-bold mb-4"
          style={{ 
            background: 'linear-gradient(135deg, #FFD700, #B76E79)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent' 
          }}
        >
          404
        </h1>
        
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Page Not Found
        </h2>
        
        <p className="text-gray-600 dark:text-white/70 mb-8 leading-relaxed">
          The path you seek has yet to be forged. Like precious stones waiting to be discovered, 
          this page may still be in creation. Let us guide you back to familiar ground.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #B76E79)',
              color: '#1a0f2e',
              boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)'
            }}
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
          <Link 
            href="/jobs" 
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium text-white transition-all duration-300"
            style={{
              border: '1px solid rgba(255, 215, 0, 0.4)',
              background: 'rgba(255, 215, 0, 0.1)'
            }}
          >
            <Briefcase className="w-4 h-4" />
            Browse Jobs
          </Link>
        </div>
        
        <div className="mt-8 pt-8" style={{ borderTop: '1px solid rgba(255, 215, 0, 0.2)' }}>
          <p className="text-gray-500 dark:text-white/50 text-sm mb-4">Need assistance?</p>
          <Link 
            href="/help" 
            className="inline-flex items-center gap-2 text-gold hover:underline text-sm"
          >
            <HelpCircle className="w-4 h-4" />
            Visit our Help Centre
          </Link>
        </div>
      </div>
    </div>
  );
}


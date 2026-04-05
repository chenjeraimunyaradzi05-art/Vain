'use client';

/**
 * RAP (Reconciliation Action Plan) Badge Component
 * 
 * Displays a verification badge for companies with RAP subscriptions
 * indicating their commitment to Indigenous employment
 */
export default function RAPBadge({ 
  size = 'md', 
  showLabel = true,
  className = '' 
}) {
  const sizes = {
    sm: {
      badge: 'w-5 h-5',
      icon: 'text-xs',
      text: 'text-xs',
    },
    md: {
      badge: 'w-6 h-6',
      icon: 'text-sm',
      text: 'text-sm',
    },
    lg: {
      badge: 'w-8 h-8',
      icon: 'text-base',
      text: 'text-base',
    },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div 
        className={`${s.badge} rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20`}
        title="RAP Certified Employer"
      >
        <span className={s.icon}>🤝</span>
      </div>
      {showLabel && (
        <span className={`${s.text} font-semibold text-amber-400`}>
          RAP Partner
        </span>
      )}
    </div>
  );
}

/**
 * Verified Employer Badge
 */
export function VerifiedBadge({ 
  size = 'md', 
  showLabel = true,
  className = '' 
}) {
  const sizes = {
    sm: { badge: 'w-4 h-4', text: 'text-xs' },
    md: { badge: 'w-5 h-5', text: 'text-sm' },
    lg: { badge: 'w-6 h-6', text: 'text-base' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <svg 
        className={`${s.badge} text-blue-400`} 
        fill="currentColor" 
        viewBox="0 0 20 20"
        aria-label="Verified Employer"
      >
        <path 
          fillRule="evenodd" 
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
          clipRule="evenodd" 
        />
      </svg>
      {showLabel && (
        <span className={`${s.text} text-blue-400`}>Verified</span>
      )}
    </div>
  );
}

/**
 * Tier Badge - Shows current subscription tier with appropriate styling
 */
export function TierBadge({ tier = 'FREE', size = 'md', className = '' }) {
  const tiers = {
    FREE: { label: 'Free', bg: 'bg-slate-700', text: 'text-slate-300' },
    STARTER: { label: 'Starter', bg: 'bg-blue-600', text: 'text-white' },
    PROFESSIONAL: { label: 'Pro', bg: 'bg-purple-600', text: 'text-white' },
    ENTERPRISE: { label: 'Enterprise', bg: 'bg-indigo-600', text: 'text-white' },
    RAP: { label: 'RAP Partner', bg: 'bg-gradient-to-r from-amber-500 to-orange-600', text: 'text-white' },
  };

  const config = tiers[tier] || tiers.FREE;
  const sizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizes[size] || sizes.md} ${className}`}>
      {config.label}
    </span>
  );
}

/**
 * Indigenous Employment Commitment Badge
 */
export function CommitmentBadge({ level = 'bronze', className = '' }) {
  const levels = {
    bronze: { 
      label: 'Bronze', 
      color: 'from-amber-700 to-amber-900',
      description: '5%+ Indigenous workforce',
    },
    silver: { 
      label: 'Silver', 
      color: 'from-slate-400 to-slate-600',
      description: '10%+ Indigenous workforce',
    },
    gold: { 
      label: 'Gold', 
      color: 'from-yellow-400 to-yellow-600',
      description: '15%+ Indigenous workforce',
    },
  };

  const config = levels[level] || levels.bronze;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${config.color} ${className}`}>
      <span className="text-lg">🏆</span>
      <div>
        <div className="text-sm font-semibold text-white">{config.label} Partner</div>
        <div className="text-xs text-white/80">{config.description}</div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

/**
 * Safety Settings Page
 * Privacy and safety controls for all users
 */
export default function SafetySettingsPage() {
  const [safetyLevel, setSafetyLevel] = useState('standard');
  const [settings, setSettings] = useState({
    // DM restrictions
    dmPolicy: 'connections',
    
    // Location visibility
    locationVisibility: 'region',
    
    // Discovery settings
    showInDiscovery: true,
    showInSearch: true,
    showOnlineStatus: false,
    showLastSeen: false,
    
    // Feed filtering
    feedFilter: 'all',
    hideExplicitContent: true,
    hideUnverifiedUsers: false,
    
    // Interaction controls
    allowConnectionRequests: true,
    allowMentions: true,
    allowTagging: true,
    
    // Profile exposure
    profileVisibility: 'connections',
    hideFromColleagues: false,
    hideEmploymentHistory: false,
    
    // Emergency
    quickLockdownEnabled: false
  });

  const safetyLevels = [
    {
      id: 'standard',
      name: 'Standard',
      icon: '🛡️',
      description: 'Basic protections with open discovery',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'enhanced',
      name: 'Enhanced',
      icon: '🔒',
      description: 'Recommended for most users. Balanced privacy with connections.',
      color: 'from-purple-royal to-pink-blush'
    },
    {
      id: 'maximum',
      name: 'Maximum',
      icon: '🔐',
      description: 'Highest privacy. Recommended for sensitive situations.',
      color: 'from-scarlet to-maroon'
    }
  ];

  const handleLevelChange = (level) => {
    setSafetyLevel(level);
    
    // Auto-adjust settings based on level
    if (level === 'standard') {
      setSettings(prev => ({
        ...prev,
        dmPolicy: 'everyone',
        showInDiscovery: true,
        showInSearch: true,
        allowConnectionRequests: true,
        profileVisibility: 'public'
      }));
    } else if (level === 'enhanced') {
      setSettings(prev => ({
        ...prev,
        dmPolicy: 'connections',
        showInDiscovery: true,
        showInSearch: true,
        showOnlineStatus: false,
        showLastSeen: false,
        allowConnectionRequests: true,
        profileVisibility: 'connections'
      }));
    } else if (level === 'maximum') {
      setSettings(prev => ({
        ...prev,
        dmPolicy: 'nobody',
        showInDiscovery: false,
        showInSearch: false,
        showOnlineStatus: false,
        showLastSeen: false,
        allowConnectionRequests: false,
        allowMentions: false,
        profileVisibility: 'hidden'
      }));
    }
  };

  const activateLockdown = () => {
    setSettings(prev => ({
      ...prev,
      quickLockdownEnabled: true,
      dmPolicy: 'nobody',
      showInDiscovery: false,
      showInSearch: false,
      allowConnectionRequests: false,
      allowMentions: false,
      allowTagging: false,
      profileVisibility: 'hidden'
    }));
    setSafetyLevel('maximum');
  };

  const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-all ${
        checked 
          ? 'bg-gradient-to-r from-emerald to-gold' 
          : 'bg-white/20'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
        checked ? 'left-7' : 'left-1'
      }`} />
    </button>
  );

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Celestial Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#151530] to-[#1a1a2e]" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(196,30,58,0.1) 1px, transparent 0)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-blush via-rose-gold to-gold">
              Safety & Privacy
            </span>
            <span className="ml-2">🛡️</span>
          </h1>
          <p className="text-white/60">Your safety is our priority. Safety mode is ON by default.</p>
        </div>

        {/* Emergency Lockdown Banner */}
        {settings.quickLockdownEnabled ? (
          <div className="royal-card border-scarlet/50 bg-scarlet/10 p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-scarlet/20 flex items-center justify-center text-2xl">
                🚨
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-scarlet mb-2">Lockdown Mode Active</h3>
                <p className="text-white/70 mb-4">
                  Your profile is hidden and all interactions are blocked. You can deactivate when you feel safe.
                </p>
                <button 
                  onClick={() => setSettings(prev => ({ ...prev, quickLockdownEnabled: false }))}
                  className="px-6 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Deactivate Lockdown
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="royal-card border-pink-blush/30 p-6 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-blush/20 flex items-center justify-center text-2xl">
                  🚨
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Quick Lockdown</h3>
                  <p className="text-white/60 text-sm">
                    Instantly hide your profile and block all interactions if you feel unsafe.
                  </p>
                </div>
              </div>
              <button 
                onClick={activateLockdown}
                className="px-6 py-2 rounded-full bg-scarlet/20 text-scarlet hover:bg-scarlet/30 transition-colors flex-shrink-0"
              >
                Activate
              </button>
            </div>
          </div>
        )}

        {/* Safety Level Selection */}
        <div className="royal-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-gold">⚡</span> Safety Level
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            {safetyLevels.map(level => (
              <button
                key={level.id}
                onClick={() => handleLevelChange(level.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  safetyLevel === level.id
                    ? `border-gold bg-gradient-to-br ${level.color} bg-opacity-10`
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="text-3xl mb-2">{level.icon}</div>
                <h3 className="font-semibold text-white mb-1">{level.name}</h3>
                <p className="text-sm text-white/60">{level.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* DM Policy */}
        <div className="royal-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-gold">💬</span> Direct Messages
          </h2>
          
          <div className="space-y-3">
            {[
              { id: 'everyone', label: 'Everyone', desc: 'Anyone can message you' },
              { id: 'connections', label: 'Connections Only', desc: 'Only connected users can message you' },
              { id: 'verified_only', label: 'Verified Users', desc: 'Only verified users can message you' },
              { id: 'nobody', label: 'Nobody', desc: 'Block all direct messages' }
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setSettings(prev => ({ ...prev, dmPolicy: option.id }))}
                className={`w-full p-4 rounded-xl border transition-all text-left ${
                  settings.dmPolicy === option.id
                    ? 'border-gold bg-gold/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{option.label}</h3>
                    <p className="text-sm text-white/60">{option.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    settings.dmPolicy === option.id
                      ? 'border-gold bg-gold'
                      : 'border-white/30'
                  }`}>
                    {settings.dmPolicy === option.id && (
                      <span className="text-black text-xs">✓</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Profile Visibility */}
        <div className="royal-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-gold">👁️</span> Profile Visibility
          </h2>
          
          <div className="space-y-3">
            {[
              { id: 'public', label: 'Public', desc: 'Anyone can view your profile' },
              { id: 'connections', label: 'Connections', desc: 'Only connections can view full profile' },
              { id: 'hidden', label: 'Hidden', desc: 'Profile is completely hidden' }
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setSettings(prev => ({ ...prev, profileVisibility: option.id }))}
                className={`w-full p-4 rounded-xl border transition-all text-left ${
                  settings.profileVisibility === option.id
                    ? 'border-gold bg-gold/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">{option.label}</h3>
                    <p className="text-sm text-white/60">{option.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    settings.profileVisibility === option.id
                      ? 'border-gold bg-gold'
                      : 'border-white/30'
                  }`}>
                    {settings.profileVisibility === option.id && (
                      <span className="text-black text-xs">✓</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Discovery & Interaction Settings */}
        <div className="royal-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-gold">🔍</span> Discovery & Interactions
          </h2>
          
          <div className="space-y-4">
            {[
              { key: 'showInDiscovery', label: 'Show in Discovery', desc: 'Appear in "People you may know"' },
              { key: 'showInSearch', label: 'Show in Search', desc: 'Allow your profile to appear in search results' },
              { key: 'showOnlineStatus', label: 'Show Online Status', desc: 'Let others see when you\'re online' },
              { key: 'showLastSeen', label: 'Show Last Seen', desc: 'Display when you were last active' },
              { key: 'allowConnectionRequests', label: 'Allow Connection Requests', desc: 'Let others send you connection requests' },
              { key: 'allowMentions', label: 'Allow Mentions', desc: 'Let others @mention you in posts' },
              { key: 'allowTagging', label: 'Allow Tagging', desc: 'Let others tag you in photos and posts' }
            ].map(setting => (
              <div key={setting.key} className="flex items-center justify-between py-2">
                <div>
                  <h3 className="font-medium text-white">{setting.label}</h3>
                  <p className="text-sm text-white/60">{setting.desc}</p>
                </div>
                <ToggleSwitch
                  checked={settings[setting.key]}
                  onChange={(value) => setSettings(prev => ({ ...prev, [setting.key]: value }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content Filtering */}
        <div className="royal-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-gold">🎛️</span> Content Filtering
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="font-medium text-white">Hide Explicit Content</h3>
                <p className="text-sm text-white/60">Filter potentially sensitive content from your feed</p>
              </div>
              <ToggleSwitch
                checked={settings.hideExplicitContent}
                onChange={(value) => setSettings(prev => ({ ...prev, hideExplicitContent: value }))}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="font-medium text-white">Hide Unverified Users</h3>
                <p className="text-sm text-white/60">Only see content from verified accounts</p>
              </div>
              <ToggleSwitch
                checked={settings.hideUnverifiedUsers}
                onChange={(value) => setSettings(prev => ({ ...prev, hideUnverifiedUsers: value }))}
              />
            </div>
          </div>
        </div>

        {/* DV Survivor Support */}
        <div className="royal-card border-purple-royal/30 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-royal/20 flex items-center justify-center text-2xl">
              💜
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">DV Survivor Support</h2>
              <p className="text-white/60 text-sm mb-4">
                If you're a DV survivor, we offer additional protections including hidden profile mode, 
                colleague blocking, and discreet job applications.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-white/80 text-sm mr-4">Hide from current/past colleagues</span>
                  <ToggleSwitch
                    checked={settings.hideFromColleagues}
                    onChange={(value) => setSettings(prev => ({ ...prev, hideFromColleagues: value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="sticky bottom-4 bg-gradient-to-t from-[#0a0a1a] pt-4">
          <button className="w-full btn-cta-royal py-4 rounded-xl font-semibold text-lg">
            Save Safety Settings ✨
          </button>
        </div>
      </div>
    </div>
  );
}

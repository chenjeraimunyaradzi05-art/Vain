'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

type TabsVariant = 'default' | 'pills' | 'underline' | 'cosmic';
type TabsSize = 'sm' | 'md' | 'lg';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: TabsVariant;
  size?: TabsSize;
  fullWidth?: boolean;
  className?: string;
}

interface TabPanelsProps {
  children: React.ReactNode;
  activeTab: string;
  className?: string;
}

interface TabPanelProps {
  children: React.ReactNode;
  tabId: string;
  className?: string;
}

const variantClasses: Record<TabsVariant, {
  container: string;
  tab: string;
  activeTab: string;
  indicator?: string;
}> = {
  default: {
    container: 'border-b border-gray-200 dark:border-gray-700',
    tab: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 border-b-2 border-transparent',
    activeTab: 'text-blue-600 dark:text-blue-400 border-blue-500 dark:border-blue-400',
  },
  pills: {
    container: 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
    tab: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md',
    activeTab: 'text-gray-900 dark:text-white bg-white dark:bg-gray-700 shadow-sm',
  },
  underline: {
    container: '',
    tab: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
    activeTab: 'text-gray-900 dark:text-white',
    indicator: 'bg-blue-500',
  },
  cosmic: {
    container: 'bg-[#1A0F2E]/50 p-1 rounded-xl border border-[#FFD700]/20',
    tab: 'text-gray-400 hover:text-white rounded-lg',
    activeTab: 'text-white bg-gradient-to-r from-[#FFD700]/20 to-[#50C878]/20 border border-[#FFD700]/30',
  },
};

const sizeClasses: Record<TabsSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '',
}: TabsProps) {
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateIndicator = useCallback(() => {
    if (variant !== 'underline') return;
    
    const activeIndex = tabs.findIndex(t => t.id === activeTab);
    const activeTabElement = tabsRef.current[activeIndex];
    
    if (activeTabElement && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();
      
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab, tabs, variant]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  const styles = variantClasses[variant];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <nav
        className={`
          flex ${fullWidth ? '' : 'space-x-1'}
          ${styles.container}
        `}
        role="tablist"
        aria-label="Tabs"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              ref={(el) => { tabsRef.current[index] = el; }}
              onClick={() => !tab.disabled && onChange(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              disabled={tab.disabled}
              className={`
                ${sizeClasses[size]}
                ${fullWidth ? 'flex-1' : ''}
                font-medium transition-all duration-200
                flex items-center justify-center gap-2
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${styles.tab}
                ${isActive ? styles.activeTab : ''}
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`
                  ml-1 py-0.5 px-2 rounded-full text-xs
                  ${isActive 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }
                `}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      
      {variant === 'underline' && styles.indicator && (
        <div
          className={`
            absolute bottom-0 h-0.5 transition-all duration-300 ease-out
            ${styles.indicator}
          `}
          style={indicatorStyle}
        />
      )}
    </div>
  );
}

export function TabPanels({
  children,
  activeTab,
  className = '',
}: TabPanelsProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement<TabPanelProps>(child)) {
          const isHidden = child.props.tabId !== activeTab;
          if (isHidden) return null;
          return child;
        }
        return child;
      })}
    </div>
  );
}

export function TabPanel({
  children,
  tabId,
  className = '',
  ...props
}: TabPanelProps & React.HTMLAttributes<HTMLDivElement>) {
  const isHidden = props['aria-hidden'];

  if (isHidden) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`panel-${tabId}`}
      aria-labelledby={tabId}
      className={`focus:outline-none ${className}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// Vertical Tabs - for sidebar navigation
interface VerticalTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'cosmic';
  className?: string;
}

export function VerticalTabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  className = '',
}: VerticalTabsProps) {
  const variantStyles = {
    default: {
      tab: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800',
      activeTab: 'text-blue-600 bg-blue-50 border-l-2 border-blue-500 dark:text-blue-400 dark:bg-blue-900/20',
    },
    cosmic: {
      tab: 'text-gray-400 hover:text-white hover:bg-white/5',
      activeTab: 'text-[#FFD700] bg-[#FFD700]/10 border-l-2 border-[#FFD700]',
    },
  };

  const styles = variantStyles[variant];

  return (
    <nav className={`space-y-1 ${className}`} role="tablist" aria-orientation="vertical">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        
        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            className={`
              w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium
              rounded-r-lg transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${styles.tab}
              ${isActive ? styles.activeTab : ''}
            `}
          >
            {tab.icon}
            <span className="flex-1 text-left">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`
                py-0.5 px-2 rounded-full text-xs
                ${isActive 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }
              `}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default Tabs;

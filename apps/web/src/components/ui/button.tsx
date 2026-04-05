'use client';

import * as React from 'react';

// Theme colors
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'default',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      borderRadius: '0.5rem',
      fontWeight: 500,
      transition: 'all 0.2s ease',
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      opacity: disabled || isLoading ? 0.6 : 1,
      border: 'none',
      outline: 'none',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      width: fullWidth ? '100%' : 'auto',
    };

    // Size styles
    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: { padding: '0.375rem 0.75rem', fontSize: '0.875rem', height: '2rem' },
      md: { padding: '0.5rem 1rem', fontSize: '0.875rem', height: '2.5rem' },
      lg: { padding: '0.625rem 1.5rem', fontSize: '1rem', height: '3rem' },
      icon: { padding: '0.5rem', height: '2.5rem', width: '2.5rem' },
    };

    // Variant styles
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})`,
        color: 'white',
      },
      primary: {
        background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})`,
        color: 'white',
      },
      secondary: {
        background: 'rgba(139, 92, 246, 0.1)',
        color: accentPurple,
        border: `1px solid ${accentPurple}`,
      },
      outline: {
        background: 'transparent',
        color: accentPink,
        border: `1px solid ${accentPink}`,
      },
      ghost: {
        background: 'transparent',
        color: '#6b7280',
      },
      destructive: {
        background: '#ef4444',
        color: 'white',
      },
      link: {
        background: 'transparent',
        color: accentPink,
        padding: 0,
        height: 'auto',
        textDecoration: 'underline',
      },
    };

    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    };

    return (
      <button
        ref={ref}
        className={className}
        style={combinedStyles}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            style={{
              animation: 'spin 1s linear infinite',
              width: '1rem',
              height: '1rem',
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {rightIcon && !isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export default Button;

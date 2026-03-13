'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const pushButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative cursor-pointer select-none',
  {
    variants: {
      variant: {
        default: '',
        destructive: '',
        outline: 'border border-input',
        secondary: '',
        ghost: '',
        link: 'underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface PushButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pushButtonVariants> {
  /** Offset in pixels for the push effect (default: 4) */
  offset?: number;
  /** Background color for the shadow/base layer */
  shadowColor?: string;
  /** Background color for the button itself */
  buttonColor?: string;
  /** Unique identifier for logging */
  buttonId?: string;
  /** Custom label for logging */
  buttonLabel?: string;
}

const PushButton = React.forwardRef<HTMLButtonElement, PushButtonProps>(
  (
    {
      className,
      variant,
      size,
      offset = 4,
      shadowColor = '#1e293b', // Default: slate-800
      buttonColor = '#3b82f6', // Default: blue-500
      buttonId,
      buttonLabel,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = React.useState(false);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger press animation
      setIsPressed(true);

      // Log button click details
      console.log('🔘 PushButton Clicked:', {
        id: buttonId || 'unnamed',
        label: buttonLabel || children?.toString() || 'No label',
        timestamp: new Date().toISOString(),
        offset: offset,
        shadowColor,
        buttonColor,
      });

      // Reset animation after a short delay
      setTimeout(() => {
        setIsPressed(false);
      }, 150);

      // Call the original onClick handler if provided
      onClick?.(event);
    };

    return (
      <div className="relative inline-block">
        {/* Shadow/Base Layer - positioned absolutely behind */}
        <div
          className="absolute inset-0 rounded-md"
          style={{
            backgroundColor: shadowColor,
            transform: `translateY(${offset}px)`,
            transition: 'transform 0.15s ease',
          }}
        />

        {/* Button Body */}
        <button
          ref={ref}
          className={cn(pushButtonVariants({ variant, size, className }))}
          style={{
            backgroundColor: buttonColor,
            transform: isPressed ? 'translateY(0px)' : `translateY(0px)`,
            transition: 'transform 0.15s ease',
            position: 'relative',
            zIndex: 1,
          }}
          onClick={handleClick}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          {...props}
        >
          {children}
        </button>

        {/* Active state: Button drops to shadow position */}
        <style jsx>{`
          button:active {
            transform: translateY(${offset}px) !important;
          }
        `}</style>
      </div>
    );
  }
);

PushButton.displayName = 'PushButton';

export { PushButton, pushButtonVariants };

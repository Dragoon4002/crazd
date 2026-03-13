'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const pushButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative cursor-pointer select-none',
  {
    variants: {
      variant: {
        default: '',
        destructive: '',
        outline: 'border-2 border-current',
        secondary: '',
        ghost: '',
        link: 'underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface PushButtonAdvancedProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pushButtonVariants> {
  /** Offset in pixels for the push effect (default: 4) */
  offset?: number;
  /** Background color for the shadow/base layer */
  shadowColor?: string;
  /** Background color for the button itself */
  buttonColor?: string;
  /** Text color */
  textColor?: string;
  /** Unique identifier for logging */
  buttonId?: string;
  /** Custom label for logging */
  buttonLabel?: string;
  /** Enable ripple effect on click */
  ripple?: boolean;
  /** Enable sound effect on click */
  sound?: boolean;
  /** Haptic feedback (vibration) on mobile */
  haptic?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Success state (shows checkmark briefly) */
  showSuccess?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
}

const PushButtonAdvanced = React.forwardRef<HTMLButtonElement, PushButtonAdvancedProps>(
  (
    {
      className,
      variant,
      size,
      offset = 4,
      shadowColor = '#1e293b',
      buttonColor = '#3b82f6',
      textColor = '#ffffff',
      buttonId,
      buttonLabel,
      ripple = false,
      sound = false,
      haptic = false,
      loading = false,
      showSuccess = false,
      animationDuration = 150,
      onClick,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isPressed, setIsPressed] = React.useState(false);
    const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => buttonRef.current!);

    const playClickSound = () => {
      if (!sound) return;

      // Create a simple click sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };

    const triggerHaptic = () => {
      if (!haptic) return;

      // Vibrate on mobile devices
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    };

    const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple || !buttonRef.current) return;

      const button = buttonRef.current;
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newRipple = { x, y, id: Date.now() };
      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;

      // Trigger press animation
      setIsPressed(true);

      // Visual effects
      createRipple(event);
      playClickSound();
      triggerHaptic();

      // Log button click details
      console.log('🔘 PushButton Clicked:', {
        id: buttonId || 'unnamed',
        label: buttonLabel || children?.toString() || 'No label',
        timestamp: new Date().toISOString(),
        offset: offset,
        shadowColor,
        buttonColor,
        position: {
          x: event.clientX,
          y: event.clientY,
        },
        modifiers: {
          ripple,
          sound,
          haptic,
          loading,
        },
      });

      // Reset animation after duration
      setTimeout(() => {
        setIsPressed(false);
      }, animationDuration);

      // Call the original onClick handler if provided
      onClick?.(event);
    };

    return (
      <div className="relative inline-block">
        {/* Shadow/Base Layer */}
        <div
          className="absolute inset-0 rounded-md transition-all"
          style={{
            backgroundColor: shadowColor,
            transform: `translateY(${offset}px)`,
            transitionDuration: `${animationDuration}ms`,
            opacity: disabled ? 0.5 : 1,
          }}
        />

        {/* Button Body */}
        <button
          ref={buttonRef}
          className={cn(pushButtonVariants({ variant, size, className }))}
          style={{
            backgroundColor: buttonColor,
            color: textColor,
            transform: isPressed ? `translateY(${offset}px)` : 'translateY(0px)',
            transitionDuration: `${animationDuration}ms`,
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
          }}
          onClick={handleClick}
          onMouseDown={() => !disabled && !loading && setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          disabled={disabled || loading}
          {...props}
        >
          {/* Ripple Effects */}
          {ripple && ripples.map((ripple) => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: 0,
                height: 0,
              }}
            />
          ))}

          {/* Loading Spinner */}
          {loading && (
            <svg
              className="animate-spin h-4 w-4 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}

          {/* Success Checkmark */}
          {showSuccess && (
            <svg
              className="h-4 w-4 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}

          {/* Button Content */}
          <span className={loading ? 'opacity-70' : ''}>
            {children}
          </span>
        </button>
      </div>
    );
  }
);

PushButtonAdvanced.displayName = 'PushButtonAdvanced';

export { PushButtonAdvanced, pushButtonVariants };

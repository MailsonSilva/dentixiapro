"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-white hover:bg-primary-glow shadow-xl shadow-primary/20",
      secondary: "bg-accent text-white hover:opacity-90 shadow-xl shadow-accent/20",
      outline: "border-2 border-slate-200 text-primary hover:border-primary-glow/30 hover:bg-primary-glow/5",
      ghost: "text-primary hover:bg-slate-100 shadow-none",
    };

    const sizes = {
      sm: "h-8 px-2.5 text-xs",
      md: "h-9 px-3 text-sm",
      lg: "h-10 px-4 text-sm",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-3 rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" size={20} />}
        {!loading && leftIcon && <span className="transition-transform duration-300 group-hover:scale-110">{leftIcon}</span>}
        <span className="relative z-10">{children}</span>
        {!loading && rightIcon && <span className="transition-transform duration-300 group-hover:scale-110">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

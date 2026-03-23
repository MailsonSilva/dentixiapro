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
      primary: "bg-primary text-white hover:bg-primary-light shadow-lg shadow-primary/20",
      secondary: "bg-accent text-white hover:opacity-90 shadow-lg shadow-accent/20",
      outline: "border-2 border-primary/20 text-primary hover:bg-primary/5",
      ghost: "text-primary hover:bg-primary/5 shadow-none",
    };

    const sizes = {
      sm: "px-3 py-1 text-xs",
      md: "px-5 py-2 text-sm",
      lg: "px-6 py-2.5 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" size={20} />}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

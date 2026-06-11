"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";

    const togglePassword = () => setShowPassword(!showPassword);

    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-[10px] font-bold text-gray-400 capitalize ml-2">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors">
              {icon}
            </div>
          )}
          <input
            type={isPassword ? (showPassword ? "text" : "password") : type}
            ref={ref}
            className={cn(
              "w-full bg-white border-2 border-gray-200/60 focus:border-primary/40 focus:bg-white rounded-xl py-2 outline-none transition-all duration-200 shadow-sm font-medium text-base md:text-sm",
              icon ? "pl-10" : "px-4",
              isPassword ? "pr-12" : "pr-4",
              error && "border-red-500/50 focus:border-red-500/50",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={togglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-primary transition-colors p-1.5 rounded-lg"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500 ml-2 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

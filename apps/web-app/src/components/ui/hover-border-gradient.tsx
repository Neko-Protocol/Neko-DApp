"use client";
import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const HoverBorderGradient = ({
  children,
  containerClassName,
  className,
  as: Component = "button",
  disabled,
  ...props
}: {
  children: ReactNode;
  containerClassName?: string;
  className?: string;
  as?: React.ElementType;
  disabled?: boolean;
} & React.HTMLAttributes<HTMLElement>) => {
  return (
    <div className="relative inline-block rounded-full shadow-lg">
      <Component
        className={cn(
          "relative inline-flex h-12 w-full rounded-full border-2 border-[#334EAC] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50",
          containerClassName,
          disabled && "opacity-50 cursor-not-allowed"
        )}
        disabled={disabled}
        {...props}
      >
        <span
          className={cn(
            "relative z-10 inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white dark:bg-slate-950 px-8 py-3 text-sm font-medium text-black dark:text-white",
            className
          )}
        >
          {children}
        </span>
      </Component>
    </div>
  );
};

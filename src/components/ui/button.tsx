import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-sm hover:from-primary-hover hover:to-primary-muted active:scale-[0.98]",
        destructive:
          "bg-gradient-to-b from-recording to-recording-hover text-white shadow-sm hover:shadow-md active:scale-[0.98]",
        outline:
          "border border-border bg-transparent text-foreground-muted hover:bg-surface-elevated hover:text-foreground hover:border-border-focus",
        secondary:
          "bg-surface-elevated text-foreground border border-border-subtle hover:bg-surface-hover hover:border-border",
        ghost:
          "text-foreground-muted hover:bg-surface-elevated hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "",
        sm: "rounded-md text-xs",
        lg: "rounded-lg text-base",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const sizeStyles: Record<string, React.CSSProperties> = {
  default: { height: 36, padding: "8px 16px", gap: 8 },
  sm: { height: 32, padding: "6px 12px", gap: 6 },
  lg: { height: 44, padding: "10px 24px", gap: 8 },
  icon: { height: 36, width: 36, padding: 0 },
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    const sizeKey = size || "default";
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ ...sizeStyles[sizeKey], ...style }}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

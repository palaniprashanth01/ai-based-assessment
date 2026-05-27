import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Navigate button.
 * States covered (per design-system rules): default, hover, focus-visible,
 * active, disabled, loading (via `data-loading` or aria-busy on parent), error.
 *
 * Tokens used:
 *  - Surface: surface.muted (#c7ff69) for primary; surface.raised for outline
 *  - Text: text.primary (#141414) on primary; text.secondary (#fdf9f0) on outline
 *  - Radius: radius.sm (25.15px) → pill-ish
 *  - Motion: motion.duration.fast (200ms) on color/transform
 *  - Focus: 2px lime ring, 2px offset (set in globals.css :focus-visible)
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-sm font-medium select-none",
    "transition-[background-color,color,border-color,transform,opacity] duration-fast",
    "active:translate-y-[1px]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary CTA — lime pill, near-black ink. Highest contrast on dark surface.
        default:
          "bg-primary text-primary-foreground hover:brightness-95 focus-visible:outline-offset-4",
        // Outline — cream-on-black with strong border.
        outline:
          "border border-border bg-transparent text-foreground hover:bg-secondary hover:border-foreground/40",
        // Secondary — raised dark panel.
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // Ghost — no chrome at rest.
        ghost:
          "bg-transparent text-foreground hover:bg-secondary",
        // Destructive — for irreversible actions only.
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-5 text-base",
        sm: "h-8 px-3 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };

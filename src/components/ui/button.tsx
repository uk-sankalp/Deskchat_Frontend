import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-gray-900)] text-[var(--color-gray-50)] hover:bg-[var(--color-gray-900)]/90 dark:bg-[var(--color-gray-50)] dark:text-[var(--color-gray-900)] dark:hover:bg-[var(--color-gray-50)]/90",
        destructive:
          "bg-red-500 text-white hover:bg-red-500/90",
        outline:
          "border border-[var(--border-color)] bg-transparent hover:bg-[var(--color-gray-100)] dark:hover:bg-[var(--color-gray-800)] text-[var(--text-primary)]",
        secondary:
          "bg-[var(--color-gray-100)] text-[var(--color-gray-900)] hover:bg-[var(--color-gray-100)]/80 dark:bg-[var(--color-gray-800)] dark:text-[var(--color-gray-50)] dark:hover:bg-[var(--color-gray-800)]/80",
        ghost: "hover:bg-[var(--color-gray-100)] hover:text-[var(--color-gray-900)] dark:hover:bg-[var(--color-gray-800)] dark:hover:text-[var(--color-gray-50)]",
        link: "text-[var(--color-gray-900)] underline-offset-4 hover:underline dark:text-[var(--color-gray-50)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // using a simple span instead of radix slot to avoid dependency install
    const Comp = asChild ? "span" : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref as any}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

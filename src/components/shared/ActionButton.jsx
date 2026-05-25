import React from "react";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A button with built-in loading/success/error visual feedback.
 * 
 * Props:
 *   state: "idle" | "loading" | "success" | "error"
 *   idleIcon: React element shown when idle
 *   idleLabel: string (optional label next to icon)
 *   size, variant, className: passed to Button
 *   onClick: called when idle (disabled otherwise)
 *   title, disabled: standard button props
 */
export default function ActionButton({
  state = "idle",
  idleIcon,
  idleLabel,
  size = "icon",
  variant = "ghost",
  className = "",
  onClick,
  title,
  disabled,
  children,
  ...props
}) {
  const isLoading = state === "loading";
  const isSuccess = state === "success";
  const isError = state === "error";

  const stateClass = isSuccess
    ? "text-emerald-600 bg-emerald-50"
    : isError
    ? "text-red-600 bg-red-50"
    : "";

  const icon = isLoading ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : isSuccess ? (
    <Check className="w-4 h-4" />
  ) : isError ? (
    <X className="w-4 h-4" />
  ) : (
    idleIcon
  );

  return (
    <Button
      variant={variant}
      size={size}
      title={title}
      disabled={disabled || isLoading || isSuccess || isError}
      onClick={onClick}
      className={cn(className, stateClass, "transition-colors duration-200")}
      {...props}
    >
      {icon}
      {idleLabel && state === "idle" && <span className="ml-1">{idleLabel}</span>}
      {children}
    </Button>
  );
}
import type { HTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
    label?: string;
    iconClassName?: string;
}

export function LoadingSpinner({ label, className, iconClassName, ...props }: LoadingSpinnerProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
            {...props}
        >
            <Loader2 className={cn("size-4 animate-spin text-primary", iconClassName)} />
            {label ? <span>{label}</span> : null}
        </div>
    );
}

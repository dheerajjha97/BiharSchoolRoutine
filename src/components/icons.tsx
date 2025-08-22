
import { cn } from "@/lib/utils";
import { type LucideProps } from "lucide-react";

export const Logo = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-6 w-6", className)}
    {...props}
  >
    <path d="M4 22v-7" />
    <path d="M4 8V4" />
    <path d="M12 22v-4" />
    <path d="M12 12V4" />
    <path d="M20 22v-1" />
    <path d="M20 15V4" />
    <path d="M16 8h8" />
    <path d="M8 15h8" />
    <path d="M0 4h8" />
  </svg>
);

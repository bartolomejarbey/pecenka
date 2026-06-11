import { LogoMark } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-night">
      <div className="animate-pulse text-linen" aria-label="Načítání">
        <LogoMark className="h-10 w-auto" />
      </div>
    </div>
  );
}

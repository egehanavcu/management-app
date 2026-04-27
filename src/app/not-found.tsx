import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
            <FileQuestion className="h-10 w-10 text-white/70" />
          </div>
        </div>

        {/* 404 */}
        <p className="text-[7rem] leading-none font-bold text-white/10 select-none mb-2">
          404
        </p>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Whoops! This board has drifted into the void.
        </h1>

        {/* Body */}
        <p className="text-sm text-white/60 leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          It may have been deleted, or you might have followed an outdated link.
        </p>

        {/* CTA */}
        <Button asChild size="lg" className="bg-white text-blue-700 hover:bg-white/90 font-semibold shadow-lg">
          <Link href="/boards">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

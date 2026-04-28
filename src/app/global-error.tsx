"use client";

import Link from "next/link";
import { ServerCrash, ChevronDown } from "lucide-react";
import { Inter, Geist_Mono } from "next/font/google";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 antialiased">
        <div className="text-center max-w-md w-full">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
              <ServerCrash className="h-10 w-10 text-white/70" />
            </div>
          </div>

          {/* Ghost label */}
          <p className="text-[7rem] leading-none font-bold text-white/10 select-none mb-2">
            500
          </p>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-white mb-3">
            Something went wrong on our end.
          </h1>

          {/* Body */}
          <p className="text-sm text-white/60 leading-relaxed mb-8">
            An unexpected error occurred. You can try again — if the problem
            persists, head back to the dashboard.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button
              onClick={reset}
              className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-6 rounded-md bg-white text-blue-700 hover:bg-white/90 font-semibold shadow-lg text-sm transition-colors"
            >
              Try again
            </button>
            <Link href="/boards" className="w-full sm:w-auto">
              <button className="w-full inline-flex items-center justify-center h-11 px-6 rounded-md border border-white/30 text-white hover:bg-white/10 font-semibold text-sm transition-colors">
                Back to Dashboard
              </button>
            </Link>
          </div>

          {/* Error digest */}
          {error.digest && (
            <p className="text-[11px] text-white/40 mb-4">
              Error ID: <span className="font-mono">{error.digest}</span>
            </p>
          )}

          {/* Dev-only error details */}
          {isDev && (
            <div className="text-left rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm overflow-hidden">
              <Accordion type="single" collapsible>
                <AccordionItem value="details" className="border-none">
                  <AccordionTrigger className="px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider hover:no-underline hover:bg-white/10">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      View error details
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="text-[11px] font-semibold text-red-300 mb-1">
                      {error.name}: {error.message}
                    </p>
                    {error.stack && (
                      <pre className="text-[10px] text-white/50 overflow-x-auto whitespace-pre-wrap leading-relaxed bg-black/20 rounded-lg p-3 mt-2">
                        {error.stack}
                      </pre>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}

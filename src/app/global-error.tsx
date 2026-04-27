"use client";

import Link from "next/link";
import { ServerCrash, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center max-w-lg w-full">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center">
              <ServerCrash className="h-10 w-10 text-amber-600" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Something went wrong
          </h1>

          {/* Body */}
          <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-sm mx-auto">
            An unexpected error occurred on our end. This has been noted. You
            can try again — if the problem persists, head back to the dashboard.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Button
              onClick={reset}
              size="lg"
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm"
            >
              Try again
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-slate-600 font-semibold"
            >
              <Link href="/boards">Back to Dashboard</Link>
            </Button>
          </div>

          {/* Error digest badge */}
          {error.digest && (
            <p className="text-[11px] text-slate-400 mb-4">
              Error ID: <span className="font-mono">{error.digest}</span>
            </p>
          )}

          {/* Dev-only error details */}
          {isDev && (
            <div className="text-left rounded-xl border border-slate-200 bg-white overflow-hidden">
              <Accordion type="single" collapsible>
                <AccordionItem value="details" className="border-none">
                  <AccordionTrigger className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:no-underline hover:bg-slate-50">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      View error details
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <p className="text-[11px] font-semibold text-red-600 mb-1">
                      {error.name}: {error.message}
                    </p>
                    {error.stack && (
                      <pre className="text-[10px] text-slate-500 overflow-x-auto whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-lg p-3 mt-2">
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

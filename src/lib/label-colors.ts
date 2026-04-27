// Every class name here is a complete literal string so Tailwind's content
// scanner includes all variants in the production bundle — never construct
// these dynamically (e.g. "bg-" + color + "-500").
export const LABEL_COLORS = [
  { key: "red",    bg: "bg-red-500",     subtle: "bg-red-100",     text: "text-red-700"     },
  { key: "orange", bg: "bg-orange-500",  subtle: "bg-orange-100",  text: "text-orange-700"  },
  { key: "yellow", bg: "bg-yellow-400",  subtle: "bg-yellow-100",  text: "text-yellow-700"  },
  { key: "green",  bg: "bg-emerald-500", subtle: "bg-emerald-100", text: "text-emerald-700" },
  { key: "blue",   bg: "bg-blue-500",    subtle: "bg-blue-100",    text: "text-blue-700"    },
  { key: "purple", bg: "bg-purple-500",  subtle: "bg-purple-100",  text: "text-purple-700"  },
  { key: "pink",   bg: "bg-pink-500",    subtle: "bg-pink-100",    text: "text-pink-700"    },
  { key: "teal",   bg: "bg-teal-500",    subtle: "bg-teal-100",    text: "text-teal-700"    },
] as const;

const FALLBACK = {
  key: "grey", bg: "bg-slate-400", subtle: "bg-slate-100", text: "text-slate-700",
} as const;

export function getLabelColor(color: string) {
  return LABEL_COLORS.find((c) => c.key === color.toLowerCase()) ?? FALLBACK;
}

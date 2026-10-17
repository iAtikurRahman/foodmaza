/* AI sentiment chip (+ confidence %) shown on reviews. */

const SENTIMENT_STYLE = {
  POSITIVE: {
    label: "Positive",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  },
  NEGATIVE: {
    label: "Negative",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  UNKNOWN: {
    label: "Neutral",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

export default function SentimentBadge({ sentiment, score }) {
  const style = SENTIMENT_STYLE[sentiment] ?? SENTIMENT_STYLE.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}
    >
      {style.label}
      {score != null && <span className="opacity-70">{Math.round(score * 100)}%</span>}
    </span>
  );
}

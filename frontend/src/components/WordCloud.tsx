import React, { useMemo } from "react";
import { MessageSquare } from "lucide-react";

interface WordCloudProps {
  keywords: string[];
}

const WordCloud: React.FC<WordCloudProps> = ({ keywords = [] }) => {
  const processedKeywords = useMemo(() => {
    const keywordCount: Record<string, number> = {};
    keywords.forEach((keyword) => {
      if (typeof keyword === "string") {
        keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
      }
    });

    const colors = [
      "var(--primary)",
      "var(--secondary)",
      "var(--accent)",
      "var(--warning)",
    ];

    return Object.entries(keywordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word, count], index) => ({
        word,
        count,
        size: Math.max(12, Math.min(32, 12 + count * 4)),
        color: colors[index % 4],
      }));
  }, [keywords]);

  if (processedKeywords.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-neutral">
        <MessageSquare className="w-8 h-8 mr-2" />
        No keywords available
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 p-4 justify-center items-center min-h-48">
      {processedKeywords.map(({ word, count, size, color }, index) => (
        <span
          key={`${word}-${index}`}
          className="font-semibold transition-all hover:scale-110 cursor-pointer"
          style={{
            fontSize: `${size}px`,
            color: color,
            opacity:
              0.7 +
              (count / Math.max(...processedKeywords.map((k) => k.count))) *
                0.3,
          }}
          title={`${word}: ${count} occurrences`}
        >
          {word}
        </span>
      ))}
    </div>
  );
};

export default WordCloud;

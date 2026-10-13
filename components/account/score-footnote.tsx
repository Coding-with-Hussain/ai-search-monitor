import { InfoTip } from "@/components/dashboard/info-tip";

import { SCORE_DEFINITION, SCORE_DISCLAIMER } from "./labels";

/** Required context under any list of AI Visibility scores. */
export function ScoreFootnote() {
  return (
    <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-subtle-foreground">
      <span className="mt-px">
        <InfoTip label="About the AI Visibility score">{SCORE_DEFINITION}</InfoTip>
      </span>
      <span>
        {SCORE_DISCLAIMER} The score is a proprietary monitoring metric, not a search-engine ranking.
      </span>
    </p>
  );
}

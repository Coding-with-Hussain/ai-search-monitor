"use client";

import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { positionPoints, SCORE_WEIGHTS } from "@/services/scoring";

import { METRIC_DISCLAIMER, TRUST_NOTE } from "./helpers";

const ROWS = [
  { label: "Mentioned", points: `${SCORE_WEIGHTS.mentioned}`, detail: "Your business is named in the answer." },
  { label: "Recommended", points: `${SCORE_WEIGHTS.recommended}`, detail: "The answer suggests your business as an option." },
  {
    label: "Top-3 position",
    points: `up to ${SCORE_WEIGHTS.position}`,
    detail: `When recommended: #1 earns ${positionPoints(1)}, #2 earns ${positionPoints(2)}, #3 earns ${positionPoints(3)}; lower positions earn less.`,
  },
  { label: "Citation", points: `${SCORE_WEIGHTS.citation}`, detail: "Your own website is cited as a source." },
  {
    label: "Positive sentiment",
    points: `${SCORE_WEIGHTS.sentiment}`,
    detail: `Positive wording about your business (neutral earns ${SCORE_WEIGHTS.sentiment / 2}).`,
  },
];

/** "How is this calculated?" — the published scoring weights. */
export function ScoreExplainer({ coverageText, scoringVersion }: { coverageText: string; scoringVersion: string }) {
  const max = SCORE_WEIGHTS.mentioned + SCORE_WEIGHTS.recommended + SCORE_WEIGHTS.position + SCORE_WEIGHTS.citation + SCORE_WEIGHTS.sentiment;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto gap-1.5 px-0 text-[13px]">
          <Calculator aria-hidden="true" />
          How is this calculated?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>How the AI Visibility Score is calculated</DialogTitle>
          <DialogDescription>
            Every monitored AI answer is scored from 0 to {max}. Your score is the average across all monitored answers. An
            answer that doesn&apos;t mention your business scores 0.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">Points per monitored AI answer</caption>
            <thead className="bg-surface-muted text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Signal
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-t border-border align-top">
                  <th scope="row" className="px-3 py-2.5 text-left font-normal">
                    <span className="font-medium">{row.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{row.detail}</span>
                  </th>
                  <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular">{row.points}</td>
                </tr>
              ))}
              <tr className="border-t border-border bg-surface-muted/60">
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  Maximum per answer
                </th>
                <td className="px-3 py-2 text-right font-semibold tabular">{max}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">{METRIC_DISCLAIMER}</p>
          <p>{TRUST_NOTE}</p>
          <p>{coverageText}</p>
          <p className="text-xs text-subtle-foreground">Scoring model version {scoringVersion}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

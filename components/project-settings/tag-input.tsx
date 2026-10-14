"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Chip input: add with Enter, comma or the Add button (pasting a
 * comma-separated list works too); remove with each chip's button or
 * Backspace on an empty input. Case-insensitive duplicates are ignored.
 */
export function TagInput({
  id,
  value,
  onChange,
  onBlur,
  max,
  minLength = 2,
  maxLength = 60,
  placeholder,
  noun,
  nounPlural = `${noun}s`,
  invalid,
  describedBy,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  onBlur?: () => void;
  max: number;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  /** Singular noun for messages, e.g. "service". */
  noun: string;
  /** Plural noun, when not just `${noun}s` (e.g. "aliases"). */
  nounPlural?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const full = value.length >= max;

  /** Add every complete entry in `raw`; returns the text that could not be added. */
  function commit(raw: string): string {
    const parts = raw
      .split(",")
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (parts.length === 0) return "";
    const next = [...value];
    const rejected: string[] = [];
    let problem: string | null = null;
    for (const part of parts) {
      if (next.length >= max) {
        problem = `You can add up to ${max} ${nounPlural}.`;
        rejected.push(part);
      } else if (part.length < minLength) {
        problem = `Each ${noun} needs at least ${minLength} characters.`;
        rejected.push(part);
      } else if (part.length > maxLength) {
        problem = `Keep each ${noun} under ${maxLength} characters.`;
        rejected.push(part);
      } else if (next.some((t) => t.toLowerCase() === part.toLowerCase())) {
        problem = `“${part}” is already on the list.`;
      } else {
        next.push(part);
      }
    }
    if (next.length !== value.length) {
      onChange(next);
      setAnnouncement(`Added ${next.slice(value.length).join(", ")}. ${next.length} of ${max}.`);
    }
    setMessage(problem);
    return rejected.join(", ");
  }

  function remove(index: number) {
    const removed = value[index];
    onChange(value.filter((_, i) => i !== index));
    setMessage(null);
    setAnnouncement(`Removed ${removed}.`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      setDraft(commit(draft));
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      remove(value.length - 1);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setMessage(null);
    if (text.includes(",")) {
      const lastComma = text.lastIndexOf(",");
      const rest = commit(text.slice(0, lastComma));
      const tail = text.slice(lastComma + 1).trimStart();
      setDraft(rest ? `${rest}${tail ? `, ${tail}` : ""}` : tail);
    } else {
      setDraft(text);
    }
  }

  const hintId = `${id}-tag-hint`;
  const messageId = `${id}-tag-message`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Commit a pending entry so "type one, click Save" just works.
            if (draft.trim()) setDraft(commit(draft));
            onBlur?.();
          }}
          placeholder={full ? `Maximum of ${max} reached` : placeholder}
          disabled={full}
          autoComplete="off"
          enterKeyHint="enter"
          aria-invalid={invalid || undefined}
          aria-describedby={[hintId, message ? messageId : null, describedBy].filter(Boolean).join(" ")}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setDraft(commit(draft))}
          disabled={full || !draft.trim()}
        >
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <p id={hintId}>Press Enter or type a comma to add each {noun}.</p>
        <p className={cn("shrink-0 tabular", full && "font-medium text-foreground")} aria-hidden="true">
          {value.length} / {max}
        </p>
      </div>

      {message && (
        <p id={messageId} className="text-[13px] text-warning-text">
          {message}
        </p>
      )}

      {value.length > 0 && (
        <ul aria-label={`Added ${nounPlural}`} className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <li
              key={`${tag}-${index}`}
              className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-surface-muted py-1 pr-1 pl-2.5 text-[13px] text-foreground"
            >
              <span className="truncate">{tag}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove ${tag}`}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-surface-sunken hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

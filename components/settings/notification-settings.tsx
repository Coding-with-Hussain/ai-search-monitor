"use client";

import { Check } from "lucide-react";
import { useId, useRef, useState } from "react";

import { updateNotificationPreferencesAction } from "@/app/actions/settings";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";

import { NOTIFICATION_KEYS, type NotificationKey, type NotificationPreferencesInput } from "./schemas";
import { SettingsSection } from "./settings-section";

const COPY: Record<NotificationKey, { title: string; description: string }> = {
  weeklyReport: {
    title: "Weekly reports",
    description: "A weekly summary of your AI visibility score, mentions and competitors for each project.",
  },
  scanCompleted: {
    title: "Scan completed",
    description: "When a scan finishes and new monitored AI answers are ready to review.",
  },
  scoreChanges: {
    title: "Score changes",
    description: "When your AI visibility score moves noticeably between scans.",
  },
  visibilityDrops: {
    title: "Visibility drops",
    description: "When AI assistants stop mentioning you for questions where they used to.",
  },
  competitorOvertakes: {
    title: "Competitor overtakes",
    description: "When a tracked competitor is mentioned or recommended more often than you.",
  },
};

/** Notification switches. Each change saves immediately; a failed save reverts the switch. */
export function NotificationSettings({
  defaults,
  emailEnabled,
}: {
  defaults: NotificationPreferencesInput;
  /** Email delivery is configured in this environment. */
  emailEnabled: boolean;
}) {
  const id = useId();
  const [prefs, setPrefs] = useState(defaults);
  const [saved, setSaved] = useState(false);
  const lastSaved = useRef(defaults);

  const { execute, pending } = useServerAction(updateNotificationPreferencesAction, {
    onSuccess: (data) => {
      lastSaved.current = data;
      setSaved(true);
    },
    onError: () => {
      setPrefs(lastSaved.current);
      setSaved(false);
    },
  });

  function toggle(key: NotificationKey, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaved(false);
    void execute(next);
  }

  return (
    <SettingsSection
      id="notifications"
      title="Notifications"
      description="Choose which updates we send you. Changes are saved automatically."
    >
      {!emailEnabled && (
        <Alert variant="neutral" className="mb-5">
          Email delivery isn&apos;t set up in this environment yet, so these preferences are saved but no emails are sent. Alerts
          still appear on your dashboard.
        </Alert>
      )}
      <ul className="divide-y divide-border">
        {NOTIFICATION_KEYS.map((key) => {
          const switchId = `${id}-${key}`;
          return (
            <li key={key} className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <label htmlFor={switchId} className="text-sm font-medium text-foreground">
                  {COPY[key].title}
                </label>
                <p id={`${switchId}-desc`} className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  {COPY[key].description}
                </p>
              </div>
              <Switch
                id={switchId}
                checked={prefs[key]}
                onCheckedChange={(value) => toggle(key, value)}
                aria-describedby={`${switchId}-desc`}
                className="mt-0.5"
              />
            </li>
          );
        })}
      </ul>
      <p className="mt-4 flex h-4 items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
        {pending ? (
          "Saving…"
        ) : saved ? (
          <>
            <Check className="size-3.5 text-success" aria-hidden="true" /> Saved
          </>
        ) : null}
      </p>
    </SettingsSection>
  );
}

import type * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ToolCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

/** JSON output (React escapes the text; nothing is rendered as HTML). */
export function JsonBlock({ value }: { value: unknown }) {
  if (value === undefined || value === null) return null;
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-surface-muted p-3 text-xs leading-relaxed whitespace-pre-wrap">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

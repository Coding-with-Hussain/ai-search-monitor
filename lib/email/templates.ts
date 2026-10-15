import { scoreChange } from "@/services/scoring";

import { escapeHtml } from "./index";

export interface WeeklyReportEmailData {
  projectName: string;
  score: number;
  previousScore: number | null;
  topImprovement: string | null;
  topProblem: string | null;
  topRecommendation: string | null;
  dashboardUrl: string;
  isSimulation: boolean;
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f3;font-family:Inter,Segoe UI,Arial,sans-serif;color:#141413">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e3dc;border-radius:12px">
<tr><td style="padding:28px 32px 8px;font-size:13px;color:#5c5b56;letter-spacing:.02em">AI Visibility</td></tr>
<tr><td style="padding:0 32px 8px"><h1 style="margin:0;font-size:22px;line-height:1.3">${escapeHtml(title)}</h1></td></tr>
<tr><td style="padding:8px 32px 28px;font-size:15px;line-height:1.6">${body}</td></tr>
</table>
<p style="font-size:12px;color:#8a8983;margin-top:16px">AI answers can vary between runs. Scores are based on the queries and providers monitored by your account.</p>
</td></tr></table></body></html>`;
}

export function weeklyReportEmail(d: WeeklyReportEmailData) {
  const change = scoreChange(d.score, d.previousScore);
  const changeText = change === null ? "First report" : `${change >= 0 ? "+" : ""}${change}`;
  const rows = [
    ["Your score", `${Math.round(d.score)}`],
    ["Previous", d.previousScore === null ? "—" : `${Math.round(d.previousScore)}`],
    ["Change", changeText],
  ];
  const details = [
    d.topImprovement && ["Top improvement", d.topImprovement],
    d.topProblem && ["Top problem", d.topProblem],
    d.topRecommendation && ["Top recommendation", d.topRecommendation],
  ].filter(Boolean) as string[][];

  const html = layout(
    "Your AI visibility report is ready",
    `<p style="margin:0 0 16px">Here is the latest summary for <strong>${escapeHtml(d.projectName)}</strong>${d.isSimulation ? " (simulation data)" : ""}.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 0;color:#5c5b56">${escapeHtml(k)}</td><td style="padding:6px 0;text-align:right;font-weight:600">${escapeHtml(v)}</td></tr>`,
      )
      .join("")}</table>
${details.map(([k, v]) => `<p style="margin:0 0 10px"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>`).join("")}
<p style="margin:24px 0 0"><a href="${escapeHtml(d.dashboardUrl)}" style="background:#256abf;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">Open dashboard</a></p>`,
  );
  const text = [
    `Your AI visibility report is ready — ${d.projectName}${d.isSimulation ? " (simulation data)" : ""}`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...details.map(([k, v]) => `${k}: ${v}`),
    `Open dashboard: ${d.dashboardUrl}`,
  ].join("\n");
  return { subject: `Your AI visibility report is ready — ${d.projectName}`, html, text };
}

export function alertEmail(projectName: string, title: string, body: string, dashboardUrl: string) {
  return {
    subject: `${title} — ${projectName}`,
    html: layout(title, `<p style="margin:0 0 16px">${escapeHtml(body)}</p><p><a href="${escapeHtml(dashboardUrl)}">View details</a></p>`),
    text: `${title}\n\n${body}\n\n${dashboardUrl}`,
  };
}

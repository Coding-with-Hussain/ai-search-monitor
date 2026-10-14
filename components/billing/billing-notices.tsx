import Link from "next/link";
import type { ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { BILLING_ERROR_MESSAGES, isBillingErrorCode } from "@/services/billing/errors";

import { ActivationPoller } from "./activation-poller";
import type { BillingState } from "./billing-status";
import { PortalButton } from "./portal-button";

function AlertActions({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>;
}

/**
 * Status messages at the top of the billing page: the Checkout result, a
 * `?error=` code from the billing routes, and account problems (inactive,
 * past due, cancellation scheduled).
 */
export function BillingNotices({
  checkout,
  error,
  state,
  planName,
  inactiveReason,
  canOpenPortal,
  stripeEnabled,
}: {
  checkout: string | null;
  error: string | null;
  state: BillingState;
  planName: string;
  inactiveReason: string | null;
  canOpenPortal: boolean;
  stripeEnabled: boolean;
}) {
  const subscribed = state.hasStripeSubscription && (state.status === "active" || state.status === "trialing");
  const errorInfo = error ? BILLING_ERROR_MESSAGES[isBillingErrorCode(error) ? error : "unavailable"] : null;
  const paymentProblem = state.status === "past_due" || state.status === "unpaid" || state.status === "incomplete";

  return (
    <div className="flex flex-col gap-3 empty:hidden">
      {checkout === "success" &&
        (subscribed ? (
          <Alert variant="success" title={`Thanks! Your ${planName} subscription is active.`}>
            Your new plan limits apply right away. Invoices and receipts are available under Manage billing.
          </Alert>
        ) : (
          <Alert variant="info" title="Thanks! Your subscription is being activated — it can take a few seconds.">
            We&apos;ll update this page as soon as the payment is confirmed. You don&apos;t need to pay again.
            {stripeEnabled && (
              <AlertActions>
                <ActivationPoller />
              </AlertActions>
            )}
          </Alert>
        ))}

      {checkout === "cancelled" && (
        <Alert variant="neutral" title="Checkout cancelled">
          No payment was taken and your plan hasn&apos;t changed. You can choose a plan below whenever you&apos;re ready.
        </Alert>
      )}

      {errorInfo && (
        <Alert variant="danger" title={errorInfo.title}>
          {errorInfo.message}
        </Alert>
      )}

      {inactiveReason ? (
        <Alert variant="danger" title="Monitoring is paused">
          {inactiveReason}
          <AlertActions>
            {paymentProblem && canOpenPortal ? (
              <PortalButton label="Update billing details" variant="default" size="sm" />
            ) : (
              <Button asChild size="sm">
                <Link href="#plans">Choose a plan</Link>
              </Button>
            )}
          </AlertActions>
        </Alert>
      ) : paymentProblem ? (
        <Alert variant="warning" title="Payment failed — update your billing details">
          We couldn&apos;t collect your last payment. Monitoring continues for now, but please update your payment method
          to avoid an interruption.
          {canOpenPortal && (
            <AlertActions>
              <PortalButton label="Update billing details" variant="default" size="sm" />
            </AlertActions>
          )}
        </Alert>
      ) : state.cancelAtPeriodEnd && state.currentPeriodEnd && state.status === "active" ? (
        <Alert variant="info" title={`Your subscription ends on ${formatDate(state.currentPeriodEnd)}`}>
          You keep full access until then. Changed your mind? You can resume your subscription in the billing portal.
          {canOpenPortal && (
            <AlertActions>
              <PortalButton label="Keep my plan" variant="outline" size="sm" />
            </AlertActions>
          )}
        </Alert>
      ) : null}
    </div>
  );
}

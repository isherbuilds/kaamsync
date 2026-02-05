import { parseWithZod } from "@conform-to/zod/v4";
import { data, redirect, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
	PricingComparison,
	PricingGrid,
} from "~/components/billing/pricing-grid";
import { SubscriptionStatus } from "~/components/billing/subscription-status";
import { UsageDisplay } from "~/components/billing/usage-display";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Separator } from "~/components/ui/separator";
import {
	canCheckout,
	getCheckoutSlug,
	type ProductKey,
} from "~/config/billing";
import type { OrgRole } from "~/lib/auth/permissions";
import { getServerSession } from "~/lib/auth/server";
import {
	billingConfig,
	dodoPayments,
	fetchOrgSubscription,
	fetchOrgUsage,
	type PlanUsage,
	resolveProductPlan,
} from "~/lib/billing/service";
import { billingActionSchema } from "~/lib/billing/validations";
import { env } from "~/lib/infra/env";
import { getMemberRole } from "~/lib/organization/service";
import type { Route } from "./+types/billing";

const PRODUCT_ID_MAP: Record<string, string | undefined> = {
	"growth-monthly": env.DODO_PRODUCT_GROWTH_MONTHLY,
	"growth-yearly": env.DODO_PRODUCT_GROWTH_YEARLY,
	"pro-monthly": env.DODO_PRODUCT_PROFESSIONAL_MONTHLY,
	"pro-yearly": env.DODO_PRODUCT_PROFESSIONAL_YEARLY,
};

export async function action({ request }: Route.ActionArgs) {
	const session = await getServerSession(request);
	if (!session?.session?.activeOrganizationId) {
		return data({ error: "No active organization" }, { status: 401 });
	}

	const orgId = session.session.activeOrganizationId;
	const userId = session.user.id;
	const userRole = await getMemberRole(orgId, userId);

	if (userRole !== "owner") {
		return data(
			{ error: "Only organization owners can manage billing" },
			{ status: 403 },
		);
	}

	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema: billingActionSchema });

	if (submission.status !== "success") {
		return data({ error: "Invalid request" }, { status: 400 });
	}

	if (!dodoPayments) {
		return data({ error: "Billing not configured" }, { status: 500 });
	}

	const { intent } = submission.value;

	if (intent === "checkout") {
		const { plan, interval } = submission.value;
		const slug = getCheckoutSlug(plan, interval);

		if (!slug || !canCheckout(plan)) {
			return data(
				{ error: "Plan not available for checkout" },
				{ status: 400 },
			);
		}

		const productId = PRODUCT_ID_MAP[slug];
		if (!productId) {
			return data({ error: "Product not configured" }, { status: 500 });
		}

		try {
			// Use checkoutSessions.create() for hosted checkout (modern Dodo Payments API)
			const checkoutSession = await dodoPayments.checkoutSessions.create({
				product_cart: [{ product_id: productId, quantity: 1 }],
				customer: {
					email: session.user.email,
					name: session.user.name ?? session.user.email,
				},
				return_url: billingConfig.successUrl,
				metadata: { organizationId: orgId },
			});

			if (checkoutSession.checkout_url) {
				return redirect(checkoutSession.checkout_url);
			}
			return data(
				{ error: "Failed to create checkout session" },
				{ status: 500 },
			);
		} catch (error) {
			console.error("[Billing] Checkout error:", error);
			return data(
				{ error: "Failed to create checkout session" },
				{ status: 500 },
			);
		}
	}

	if (intent === "portal") {
		const subscription = await fetchOrgSubscription(orgId);
		if (!subscription?.billingCustomerId) {
			return data(
				{ error: "No subscription found. Subscribe first." },
				{ status: 400 },
			);
		}

		try {
			const portalSession = await dodoPayments.customers.customerPortal.create(
				subscription.billingCustomerId,
			);

			if (portalSession.link) {
				return redirect(portalSession.link);
			}
			return data(
				{ error: "Failed to create portal session" },
				{ status: 500 },
			);
		} catch (error) {
			console.error("[Billing] Portal error:", error);
			return data({ error: "Failed to open customer portal" }, { status: 500 });
		}
	}

	return data({ error: "Unknown action" }, { status: 400 });
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const session = await getServerSession(request);
	if (!session?.session?.activeOrganizationId) {
		return data({
			subscription: null,
			usage: { members: 0, teams: 0, matters: 0 } as PlanUsage,
			billingEnabled: billingConfig.enabled,
			organizationId: null,
			userRole: null as OrgRole | null,
			currentPlan: null as ProductKey | null,
		});
	}

	const orgId = session.session.activeOrganizationId;
	const userId = session.user.id;

	const userRole = await getMemberRole(orgId, userId);

	if (userRole !== "owner") {
		throw redirect(`/${params.orgSlug}/settings`);
	}

	let subscription = null;
	let usage: PlanUsage = { members: 0, teams: 0, matters: 0 };

	if (billingConfig.enabled) {
		[subscription, usage] = await Promise.all([
			fetchOrgSubscription(orgId),
			fetchOrgUsage(orgId),
		]);
	}

	const currentPlan: ProductKey | null =
		(subscription?.plan as ProductKey | null) ??
		(subscription?.productId
			? resolveProductPlan(subscription.productId)
			: null);

	return data({
		subscription,
		usage,
		billingEnabled: billingConfig.enabled,
		organizationId: orgId,
		userRole,
		currentPlan,
	});
}

export default function SettingsBilling({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { subscription, usage, billingEnabled, currentPlan } = loaderData;
	const [searchParams] = useSearchParams();

	if (searchParams.get("success")) {
		searchParams.delete("success");
		toast.success("Subscription updated successfully!", {
			id: "billing-success",
		});
	}

	if (!billingEnabled) {
		return (
			<div className="v-stack gap-6">
				<div className="v-stack gap-1">
					<h3 className="font-medium text-lg">Billing</h3>
					<p className="text-muted-foreground text-sm">
						Billing is not configured for this environment.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="v-stack gap-6">
			{actionData && "error" in actionData && (
				<Alert variant="destructive">
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{actionData.error}</AlertDescription>
				</Alert>
			)}

			<div className="v-stack gap-1">
				<h3 className="font-medium text-lg">Billing & Subscription</h3>
				<p className="text-muted-foreground text-sm">
					Manage your organization's subscription and billing details.
				</p>
			</div>
			<Separator />

			<SubscriptionStatus
				subscription={subscription ?? null}
				currentPlan={currentPlan}
				loading={false}
			/>

			<UsageDisplay usage={usage} currentPlan={currentPlan} />

			{(!subscription ||
				subscription.plan === "starter" ||
				subscription.status !== "active") && (
				<div className="v-stack gap-4">
					<h4 className="font-medium text-md">Available Plans</h4>
					<PricingGrid currentPlan={currentPlan} loading={false} />

					<div className="v-stack gap-2">
						<details className="group">
							<summary className="flex w-fit cursor-pointer select-none list-none items-center font-medium text-muted-foreground text-sm hover:underline">
								<span className="group-open:hidden">
									Show feature comparison
								</span>
								<span className="hidden group-open:inline">
									Hide feature comparison
								</span>
							</summary>
							<div className="fade-in slide-in-from-top-2 mt-4 animate-in duration-300">
								<PricingComparison />
							</div>
						</details>
					</div>
				</div>
			)}
		</div>
	);
}

export function ErrorBoundary() {
	return (
		<div className="p-6">
			<Alert variant="destructive">
				<AlertTitle>Error loading billing information</AlertTitle>
				<AlertDescription>
					Please try again later or contact support if the problem persists.
				</AlertDescription>
			</Alert>
		</div>
	);
}

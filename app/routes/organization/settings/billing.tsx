import { useQuery } from "@rocicorp/zero/react";
import {
	AlertCircle,
	Check,
	CreditCard,
	Crown,
	ExternalLink,
	Loader2,
	Sparkles,
	Users,
	Zap,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router";
import { queries } from "zero/queries";
import { CACHE_LONG, CACHE_NAV } from "zero/query-cache-policy";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { authClient } from "~/lib/auth-client";
import {
	getOrganizationStorageLimit,
	getPlan,
	isUpgrade,
	PLAN_ID,
	PLANS,
	type PlanId,
} from "~/lib/pricing";

// Simple inline toast for errors (no external dependency needed)
function ErrorAlert({
	message,
	onDismiss,
}: {
	message: string;
	onDismiss: () => void;
}) {
	return (
		<div className="slide-in-from-top-2 fixed top-4 right-4 z-50 flex animate-in items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive text-sm shadow-lg">
			<AlertCircle className="size-4" />
			<span>{message}</span>
			<button
				type="button"
				onClick={onDismiss}
				className="ml-2 hover:opacity-70"
			>
				×
			</button>
		</div>
	);
}

const formatStorage = (bytes: number | null): string => {
	if (bytes === null) return "Unlimited";
	const gb = bytes / (1024 * 1024 * 1024);
	return `${gb.toFixed(gb < 1 ? 1 : 0)} GB`;
};

export default function BillingSettings() {
	const { orgSlug } = useOrgLoaderData();
	const [searchParams] = useSearchParams();

	// Check for success callback from payment
	const paymentSuccess = searchParams.get("success") === "true";

	const [orgs] = useQuery(queries.getOrganizationList(), CACHE_LONG);
	const org = orgs.find((o) => o.slug === orgSlug);
	const [members] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);
	const [teams] = useQuery(queries.getTeamsList(), CACHE_NAV);

	const [isLoading, setIsLoading] = useState<string | null>(null);
	const [portalLoading, setPortalLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Read plan directly from schema columns (not from metadata JSON)
	const currentPlanId: PlanId = (org?.plan as PlanId) || PLAN_ID.STARTER;
	const currentPlan = getPlan(currentPlanId);
	const subscriptionStatus = org?.subscriptionStatus;

	const paidMembers = members?.filter((m) => m.role !== "guest") ?? [];
	const guestMembers = members?.filter((m) => m.role === "guest") ?? [];
	const memberCount = paidMembers.length;
	const guestCount = guestMembers.length;
	const teamCount = teams?.length ?? 0;

	// Calculate usage percentages
	const { maxMembers: memberLimit, maxTeams: teamLimit } = currentPlan.limits;
	const storageLimit = getOrganizationStorageLimit(currentPlanId, memberCount);
	const storageUsed = org?.storageUsed ?? 0;

	const memberUsagePercent = memberLimit
		? Math.min((memberCount / memberLimit) * 100, 100)
		: 0;
	const teamUsagePercent = teamLimit
		? Math.min((teamCount / teamLimit) * 100, 100)
		: 0;
	const storageUsagePercent = storageLimit
		? Math.min((storageUsed / storageLimit) * 100, 100)
		: 0;

	const handleUpgrade = useCallback(
		async (planSlug: string) => {
			if (!org?.id) return;
			setIsLoading(planSlug);
			setError(null);

			try {
				const { data: session, error } =
					await authClient.dodopayments.checkoutSession({
						slug: planSlug,
						referenceId: org.id,
					});

				if (session?.url) {
					window.location.href = session.url;
				} else if (error) {
					setError("Failed to start checkout. Please try again.");
				}
			} catch {
				setError("Something went wrong. Please try again later.");
			} finally {
				setIsLoading(null);
			}
		},
		[org?.id],
	);

	const handleOpenPortal = useCallback(async () => {
		setPortalLoading(true);
		setError(null);

		try {
			const { data: portal, error } =
				await authClient.dodopayments.customer.portal();

			if (portal?.url) {
				window.open(portal.url, "_blank", "noopener,noreferrer");
			} else if (error) {
				setError("Failed to open billing portal. Please try again.");
			}
		} catch {
			setError("Something went wrong. Please try again later.");
		} finally {
			setPortalLoading(false);
		}
	}, []);

	return (
		<div className="space-y-8">
			{/* Error Toast */}
			{error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

			{/* Success Banner */}
			{paymentSuccess && (
				<div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-700 text-sm dark:text-green-400">
					🎉 Payment successful! Your plan has been upgraded.
				</div>
			)}

			{/* Header */}
			<div>
				<h2 className="font-bold text-2xl tracking-tight">
					Billing & Subscription
				</h2>
				<p className="text-muted-foreground">
					Manage your organization's subscription and billing settings.
				</p>
			</div>

			{/* Current Plan Card */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-primary/10 p-2">
								<Crown className="size-5 text-primary" />
							</div>
							<div>
								<CardTitle className="flex items-center gap-2">
									{currentPlan.name} Plan
									{subscriptionStatus === "trialing" && (
										<Badge variant="secondary">Trial</Badge>
									)}
									{subscriptionStatus === "active" && (
										<Badge className="bg-green-500/10 text-green-600">
											Active
										</Badge>
									)}
									{subscriptionStatus === "past_due" && (
										<Badge variant="destructive">Past Due</Badge>
									)}
								</CardTitle>
								<CardDescription>{currentPlan.description}</CardDescription>
							</div>
						</div>
						{currentPlanId !== PLAN_ID.STARTER && (
							<Button
								variant="outline"
								onClick={handleOpenPortal}
								disabled={portalLoading}
							>
								{portalLoading ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<CreditCard className="mr-2 size-4" />
								)}
								Manage Billing
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Usage Stats */}
					<div className="grid gap-4 md:grid-cols-3">
						{/* Members */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="flex items-center gap-2 text-muted-foreground">
									<Users className="size-4" />
									Members
								</span>
								<span className="font-medium">
									{memberCount} / {memberLimit ?? "∞"}
									{guestCount > 0 && (
										<span className="ml-2 font-normal text-muted-foreground text-xs">
											(+ {guestCount} Guests)
										</span>
									)}
								</span>
							</div>
							<Progress value={memberUsagePercent} className="h-2" />
						</div>

						{/* Teams */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="flex items-center gap-2 text-muted-foreground">
									<Zap className="size-4" />
									Teams
								</span>
								<span className="font-medium">
									{teamCount} / {teamLimit ?? "∞"}
								</span>
							</div>
							<Progress value={teamUsagePercent} className="h-2" />
						</div>

						{/* Storage */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="flex items-center gap-2 text-muted-foreground">
									<Sparkles className="size-4" />
									Storage
								</span>
								<span className="font-medium">
									{formatStorage(storageUsed)} / {formatStorage(storageLimit)}
								</span>
							</div>
							<Progress value={storageUsagePercent} className="h-2" />
						</div>
					</div>

					{currentPlanId === PLAN_ID.BUSINESS && (
						<div className="rounded-lg bg-muted/50 p-3 text-muted-foreground text-xs">
							<span className="font-medium text-foreground">Note:</span> Guest
							users are free and do not count towards your billed seats.
						</div>
					)}
				</CardContent>
			</Card>

			<Separator />

			{/* Plan Options */}
			<div>
				<h3 className="mb-4 font-semibold text-lg">
					{currentPlanId === PLAN_ID.STARTER
						? "Upgrade your plan"
						: "All Plans"}
				</h3>
				<div className="grid gap-4 md:grid-cols-3">
					{Object.values(PLANS).map((plan) => {
						const isCurrent = plan.id === currentPlanId;
						const canUpgrade = isUpgrade(currentPlanId, plan.id);

						return (
							<Card
								key={plan.id}
								className={`relative ${isCurrent ? "border-primary" : ""} ${plan.id === PLAN_ID.ENTERPRISE ? "bg-muted/10" : ""}`}
							>
								{plan.id === PLAN_ID.PRO && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2">
										<Badge className="bg-primary">Most Popular</Badge>
									</div>
								)}
								<CardHeader>
									<CardTitle className="flex items-center justify-between">
										{plan.name}
										{isCurrent && <Badge variant="outline">Current Plan</Badge>}
									</CardTitle>
									<CardDescription>{plan.description}</CardDescription>
									<div className="pt-2">
										<span className="font-bold text-3xl">
											{plan.price === 0
												? plan.id === PLAN_ID.ENTERPRISE
													? "Custom"
													: "Free"
												: `$${plan.price / 100}`}
										</span>
										{plan.price > 0 && (
											<span className="text-muted-foreground">
												{plan.isPerSeat ? "/user/month" : "/month"}
											</span>
										)}
									</div>
								</CardHeader>
								<CardContent>
									<ul className="space-y-2">
										<li className="flex items-center gap-2 text-sm">
											<Check className="size-4 text-green-500" />
											{plan.limits.maxMembers ??
												(plan.id === PLAN_ID.ENTERPRISE
													? "100+ members"
													: "Unlimited members")}
										</li>
										<li className="flex items-center gap-2 text-sm">
											<Check className="size-4 text-green-500" />
											{plan.limits.maxTeams ?? "Unlimited"} teams
										</li>
										<li className="flex items-center gap-2 text-sm">
											<Check className="size-4 text-green-500" />
											{plan.limits.storageBytes
												? formatStorage(plan.limits.storageBytes)
												: plan.limits.storagePerUserBytes
													? `${formatStorage(plan.limits.storagePerUserBytes ?? 0)}/user`
													: "Unlimited"}{" "}
											storage
										</li>
										<li className="flex items-center gap-2 text-sm">
											<Check className="size-4 text-green-500" />
											{plan.limits.historyDays
												? `${plan.limits.historyDays}-day history`
												: "Unlimited history"}
										</li>
										{plan.limits.hasApprovalWorkflows && (
											<li className="flex items-center gap-2 text-sm">
												<Check className="size-4 text-green-500" />
												Approval workflows
											</li>
										)}
										{plan.limits.hasPrioritySupport && (
											<li className="flex items-center gap-2 text-sm">
												<Check className="size-4 text-green-500" />
												Priority support
											</li>
										)}
										{plan.limits.hasSSO && (
											<li className="flex items-center gap-2 text-sm">
												<Check className="size-4 text-green-500" />
												SSO / SAML
											</li>
										)}
										{plan.limits.hasCustomIntegrations && (
											<li className="flex items-center gap-2 text-sm">
												<Check className="size-4 text-green-500" />
												Custom integrations
											</li>
										)}
										{plan.limits.hasDedicatedSupport && (
											<li className="flex items-center gap-2 text-sm">
												<Check className="size-4 text-green-500" />
												Dedicated support
											</li>
										)}
									</ul>
								</CardContent>
								<CardFooter>
									{isCurrent ? (
										<Button variant="outline" className="w-full" disabled>
											Current Plan
										</Button>
									) : plan.id === PLAN_ID.ENTERPRISE ? (
										<Button variant="outline" className="w-full" asChild>
											<a href="/contact">
												Contact Sales
												<ExternalLink className="ml-2 size-4" />
											</a>
										</Button>
									) : canUpgrade ? (
										<Button
											className="w-full"
											onClick={() => handleUpgrade(`${plan.id}_monthly`)}
											disabled={isLoading !== null}
										>
											{isLoading === `${plan.id}_monthly` ? (
												<Loader2 className="mr-2 size-4 animate-spin" />
											) : null}
											{plan.trialDays
												? `Start ${plan.trialDays}-day trial`
												: "Upgrade"}
										</Button>
									) : plan.id === PLAN_ID.BUSINESS ? (
										/* Keep old logic for Business contact sales if coming from Starter? No, Logic changed to allow upgrade to Business 
										   Wait, canUpgrade logic handles order. 
										   If I am Pro, I can upgrade to Business.
										   If I am Starter, I can upgrade to Business.
										   My previous code had a fallback for BUSINESS to contact sales? */
										<Button
											className="w-full"
											onClick={() => handleUpgrade(`${plan.id}_monthly`)}
											disabled={isLoading !== null}
										>
											Upgrade
										</Button>
									) : (
										<Button variant="outline" className="w-full" disabled>
											Downgrade
										</Button>
									)}
								</CardFooter>
							</Card>
						);
					})}
				</div>
			</div>

			{/* FAQ Section */}
			<Card>
				<CardHeader>
					<CardTitle>Frequently Asked Questions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<h4 className="font-medium">Can I change plans later?</h4>
						<p className="text-muted-foreground text-sm">
							Yes, you can upgrade or downgrade anytime. Changes take effect on
							your next billing cycle.
						</p>
					</div>
					<div>
						<h4 className="font-medium">What happens if I downgrade?</h4>
						<p className="text-muted-foreground text-sm">
							Your data stays safe. Some features become read-only until you
							upgrade again. If you exceed the new plan's limits, you'll need to
							remove members or teams.
						</p>
					</div>
					<div>
						<h4 className="font-medium">Is there a free trial for Pro?</h4>
						<p className="text-muted-foreground text-sm">
							Yes — 14 days free, no credit card required. Cancel anytime.
						</p>
					</div>
					<div>
						<h4 className="font-medium">How does seat-based billing work?</h4>
						<p className="text-muted-foreground text-sm">
							On the Business plan, you pay per active member. Storage is pooled
							across all members (10GB per user).
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

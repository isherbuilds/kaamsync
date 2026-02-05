import Bell from "lucide-react/dist/esm/icons/bell";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Info from "lucide-react/dist/esm/icons/info";
import { Link, useRouteError } from "react-router";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { usePushNotifications } from "~/hooks/use-push-notifications";
import type { Route } from "./+types/general";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `General Settings - ${params.orgSlug}`,
	},
];

function getPermissionHelpUrl() {
	if (typeof navigator === "undefined") return null;
	const ua = navigator.userAgent.toLowerCase();
	if (ua.includes("chrome"))
		return "https://support.google.com/chrome/answer/3220216";
	if (ua.includes("firefox"))
		return "https://support.mozilla.org/en-US/kb/push-notifications-firefox";
	if (ua.includes("safari"))
		return "https://support.apple.com/guide/safari/sfri40734";
	return null;
}

export default function GeneralSettings() {
	const {
		isSupported,
		isSubscribed,
		isLoading,
		permission,
		subscribe,
		unsubscribe,
	} = usePushNotifications();

	const handleToggle = async (checked: boolean) => {
		if (checked) {
			await subscribe();
		} else {
			await unsubscribe();
		}
	};

	const helpUrl = getPermissionHelpUrl();
	const isChrome =
		typeof navigator !== "undefined" &&
		navigator.userAgent.toLowerCase().includes("chrome");

	return (
		<div className="space-y-8">
			<div>
				<h2 className="font-semibold text-lg">General Settings</h2>
				<p className="text-muted-foreground text-sm">
					Manage your personal preferences
				</p>
			</div>

			<div className="space-y-6">
				<div className="space-y-4">
					<h3 className="font-medium text-base">Notifications</h3>

					<div className="flex items-center justify-between rounded-lg border p-4">
						<div className="flex items-center gap-3">
							{isSubscribed ? (
								<Bell className="size-5 text-primary" />
							) : (
								<BellOff className="size-5 text-muted-foreground" />
							)}
							<div className="space-y-0.5">
								<Label htmlFor="push-notifications" className="font-medium">
									Push Notifications
								</Label>
								<p className="text-muted-foreground text-sm">
									{!isSupported
										? "Not supported in this browser"
										: permission === "denied"
											? "Blocked by browser settings"
											: isSubscribed
												? "You'll receive notifications for updates"
												: "Get notified about task updates and mentions"}
								</p>
							</div>
						</div>
						{permission === "denied" && helpUrl ? (
							<Button variant="outline" size="sm" asChild>
								<a href={helpUrl} target="_blank" rel="noopener noreferrer">
									How to enable
									<ExternalLink className="ml-1.5 size-3.5" />
								</a>
							</Button>
						) : (
							<Switch
								id="push-notifications"
								checked={isSubscribed}
								onCheckedChange={handleToggle}
								disabled={!isSupported || isLoading}
							/>
						)}
					</div>

					{isSubscribed && (
						<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
							<div className="flex items-start gap-3">
								<Info className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
								<div className="space-y-1">
									<p className="font-medium text-blue-900 text-sm dark:text-blue-100">
										Not seeing notifications?
									</p>
									<ul className="space-y-1 text-blue-700 text-sm dark:text-blue-300">
										<li>
											• On <strong>macOS</strong>: Check System Settings →
											Notifications →
											{isChrome ? " Google Chrome" : " your browser"} and ensure
											notifications are allowed
										</li>
										<li>
											• On <strong>Windows</strong>: Check Settings → System →
											Notifications
										</li>
										<li>• Ensure Do Not Disturb/Focus mode is off</li>
									</ul>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();

	return (
		<div className="v-stack center flex h-full gap-4 p-8">
			<h2 className="font-semibold text-lg">Settings Error</h2>
			<p className="text-muted-foreground text-sm">
				{error instanceof Error ? error.message : "Failed to load settings"}
			</p>
			<Link to="." className="text-primary hover:underline" prefetch="intent">
				Try again
			</Link>
		</div>
	);
}

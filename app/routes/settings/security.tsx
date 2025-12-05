import { Globe, Laptop, Loader2, Smartphone } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { authClient } from "~/lib/auth-client";

export default function SettingsSecurityPage() {
	const { data: session } = authClient.useSession();
	const {
		data: sessions,
		isPending: isLoadingSessions,
		refetch: refetchSessions,
	} = authClient.listSessions();
	const { data: accounts, isPending: isLoadingAccounts } =
		authClient.listAccounts();
	const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
		null,
	);

	const handleRevokeSession = async (sessionId: string) => {
		setRevokingSessionId(sessionId);
		await authClient.revokeSession({ token: sessionId }); // Note: check if token or id is needed
		await refetchSessions();
		setRevokingSessionId(null);
	};

	const getDeviceIcon = (userAgent: string | undefined) => {
		if (!userAgent) return <Laptop className="h-5 w-5" />;
		if (userAgent.toLowerCase().includes("mobile"))
			return <Smartphone className="h-5 w-5" />;
		return <Laptop className="h-5 w-5" />;
	};

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">Security</h3>
				<p className="text-sm text-muted-foreground">
					Manage your sessions and linked accounts.
				</p>
			</div>
			<Separator />

			<div className="space-y-6">
				<section>
					<h4 className="text-sm font-medium mb-4">Active Sessions</h4>
					{isLoadingSessions ? (
						<div className="flex items-center justify-center p-4">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div className="space-y-4">
							{sessions?.map((s) => (
								<Card key={s.id}>
									<CardContent className="flex items-center justify-between p-4">
										<div className="flex items-center gap-4">
											<div className="rounded-full bg-muted p-2">
												{getDeviceIcon(s.userAgent)}
											</div>
											<div>
												<div className="flex items-center gap-2">
													<p className="text-sm font-medium">
														{s.userAgent
															? /Chrome|Firefox|Safari|Edge/.exec(
																	s.userAgent,
																)?.[0] || "Unknown Browser"
															: "Unknown Device"}
													</p>
													{s.id === session?.session.id && (
														<Badge variant="secondary" className="text-xs">
															Current Session
														</Badge>
													)}
												</div>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<Globe className="h-3 w-3" />
													<span>{s.ipAddress || "Unknown IP"}</span>
													<span>•</span>
													<span>
														Last active:{" "}
														{new Date(s.updatedAt).toLocaleDateString()}
													</span>
												</div>
											</div>
										</div>
										{s.id !== session?.session.id && (
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive hover:text-destructive hover:bg-destructive/10"
												onClick={() => handleRevokeSession(s.token)} // Assuming token is used for revocation
												disabled={revokingSessionId === s.token}
											>
												{revokingSessionId === s.token ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													"Revoke"
												)}
											</Button>
										)}
									</CardContent>
								</Card>
							))}
							{sessions?.length === 0 && (
								<p className="text-sm text-muted-foreground">
									No active sessions found.
								</p>
							)}
						</div>
					)}
				</section>

				<Separator />

				<section>
					<h4 className="text-sm font-medium mb-4">Linked Accounts</h4>
					{isLoadingAccounts ? (
						<div className="flex items-center justify-center p-4">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div className="space-y-4">
							{accounts?.map((account) => (
								<Card key={account.id}>
									<CardContent className="flex items-center justify-between p-4">
										<div className="flex items-center gap-4">
											{/* Placeholder for provider icon - can map based on account.providerId */}
											<div className="rounded-full bg-muted p-2 capitalize font-bold text-muted-foreground">
												{account.providerId.charAt(0)}
											</div>
											<div>
												<p className="text-sm font-medium capitalize">
													{account.providerId}
												</p>
												<p className="text-xs text-muted-foreground">
													Linked on{" "}
													{new Date(account.createdAt).toLocaleDateString()}
												</p>
											</div>
										</div>
										{/* Unlink functionality can be added here if supported by better-auth client */}
										<Button variant="outline" size="sm" disabled>
											Connected
										</Button>
									</CardContent>
								</Card>
							))}
							{accounts?.length === 0 && (
								<p className="text-sm text-muted-foreground">
									No linked accounts found.
								</p>
							)}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}

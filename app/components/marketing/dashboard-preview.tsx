export function DashboardPreview() {
	return (
		<div className="relative overflow-hidden rounded-none border border-border bg-background shadow-2xl">
			<div className="flex items-center gap-4 border-border border-b bg-muted/30 px-4 py-2">
				<div className="flex gap-2">
					<div className="size-3 rounded-full border border-foreground/20 bg-transparent" />
					<div className="size-3 rounded-full border border-foreground/20 bg-transparent" />
					<div className="size-3 rounded-full border border-foreground/20 bg-transparent" />
				</div>
				<div className="flex-1 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
					kaamsync_dashboard.view
				</div>
			</div>
			<div className="grid min-h-[400px] grid-cols-12 bg-muted/5 md:min-h-[600px]">
				{/* Sidebar */}
				<div className="col-span-2 hidden flex-col gap-4 border-border border-r bg-background p-4 md:flex">
					{[...Array(6)].map((_, i) => (
						<div
							key={`skeleton-item-${i + 1}`}
							className="h-6 w-full rounded-sm bg-muted/50"
							style={{ animationDelay: `${i * 100}ms` }}
						/>
					))}
				</div>

				{/* Main View */}
				<div className="col-span-12 grid content-start gap-8 p-6 md:col-span-10 md:p-8">
					{/* Stats Row */}
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{[
							{ label: "Active Jobs", val: "42", id: "active-jobs" },
							{ label: "Completed", val: "18", id: "completed" },
							{ label: "Team Online", val: "12", id: "team-online" },
							{ label: "Pending", val: "3", id: "pending" },
						].map((stat) => (
							<div
								key={stat.id}
								className="group border border-border bg-background p-4 transition-colors hover:border-primary"
							>
								<div className="mb-2 font-mono text-[10px] text-muted-foreground uppercase group-hover:text-primary">
									{stat.label}
								</div>
								<div className="font-bold font-sans text-3xl tracking-tighter">
									{stat.val}
								</div>
							</div>
						))}
					</div>

					{/* Map / List Hybrid */}
					<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
						<div className="relative col-span-2 min-h-[300px] border border-border bg-background p-4">
							{/* Fake Map Grid */}
							<div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] opacity-50" />
							<div className="relative z-10 flex h-full items-center justify-center">
								<div className="absolute size-32 animate-ping rounded-full border border-primary/30" />
								<div className="size-4 rounded-full bg-primary ring-4 ring-primary/20" />
								<div className="absolute top-4 right-4 border border-border bg-background px-2 py-1 font-mono text-xs shadow-sm">
									LIVE GPS: ACTIVE
								</div>
							</div>
						</div>
						<div className="flex flex-col gap-3">
							<div className="mb-2 font-bold font-mono text-xs uppercase">
								Recent Updates
							</div>
							{[...Array(5)].map((_, i) => (
								<div
									key={`site-visit-${204}-${i}`}
									className="flex items-center justify-between border-border/50 border-b pb-2 last:border-0"
								>
									<div className="flex items-center gap-2">
										<div className="size-2 rounded-full bg-green-500" />
										<div className="flex flex-col">
											<span className="font-medium text-xs">
												Site Visit #204-{i}
											</span>
											<span className="text-[10px] text-muted-foreground">
												Updated by Rahul
											</span>
										</div>
									</div>
									<div className="font-mono text-[10px] text-muted-foreground">
										{10 + i}:00 AM
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export function DashboardPreview() {
	return (
		<div className="relative overflow-hidden rounded-none border border-border bg-background shadow-2xl">
			<div className="flex items-center gap-4 border-border border-b bg-muted/30 px-4 py-2">
				<div className="flex gap-2">
					<div className="size-3 rounded-full border border-foreground/20 bg-transparent" />
					<div className="size-3 rounded-full border border-foreground/20 bg-transparent" />
					<div className="size-3 rounded-full border border-foreground/20 bg-transparent" />
				</div>
				<div className="flex-1 text-center font-mono text-muted-foreground text-xs uppercase tracking-widest">
					dashboard • acme operations
				</div>
			</div>
			<div className="grid min-h-[400px] grid-cols-12 bg-muted/10 md:min-h-[600px]">
				{/* Sidebar */}
				<div className="col-span-2 hidden flex-col gap-4 border-border border-r bg-background p-4 md:flex">
					<div className="mb-4 flex items-center gap-2 border-border border-b pb-4">
						<div className="size-6 rounded bg-primary" />
						<span className="font-bold text-sm">KaamSync</span>
					</div>
					{["Dashboard", "Matters", "Teams", "Reports", "Settings"].map(
						(item, i) => (
							<div
								key={`nav-${item}`}
								className={`flex items-center gap-2 rounded-sm px-2 py-2 text-sm ${i === 1 ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"}`}
							>
								<div className="size-4 rounded-sm bg-muted" />
								{item}
							</div>
						),
					)}
				</div>

				{/* Main View */}
				<div className="col-span-12 grid content-start gap-6 p-6 md:col-span-10 md:p-8">
					{/* Header */}
					<div className="flex items-center justify-between">
						<div>
							<h2 className="font-bold text-2xl">Matters</h2>
							<p className="text-muted-foreground text-sm">
								Track requests, approvals, and tasks
							</p>
						</div>
						<button
							type="button"
							className="rounded-sm bg-primary px-4 py-2 font-medium text-primary-foreground text-sm"
						>
							+ New Matter
						</button>
					</div>

					{/* Stats Row */}
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{[
							{ label: "Pending", val: "8", id: "pending" },
							{ label: "In Progress", val: "12", id: "progress" },
							{ label: "Completed Today", val: "5", id: "completed" },
							{ label: "Team Online", val: "6", id: "online" },
						].map((stat) => (
							<div
								key={stat.id}
								className="group border border-border bg-background p-4 transition-colors hover:border-primary"
							>
								<div className="mb-2 font-mono text-muted-foreground text-xs uppercase group-hover:text-primary">
									{stat.label}
								</div>
								<div className="font-bold font-sans text-3xl tracking-tighter">
									{stat.val}
								</div>
							</div>
						))}
					</div>

					{/* Matters List */}
					<div className="border border-border bg-background">
						{/* List Header */}
						<div className="grid grid-cols-12 gap-4 border-border border-b bg-muted/30 px-4 py-3 font-mono text-muted-foreground text-xs uppercase tracking-wider">
							<div className="col-span-2">ID</div>
							<div className="col-span-5">Title</div>
							<div className="col-span-2">Status</div>
							<div className="col-span-2">Assignee</div>
							<div className="col-span-1">Priority</div>
						</div>

						{/* Matter Items */}
						{[
							{
								id: "PUR-123",
								title: "AC Unit Repair - Main Office",
								type: "Purchase",
								status: "Pending Approval",
								assignee: "Rahul",
								priority: "High",
								statusColor: "bg-yellow-500",
							},
							{
								id: "REP-45",
								title: "Fix leaking pipe in Hall B",
								type: "Repair",
								status: "In Progress",
								assignee: "Maintenance",
								priority: "Medium",
								statusColor: "bg-blue-500",
							},
							{
								id: "REQ-89",
								title: "Stationery supplies for Accounts",
								type: "Request",
								status: "Approved",
								assignee: "Priya",
								priority: "Low",
								statusColor: "bg-green-500",
							},
							{
								id: "TSK-156",
								title: "Monthly financial reports",
								type: "Task",
								status: "Done",
								assignee: "Amit",
								priority: "High",
								statusColor: "bg-gray-500",
							},
							{
								id: "PUR-124",
								title: "New chairs for conference room",
								type: "Purchase",
								status: "Pending",
								assignee: "Transport",
								priority: "Medium",
								statusColor: "bg-yellow-500",
							},
							{
								id: "REQ-90",
								title: "Transport for field visit tomorrow",
								type: "Request",
								status: "In Progress",
								assignee: "Transport Mgr",
								priority: "High",
								statusColor: "bg-blue-500",
							},
						].map((matter, i) => (
							<div
								key={matter.id}
								className={`grid grid-cols-12 gap-4 px-4 py-4 ${i !== 5 ? "border-border border-b" : ""} hover:bg-muted/20`}
							>
								<div className="col-span-2 flex items-center gap-2">
									<span className="font-mono text-primary text-sm">
										{matter.id}
									</span>
									<span className="rounded-sm bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
										{matter.type}
									</span>
								</div>
								<div className="col-span-5 flex items-center font-medium text-sm">
									{matter.title}
								</div>
								<div className="col-span-2 flex items-center gap-2">
									<div
										className={`size-2 rounded-full ${matter.statusColor}`}
									/>
									<span className="text-sm">{matter.status}</span>
								</div>
								<div className="col-span-2 flex items-center gap-2">
									<div className="center flex size-6 rounded-full bg-primary/10 font-bold text-primary text-xs">
										{matter.assignee.charAt(0)}
									</div>
									<span className="text-muted-foreground text-sm">
										{matter.assignee}
									</span>
								</div>
								<div className="col-span-1 flex items-center">
									<span
										className={`text-xs ${matter.priority === "High" ? "text-destructive" : matter.priority === "Medium" ? "text-yellow-600" : "text-muted-foreground"}`}
									>
										{matter.priority}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

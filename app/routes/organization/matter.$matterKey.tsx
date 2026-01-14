import { useQuery, useZero } from "@rocicorp/zero/react";
import {
	Archive,
	ArchiveRestore,
	ChevronRight,
	MoreHorizontal,
	Star,
	Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { queries } from "zero/queries";
import { CACHE_LONG, CACHE_NAV } from "zero/query-cache-policy";
import { AdminApproveSection } from "~/components/matter/admin-approve-section";
import { AttachmentList } from "~/components/matter/attachment-list";
import { AttachmentUpload } from "~/components/matter/attachment-upload";
import { CommentInput } from "~/components/matter/comment-input";
import {
	MemberSelect,
	type MemberSelectorItem,
	PrioritySelect,
	StatusSelect,
} from "~/components/matter/matter-field-selectors";
import { PropertyPill, PropertyRow } from "~/components/matter/properties";
import { TaskTimeline } from "~/components/matter/task-timeline";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import { parseMatterKey } from "~/db/helpers";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { usePermissions } from "~/hooks/use-permissions";
import { Priority, type PriorityValue } from "~/lib/matter-constants";
import type { Route } from "./+types/matter.$matterKey";

export const meta: Route.MetaFunction = ({ params }) => [
	{ title: `Matter ${params.matterKey}` },
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const matterKey = params.matterKey;
	if (!matterKey) throw new Response("Not Found", { status: 404 });
	const parsed = parseMatterKey(matterKey);
	if (!parsed) throw new Response("Invalid matter key format", { status: 400 });
	return { matterKey, parsed };
}

export default function TaskDetailPage({ loaderData }: Route.ComponentProps) {
	const { orgSlug } = useOrgLoaderData();
	const { parsed } = loaderData;
	const navigate = useNavigate();
	const z = useZero();

	// 1. Data Fetching
	const [matter] = useQuery(
		queries.getMatterByKey({ code: parsed.code, shortID: parsed.shortID }),
		CACHE_NAV,
	);

	const [members = []] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);
	const [teamMemberships = []] = useQuery(
		matter?.teamId && queries.getTeamMembers({ teamId: matter.teamId }),
		CACHE_LONG,
	);
	const [statuses = []] = useQuery(
		matter?.teamId && queries.getTeamStatuses({ teamId: matter.teamId }),
		CACHE_LONG,
	);

	// 2. Permissions
	const perms = usePermissions(matter?.teamId, teamMemberships);
	const authRole = perms.role as string;
	const isAdmin =
		perms.isManager || authRole === "admin" || authRole === "owner";
	const canEdit = matter
		? perms.canEditMatter(matter.authorId, matter.assigneeId) || isAdmin
		: false;

	// Filter statuses based on matter type (task vs request)
	const filteredStatuses = useMemo(() => {
		if (!matter) return statuses;
		const isRequest = matter.type === "request";
		return statuses.filter((s) => {
			const isRequestStatus =
				s.type === "pending_approval" || s.type === "rejected";
			return isRequest ? isRequestStatus : !isRequestStatus;
		});
	}, [matter, statuses]);

	// 3. State & Loading
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isUpdating, setIsUpdating] = useState({
		status: false,
		priority: false,
		assignee: false,
	});

	const handleStatusChange = useCallback(
		(s: string) => {
			if (!matter) return;
			setIsUpdating((prev) => ({ ...prev, status: true }));
			z.mutate(
				mutators.matter.updateStatus({ id: matter.id, statusId: s }),
			).server.finally(() =>
				setIsUpdating((prev) => ({ ...prev, status: false })),
			);
		},
		[matter, z],
	);

	const handleAssign = useCallback(
		(u: string | null) => {
			if (!matter) return;
			setIsUpdating((prev) => ({ ...prev, assignee: true }));
			z.mutate(
				mutators.matter.assign({ id: matter.id, assigneeId: u }),
			).server.finally(() =>
				setIsUpdating((prev) => ({ ...prev, assignee: false })),
			);
		},
		[matter, z],
	);

	const handlePriorityChange = useCallback(
		(p: PriorityValue) => {
			if (!matter) return;
			setIsUpdating((prev) => ({ ...prev, priority: true }));
			z.mutate(
				mutators.matter.update({ id: matter.id, priority: p }),
			).server.finally(() =>
				setIsUpdating((prev) => ({ ...prev, priority: false })),
			);
		},
		[matter, z],
	);

	const handleArchive = useCallback(() => {
		if (!matter) return;
		if (matter.archived) {
			z.mutate(mutators.matter.unarchive({ id: matter.id }))
				.server.then(() => toast.success("Matter unarchived"))
				.catch(() => toast.error("Failed to unarchive matter"));
		} else {
			z.mutate(mutators.matter.archive({ id: matter.id }))
				.server.then(() => toast.success("Matter archived"))
				.catch(() => toast.error("Failed to archive matter"));
		}
	}, [matter, z]);

	const handleDelete = useCallback(() => {
		if (!matter) return;
		z.mutate(mutators.matter.delete({ id: matter.id }))
			.server.then(() => {
				toast.success("Matter deleted");
				navigate(`/${orgSlug}`);
			})
			.catch(() => toast.error("Failed to delete matter"));
	}, [matter, orgSlug, navigate, z]);

	const handleBack = useCallback(() => {
		if (window.history.state && window.history.state.idx > 0) navigate(-1);
		else navigate(`/${orgSlug}`);
	}, [navigate, orgSlug]);

	if (!matter) {
		return (
			<div className="flex h-full flex-col bg-background">
				<header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
					<div className="h-4 w-16 animate-pulse rounded bg-muted" />
					<div className="h-4 w-24 animate-pulse rounded bg-muted" />
				</header>
				<div className="flex-1 p-8">
					<div className="mx-auto max-w-3xl space-y-6">
						<div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
						<div className="space-y-2">
							<div className="h-4 w-full animate-pulse rounded bg-muted" />
							<div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
							<div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="@container flex h-full flex-col bg-background">
			<header className="flex h-12 shrink-0 items-center justify-between border-b px-3 md:px-4">
				<div className="flex min-w-0 items-center gap-2 text-muted-foreground">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 px-2"
						onClick={handleBack}
					>
						<ChevronRight className="size-4 rotate-180" />
						<span className="ml-1 hidden sm:inline">Back</span>
					</Button>
					<span className="truncate font-medium font-mono text-muted-foreground/50 text-xs">
						{matter.teamCode}-{matter.shortID}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" className="size-8">
						<Star className="size-4" />
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="size-8">
								<MoreHorizontal className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem onClick={handleArchive}>
								{matter.archived ? (
									<>
										<ArchiveRestore className="mr-2 size-4" /> Unarchive
									</>
								) : (
									<>
										<Archive className="mr-2 size-4" /> Archive
									</>
								)}
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950"
								onClick={() => setIsDeleteDialogOpen(true)}
							>
								<Trash2 className="mr-2 size-4" /> Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			<div className="flex flex-1 @3xl:flex-row flex-col overflow-hidden">
				<main className="flex-1 overflow-y-auto @3xl:pb-6 pb-20">
					<div className="mx-auto max-w-3xl @3xl:px-8 px-4 @3xl:py-8 py-4">
						<div className="@3xl:space-y-6 space-y-4">
							{matter.archived && (
								<div className="mb-4 flex items-center justify-between rounded-lg border border-status-pending/20 bg-status-pending/10 p-4">
									<div className="flex items-center gap-2">
										<Archive className="size-4 text-status-pending" />
										<span className="text-sm text-status-pending">
											This matter is archived.
										</span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 text-status-pending hover:bg-status-pending/20"
										onClick={handleArchive}
									>
										Unarchive
									</Button>
								</div>
							)}

							<AdminApproveSection
								isVisible={matter.type === "request"}
								isAdmin={isAdmin}
								matterId={matter.id}
								statusType={matter.status?.type}
							/>

							<h1 className="font-bold @3xl:text-2xl text-xl">
								{matter.title}
							</h1>

							{/* Mobile Properties Row */}
							<div className="-mx-4 flex @3xl:hidden gap-2 overflow-x-auto px-4 pb-2">
								{/* Hide status selector for requests - they use approval flow */}
								{matter.type !== "request" && (
									<PropertyPill label="Status">
										<StatusSelect
											value={matter.statusId}
											statuses={filteredStatuses}
											onChange={handleStatusChange}
											disabled={!canEdit || isUpdating.status}
											showLabel
										/>
									</PropertyPill>
								)}
								<PropertyPill label="Priority">
									<PrioritySelect
										value={
											Number(matter.priority ?? Priority.NONE) as PriorityValue
										}
										onChange={handlePriorityChange}
										disabled={!canEdit || isUpdating.priority}
										showLabel
									/>
								</PropertyPill>
								<PropertyPill label="Assignee">
									<MemberSelect
										value={matter.assigneeId}
										members={members as readonly MemberSelectorItem[]}
										onChange={handleAssign}
										disabled={!canEdit || isUpdating.assignee}
										showLabel
									/>
								</PropertyPill>
							</div>

							<div className="whitespace-pre-wrap text-foreground/80 text-sm leading-relaxed">
								{matter.description || (
									<span className="text-muted-foreground italic">
										No description
									</span>
								)}
							</div>

							<Separator />

							<div className="space-y-4">
								<h2 className="font-semibold text-sm">Attachments</h2>
								<AttachmentList
									attachments={matter.attachments}
									canDelete={canEdit}
								/>
								<div className="mt-2">
									<AttachmentUpload matterId={matter.id} />
								</div>
							</div>

							<Separator />

							<div className="space-y-4">
								<h2 className="font-semibold text-sm">Activity</h2>
								<CommentInput matterId={matter.id} />
								<TaskTimeline
									matterId={matter.id}
									members={members}
									statuses={statuses}
								/>
							</div>
						</div>
					</div>
				</main>

				{/* Desktop Sidebar */}
				<aside className="@3xl:block hidden w-72 shrink-0 overflow-y-auto border-l bg-muted/5 p-4">
					<div className="space-y-6">
						<div className="space-y-2">
							<h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
								Properties
							</h3>
							{/* Hide status selector for requests - they use approval flow */}
							{matter.type !== "request" && (
								<PropertyRow label="Status">
									<StatusSelect
										value={matter.statusId}
										statuses={filteredStatuses}
										onChange={handleStatusChange}
										disabled={!canEdit || isUpdating.status}
										showLabel
										className="h-8 w-full justify-start border bg-background px-2"
									/>
								</PropertyRow>
							)}
							<PropertyRow label="Priority">
								<PrioritySelect
									value={
										Number(matter.priority ?? Priority.NONE) as PriorityValue
									}
									onChange={handlePriorityChange}
									disabled={!canEdit || isUpdating.priority}
									showLabel
									className="h-8 w-full justify-start border bg-background px-2"
								/>
							</PropertyRow>
							<PropertyRow label="Assignee">
								<MemberSelect
									value={matter.assigneeId}
									members={members as readonly MemberSelectorItem[]}
									onChange={handleAssign}
									disabled={!canEdit || isUpdating.assignee}
									showLabel
									className="h-8 w-full justify-start border bg-background px-2"
								/>
							</PropertyRow>
						</div>

						<Separator />

						<div className="space-y-2 text-xs">
							<h3 className="font-medium text-muted-foreground uppercase tracking-wider">
								Details
							</h3>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Created</span>
								<span className="text-muted-foreground/80">
									{new Date(matter.createdAt).toLocaleDateString()}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Updated</span>
								<span className="text-muted-foreground/80">
									{new Date(
										matter.updatedAt || matter.createdAt,
									).toLocaleDateString()}
								</span>
							</div>
						</div>
					</div>
				</aside>
			</div>

			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Delete Matter</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete {matter.teamCode}-{matter.shortID}
							? This action cannot be easily undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="ghost"
							onClick={() => setIsDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

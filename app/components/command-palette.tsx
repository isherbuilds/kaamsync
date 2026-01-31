"use client";

import FileText from "lucide-react/dist/esm/icons/file-text";
import FolderOpen from "lucide-react/dist/esm/icons/folder-open";
import Home from "lucide-react/dist/esm/icons/home";
import Inbox from "lucide-react/dist/esm/icons/inbox";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import Plus from "lucide-react/dist/esm/icons/plus";
import Search from "lucide-react/dist/esm/icons/search";
import Settings from "lucide-react/dist/esm/icons/settings";
import Users from "lucide-react/dist/esm/icons/users";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "~/components/ui/command";

interface CommandPaletteProps {
	teams?: Array<{ id: string; name: string; code: string; slug: string }>;
}

interface RecentItem {
	id: string;
	title: string;
	url: string;
	type: "matter" | "team" | "page";
}

const RECENT_ITEMS_KEY = "kaamsync:command-palette:recent";

function getRecentItems(): RecentItem[] {
	if (typeof window === "undefined") return [];
	try {
		const stored = localStorage.getItem(RECENT_ITEMS_KEY);
		return stored ? (JSON.parse(stored) as RecentItem[]) : [];
	} catch {
		return [];
	}
}

function addRecentItem(item: RecentItem) {
	if (typeof window === "undefined") return;
	try {
		const existing = getRecentItems();
		const filtered = existing.filter((i) => i.id !== item.id);
		const updated = [item, ...filtered].slice(0, 5);
		localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
	} catch {
		return [];
	}
}

export function CommandPalette({ teams = [] }: CommandPaletteProps) {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	const params = useParams();
	const orgSlug = params.orgSlug as string;
	const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

	useEffect(() => {
		setRecentItems(getRecentItems());
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	const handleNavigate = useCallback(
		(url: string, item?: RecentItem) => {
			setOpen(false);
			if (item) {
				addRecentItem(item);
				setRecentItems(getRecentItems());
			}
			setTimeout(() => navigate(url), 50);
		},
		[navigate],
	);

	const navigationCommands = [
		{
			id: "nav-tasks",
			label: "Go to Tasks",
			icon: LayoutDashboard,
			url: `/${orgSlug}/tasks`,
			shortcut: "G T",
		},
		{
			id: "nav-requests",
			label: "Go to Requests",
			icon: Inbox,
			url: `/${orgSlug}/requests`,
			shortcut: "G R",
		},
		{
			id: "nav-settings",
			label: "Go to Settings",
			icon: Settings,
			url: `/${orgSlug}/settings`,
			shortcut: "G S",
		},
		{
			id: "nav-home",
			label: "Go to Home",
			icon: Home,
			url: "/",
			shortcut: "G H",
		},
	];

	const actionCommands = [
		{
			id: "action-create-task",
			label: "Create new Task",
			icon: Plus,
			url: `/${orgSlug}/tasks?create=true`,
			shortcut: "C T",
		},
		{
			id: "action-create-request",
			label: "Create new Request",
			icon: FileText,
			url: `/${orgSlug}/requests?create=true`,
			shortcut: "C R",
		},
	];

	const hasRecentItems = recentItems.length > 0;
	const hasTeams = teams.length > 0;

	return (
		<CommandDialog open={open} onOpenChange={setOpen}>
			<CommandInput placeholder="Type a command or search..." />
			<CommandList>
				<CommandEmpty>
					<div className="flex flex-col items-center gap-2 py-8">
						<Search className="size-8 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">No results found</p>
						<p className="text-muted-foreground text-xs">
							Try different keywords or check your spelling
						</p>
					</div>
				</CommandEmpty>

				{hasRecentItems && (
					<CommandGroup heading="Recent">
						{recentItems.map((item) => (
							<CommandItem
								key={item.id}
								onSelect={() => handleNavigate(item.url, item)}
							>
								{item.type === "matter" && <FileText className="size-4" />}
								{item.type === "team" && <Users className="size-4" />}
								{item.type === "page" && <FolderOpen className="size-4" />}
								<span>{item.title}</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				<CommandGroup heading="Navigation">
					{navigationCommands.map((cmd) => (
						<CommandItem
							key={cmd.id}
							onSelect={() =>
								handleNavigate(cmd.url, {
									id: cmd.id,
									title: cmd.label,
									url: cmd.url,
									type: "page",
								})
							}
						>
							<cmd.icon className="size-4" />
							<span>{cmd.label}</span>
							<CommandShortcut>{cmd.shortcut}</CommandShortcut>
						</CommandItem>
					))}
				</CommandGroup>

				{hasTeams && (
					<>
						<CommandSeparator />
						<CommandGroup heading="Teams">
							{teams.map((team) => (
								<CommandItem
									key={team.id}
									onSelect={() =>
										handleNavigate(`/${orgSlug}/${team.code}`, {
											id: team.id,
											title: team.name,
											url: `/${orgSlug}/${team.code}`,
											type: "team",
										})
									}
								>
									<FolderOpen className="size-4" />
									<span>{team.name}</span>
									<span className="ml-auto text-muted-foreground text-xs">
										{team.code}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</>
				)}

				<CommandSeparator />

				<CommandGroup heading="Actions">
					{actionCommands.map((cmd) => (
						<CommandItem
							key={cmd.id}
							onSelect={() =>
								handleNavigate(cmd.url, {
									id: cmd.id,
									title: cmd.label,
									url: cmd.url,
									type: "page",
								})
							}
						>
							<cmd.icon className="size-4" />
							<span>{cmd.label}</span>
							<CommandShortcut>{cmd.shortcut}</CommandShortcut>
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}

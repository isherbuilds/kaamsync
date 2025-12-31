import type { Row } from "@rocicorp/zero";
import { Check, User } from "lucide-react";
import {
	type ButtonHTMLAttributes,
	forwardRef,
	memo,
	useCallback,
	useMemo,
	useState,
} from "react";
import { renderPriorityIcon } from "~/components/icons";
import { CustomAvatar } from "~/components/ui/avatar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "~/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import {
	compareStatuses,
	getPriorityColor,
	Priority,
	type PriorityValue,
	STATUS_TYPE_COLORS,
	STATUS_TYPE_ICONS,
	type StatusType,
} from "~/lib/matter-constants";
import { cn } from "~/lib/utils";

// This type covers both Org Members and Team Members query shapes
export type MemberSelectorItem = {
	userId: string;
	user?: Row["usersTable"]; // Team query shape
	usersTable?: Row["usersTable"]; // Org query shape
	role?: string;
};

type StatusRow = Row["statusesTable"];

interface SelectorProps<T> {
	value?: T | null;
	onChange: (val: T) => void;
	name?: string;
	disabled?: boolean;
	align?: "start" | "end" | "center";
	showLabel?: boolean;
	className?: string;
}

interface SelectorTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	label: string;
}

const SelectorTrigger = memo(
	forwardRef<HTMLButtonElement, SelectorTriggerProps>(
		({ children, label, className, disabled, onClick, ...props }, ref) => (
			<button
				ref={ref}
				type="button"
				aria-label={label}
				disabled={disabled}
				{...props}
				onClick={(e) => {
					e.stopPropagation();
					onClick?.(e);
				}}
				className={cn(
					"flex items-center gap-2 rounded px-1.5 py-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50",
					className,
				)}
			>
				{children}
			</button>
		),
	),
);
SelectorTrigger.displayName = "SelectorTrigger";

export const PrioritySelect = memo(
	({
		value,
		onChange,
		name,
		disabled,
		align = "start",
		showLabel,
		className,
	}: SelectorProps<PriorityValue>) => {
		const [open, setOpen] = useState(false);
		const current = PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[4];

		const handleSelect = useCallback(
			(priorityValue: PriorityValue) => {
				onChange(priorityValue);
				setOpen(false);
			},
			[onChange],
		);

		return (
			<Popover open={open} onOpenChange={setOpen}>
				<input type="hidden" name={name} value={value ?? Priority.NONE} />
				<PopoverTrigger asChild>
					<SelectorTrigger
						label="Priority"
						className={className}
						disabled={disabled}
					>
						<div className={cn("shrink-0", getPriorityColor(current.value))}>
							{renderPriorityIcon(current.value)}
						</div>
						{showLabel && <span className="text-xs">{current.label}</span>}
					</SelectorTrigger>
				</PopoverTrigger>
				<PopoverContent className="w-40 p-0" align={align} sideOffset={8}>
					<Command>
						<CommandInput
							placeholder="Set priority..."
							className="h-8 text-xs"
						/>
						<CommandList>
							<CommandGroup>
								{PRIORITIES.map((p) => (
									<CommandItem
										key={p.value}
										value={p.label}
										onSelect={() => handleSelect(p.value)}
										className="text-xs"
									>
										<div className={cn("mr-2", getPriorityColor(p.value))}>
											{renderPriorityIcon(p.value)}
										</div>
										<span>{p.label}</span>
										{value === p.value && <Check className="ml-auto size-3" />}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		);
	},
);

const PRIORITIES: { value: PriorityValue; label: string }[] = [
	{ value: Priority.URGENT, label: "Urgent" },
	{ value: Priority.HIGH, label: "High" },
	{ value: Priority.MEDIUM, label: "Medium" },
	{ value: Priority.LOW, label: "Low" },
	{ value: Priority.NONE, label: "None" },
];

export const StatusSelect = memo(
	({
		value,
		statuses = [],
		onChange,
		name,
		disabled,
		align = "start",
		showLabel,
		className,
	}: SelectorProps<string> & { statuses: readonly StatusRow[] }) => {
		const [open, setOpen] = useState(false);
		const current = statuses.find((s) => s.id === value);
		const sorted = useMemo(
			() => [...statuses].sort(compareStatuses),
			[statuses],
		);
		const statusType = (current?.type || "not_started") as StatusType;
		const Icon = STATUS_TYPE_ICONS[statusType];

		const handleSelect = useCallback(
			(statusId: string) => {
				onChange(statusId);
				setOpen(false);
			},
			[onChange],
		);

		return (
			<Popover open={open} onOpenChange={setOpen}>
				<input type="hidden" name={name} value={value ?? ""} />
				<PopoverTrigger asChild>
					<SelectorTrigger
						label="Status"
						className={className}
						disabled={disabled}
					>
						<Icon
							className={cn(
								"size-3.5 shrink-0",
								STATUS_TYPE_COLORS[statusType],
							)}
						/>
						{showLabel && (
							<span className="w-fit truncate text-xs">{current?.name}</span>
						)}
					</SelectorTrigger>
				</PopoverTrigger>
				<PopoverContent className="w-48 p-0" align={align} sideOffset={8}>
					<Command>
						<CommandInput placeholder="Status..." className="h-8 text-xs" />
						<CommandList>
							<CommandEmpty className="py-2 text-center text-xs">
								No status
							</CommandEmpty>
							<CommandGroup>
								{sorted.map((s) => {
									const SIcon =
										STATUS_TYPE_ICONS[(s.type as StatusType) || "not_started"];
									return (
										<CommandItem
											key={s.id}
											value={s.name}
											onSelect={() => handleSelect(s.id)}
											className="text-xs"
										>
											<SIcon
												className={cn(
													"mr-2 size-3.5",
													STATUS_TYPE_COLORS[
														(s.type as StatusType) || "not_started"
													],
												)}
											/>
											<span>{s.name}</span>
											{value === s.id && <Check className="ml-auto size-3" />}
										</CommandItem>
									);
								})}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		);
	},
);

export const MemberSelect = memo(
	({
		value,
		members = [],
		onChange,
		name,
		disabled,
		align = "start",
		showLabel,
		className,
	}: SelectorProps<string | null> & {
		members: readonly MemberSelectorItem[];
	}) => {
		const [open, setOpen] = useState(false);
		const currentMember = members.find((m) => m.userId === value);
		// Check both user and usersTable for compatibility
		const user = currentMember?.user ?? currentMember?.usersTable;

		const handleSelect = useCallback(
			(userId: string | null) => {
				onChange(userId);
				setOpen(false);
			},
			[onChange],
		);

		return (
			<Popover open={open} onOpenChange={setOpen}>
				<input type="hidden" name={name} value={value ?? ""} />
				<PopoverTrigger asChild>
					<SelectorTrigger
						label="Assignee"
						className={className}
						disabled={disabled}
					>
						{value && user ? (
							<CustomAvatar
								className="size-6 shrink-0"
								avatar={user.image}
								name={user.name}
							/>
						) : (
							<div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 border-dashed">
								<User className="size-2.5" />
							</div>
						)}
						{showLabel && (
							<span className="w-fit truncate text-xs">
								{user?.name || "Unassigned"}
							</span>
						)}
					</SelectorTrigger>
				</PopoverTrigger>
				<PopoverContent className="w-64 p-0" align={align} sideOffset={8}>
					<Command>
						<CommandInput placeholder="Assign to..." className="h-8 text-xs" />
						<CommandList>
							<CommandEmpty className="py-2 text-center text-xs">
								No members
							</CommandEmpty>
							<CommandGroup>
								<CommandItem
									value="unassigned"
									onSelect={() => handleSelect(null)}
									className="text-xs"
								>
									<User className="mr-2 size-3.5 opacity-50" />
									<span>Unassigned</span>
									{!value && <Check className="ml-auto size-3" />}
								</CommandItem>
								{members.map((m) => {
									const u = m.user ?? m.usersTable;
									if (!u) return null;
									return (
										<CommandItem
											key={m.userId}
											value={u.name}
											onSelect={() => handleSelect(m.userId)}
											className="text-xs"
										>
											<CustomAvatar
												className="mr-2 size-4"
												avatar={u.image}
												name={u.name}
											/>
											<span className="truncate">{u.name}</span>
											{value === m.userId && (
												<Check className="ml-auto size-3" />
											)}
										</CommandItem>
									);
								})}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		);
	},
);

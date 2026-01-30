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
import { renderPriorityIcon } from "~/components/shared/icons";
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
	getPriorityColorClass,
	Priority,
	type PriorityValue,
	STATUS_TYPE_COLORS,
	STATUS_TYPE_ICONS,
	type StatusType,
	sortStatusComparator,
} from "~/config/matter";
import { cn } from "~/lib/utils";

// ============================================================================
// Types
// ============================================================================

type StatusRow = Row["statusesTable"];

export type MemberOption = {
	userId: string;
	user?: Row["usersTable"];
	usersTable?: Row["usersTable"];
	role?: string | null;
};

interface FieldSelectorBaseProps<T> {
	value?: T | null;
	onChange: (val: T) => void;
	name?: string;
	disabled?: boolean;
	align?: "start" | "end" | "center";
	showLabel?: boolean;
	className?: string;
}

interface PrioritySelectProps extends FieldSelectorBaseProps<PriorityValue> {}

interface StatusSelectProps extends FieldSelectorBaseProps<string> {
	statuses: readonly StatusRow[];
}

interface MemberSelectProps extends FieldSelectorBaseProps<string | null> {
	members: readonly MemberOption[];
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_OPTIONS: { value: PriorityValue; label: string }[] = [
	{ value: Priority.URGENT, label: "Urgent" },
	{ value: Priority.HIGH, label: "High" },
	{ value: Priority.MEDIUM, label: "Medium" },
	{ value: Priority.LOW, label: "Low" },
	{ value: Priority.NONE, label: "None" },
];

// ============================================================================
// Shared Components
// ============================================================================

interface PopoverTriggerButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement> {
	label: string;
}

const PopoverTriggerButton = memo(
	forwardRef<HTMLButtonElement, PopoverTriggerButtonProps>(
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
					"flex items-center gap-2 rounded px-2 py-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50",
					className,
				)}
			>
				{children}
			</button>
		),
	),
);
PopoverTriggerButton.displayName = "PopoverTriggerButton";

// ============================================================================
// Priority Selector
// ============================================================================

export const PrioritySelect = memo(
	({
		value,
		onChange,
		name,
		disabled,
		align = "start",
		showLabel,
		className,
	}: PrioritySelectProps) => {
		const [open, setOpen] = useState(false);

		const currentPriority =
			PRIORITY_OPTIONS.find((p) => p.value === value) ?? PRIORITY_OPTIONS[4];

		const handlePrioritySelect = useCallback(
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
					<PopoverTriggerButton
						label="Priority"
						className={className}
						disabled={disabled}
					>
						<div
							className={cn(
								"shrink-0",
								getPriorityColorClass(currentPriority.value),
							)}
						>
							{renderPriorityIcon(currentPriority.value)}
						</div>
						{showLabel && (
							<span className="text-xs">{currentPriority.label}</span>
						)}
					</PopoverTriggerButton>
				</PopoverTrigger>
				<PopoverContent className="w-40 p-0" align={align} sideOffset={8}>
					<Command>
						<CommandInput
							placeholder="Set priority..."
							className="h-8 text-xs"
						/>
						<CommandList>
							<CommandGroup>
								{PRIORITY_OPTIONS.map((priority) => (
									<CommandItem
										key={priority.value}
										value={priority.label}
										onSelect={() => handlePrioritySelect(priority.value)}
										className="text-xs"
									>
										<div
											className={cn(
												"mr-2",
												getPriorityColorClass(priority.value),
											)}
										>
											{renderPriorityIcon(priority.value)}
										</div>
										<span>{priority.label}</span>
										{value === priority.value && (
											<Check className="ml-auto size-3" />
										)}
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

// ============================================================================
// Status Selector
// ============================================================================

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
	}: StatusSelectProps) => {
		const [open, setOpen] = useState(false);

		const currentStatus = (statuses || []).find((s) => s.id === value);
		const sortedStatuses = useMemo(
			() => [...statuses].sort(sortStatusComparator),
			[statuses],
		);

		const statusType = (currentStatus?.type || "not_started") as StatusType;
		const StatusIcon = STATUS_TYPE_ICONS[statusType];

		const handleStatusSelect = useCallback(
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
					<PopoverTriggerButton
						label="Status"
						className={className}
						disabled={disabled}
					>
						<StatusIcon
							className={cn(
								"size-3.5 shrink-0",
								STATUS_TYPE_COLORS[statusType],
							)}
						/>
						{showLabel && (
							<span className="w-fit truncate text-xs">
								{currentStatus?.name}
							</span>
						)}
					</PopoverTriggerButton>
				</PopoverTrigger>
				<PopoverContent className="w-48 p-0" align={align} sideOffset={8}>
					<Command>
						<CommandInput placeholder="Status..." className="h-8 text-xs" />
						<CommandList>
							<CommandEmpty className="py-2 text-center text-xs">
								No status
							</CommandEmpty>
							<CommandGroup>
								{sortedStatuses.map((status) => {
									const ItemIcon =
										STATUS_TYPE_ICONS[
											(status.type as StatusType) || "not_started"
										];
									return (
										<CommandItem
											key={status.id}
											value={status.name}
											onSelect={() => handleStatusSelect(status.id)}
											className="text-xs"
										>
											<ItemIcon
												className={cn(
													"mr-2 size-3.5",
													STATUS_TYPE_COLORS[
														(status.type as StatusType) || "not_started"
													],
												)}
											/>
											<span>{status.name}</span>
											{value === status.id && (
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

// ============================================================================
// Assignee Selector
// ============================================================================

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
	}: MemberSelectProps) => {
		const [open, setOpen] = useState(false);

		const selectedMember = members.find((m) => m.userId === value);
		const selectedUser = selectedMember?.user ?? selectedMember?.usersTable;

		const handleAssigneeSelect = useCallback(
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
					<PopoverTriggerButton
						label="Assignee"
						className={className}
						disabled={disabled}
					>
						{value && selectedUser ? (
							<CustomAvatar
								className="size-6 shrink-0"
								avatar={selectedUser.image}
								name={selectedUser.name}
							/>
						) : (
							<div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 border-dashed">
								<User className="size-2.5" />
							</div>
						)}
						{showLabel && (
							<span className="w-fit truncate text-xs">
								{selectedUser?.name || "Unassigned"}
							</span>
						)}
					</PopoverTriggerButton>
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
									onSelect={() => handleAssigneeSelect(null)}
									className="text-xs"
								>
									<User className="mr-2 size-3.5 opacity-50" />
									<span>Unassigned</span>
									{!value && <Check className="ml-auto size-3" />}
								</CommandItem>
								{members.map((member) => {
									const memberUser = member.user ?? member.usersTable;
									if (!memberUser) return null;
									return (
										<CommandItem
											key={member.userId}
											value={memberUser.name}
											onSelect={() => handleAssigneeSelect(member.userId)}
											className="text-xs"
										>
											<CustomAvatar
												className="mr-2 size-4"
												avatar={memberUser.image}
												name={memberUser.name}
											/>
											<span className="truncate">{memberUser.name}</span>
											{value === member.userId && (
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

export type MemberSelectorItem = MemberOption;

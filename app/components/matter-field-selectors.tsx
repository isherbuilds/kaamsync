import { Check, User } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
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

// Base selector props
interface BaseSelectProps {
	disabled?: boolean;
	className?: string;
	showLabel?: boolean;
	align?: "start" | "end" | "center";
}

// Generic command popover wrapper
interface SelectPopoverProps extends BaseSelectProps {
	trigger: ReactNode;
	placeholder: string;
	emptyText: string;
	children: (closePopover: () => void) => ReactNode;
	width?: string;
}

function SelectPopover({
	trigger,
	placeholder,
	emptyText,
	children,
	disabled,
	align,
	width = "w-[200px]",
}: SelectPopoverProps) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild disabled={disabled}>
				{trigger}
			</PopoverTrigger>
			<PopoverContent className={cn(width, "p-0")} align={align}>
				<Command>
					<CommandInput placeholder={placeholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup>{children(() => setOpen(false))}</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

// Priority Selector - uses numeric values (0-4)
interface PrioritySelectProps extends BaseSelectProps {
	value: PriorityValue;
	onChange: (priority: PriorityValue) => void;
}

// Priority options sorted by value (0=urgent first, 4=none last)
const PRIORITIES: { value: PriorityValue; label: string }[] = [
	{ value: Priority.URGENT, label: "Urgent" },
	{ value: Priority.HIGH, label: "High" },
	{ value: Priority.MEDIUM, label: "Medium" },
	{ value: Priority.LOW, label: "Low" },
	{ value: Priority.NONE, label: "None" },
];

export function PrioritySelect({
	value,
	onChange,
	disabled,
	className,
	showLabel,
	align,
}: PrioritySelectProps) {
	const current = PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[4];
	const color = getPriorityColor(value);

	return (
		<SelectPopover
			trigger={
				<button
					type="button"
					className={cn(
						"flex items-center gap-2 p-1 rounded-md hover:bg-muted",
						className,
					)}
					onClick={(e) => e.stopPropagation()}
				>
					<div className={cn("shrink-0", color)}>
						{renderPriorityIcon(value)}
					</div>
					{showLabel && <span className="text-sm">{current.label}</span>}
				</button>
			}
			placeholder="Search priority..."
			emptyText="No priority found."
			disabled={disabled}
			align={align}
		>
			{(close) =>
				PRIORITIES.map((priority) => (
					<CommandItem
						key={priority.value}
						value={priority.label}
						onSelect={() => {
							onChange(priority.value);
							close();
						}}
					>
						<div className={cn("mr-2", getPriorityColor(priority.value))}>
							{renderPriorityIcon(priority.value)}
						</div>
						<span>{priority.label}</span>
						{value === priority.value && <Check className="ml-auto size-4" />}
					</CommandItem>
				))
			}
		</SelectPopover>
	);
}

// Status Selector
interface StatusSelectProps extends BaseSelectProps {
	value: string;
	// biome-ignore lint/suspicious/noExplicitAny: Zero query return types are complex
	statuses: any[];
	onChange: (statusId: string) => void;
	compact?: boolean;
}

export function StatusSelect({
	value,
	statuses,
	onChange,
	disabled,
	className,
	showLabel,
	align,
	compact,
}: StatusSelectProps) {
	const current = statuses.find((s) => s.id === value);
	const statusType = (current?.type || "not_started") as StatusType;
	const StatusIcon = STATUS_TYPE_ICONS[statusType];
	const statusColor =
		STATUS_TYPE_COLORS[statusType] || STATUS_TYPE_COLORS.not_started;
	const sorted = useMemo(
		() => statuses.slice().sort(compareStatuses),
		[statuses],
	);

	return (
		<SelectPopover
			trigger={
				<button
					type="button"
					className={cn(
						"flex items-center rounded-full hover:bg-muted",
						compact ? "gap-1.5" : "gap-2",
						compact ? "p-0.5" : "p-1",
						className,
					)}
					onClick={(e) => e.stopPropagation()}
				>
					<StatusIcon
						className={cn(
							compact ? "size-3.5" : "size-4",
							"shrink-0",
							statusColor,
						)}
					/>
					{(showLabel || compact) && (
						<span
							className={cn(
								compact ? "text-[10px]" : "text-sm",
								"truncate max-w-20",
							)}
						>
							{current?.name}
						</span>
					)}
				</button>
			}
			placeholder="Search status..."
			emptyText="No status found."
			disabled={disabled}
			align={align}
		>
			{(close) =>
				sorted.map((status) => {
					const Icon =
						STATUS_TYPE_ICONS[(status.type as StatusType) || "not_started"];
					const color =
						STATUS_TYPE_COLORS[(status.type as StatusType) || "not_started"];
					return (
						<CommandItem
							key={status.id}
							value={status.name}
							onSelect={() => {
								onChange(status.id);
								close();
							}}
						>
							<Icon className={cn("mr-2 size-4", color)} />
							<span>{status.name}</span>
							{value === status.id && <Check className="ml-auto size-4" />}
						</CommandItem>
					);
				})
			}
		</SelectPopover>
	);
}

// Assignee Selector
interface AssigneeSelectProps extends BaseSelectProps {
	value: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: Zero query return types are complex
	members: any[];
	onChange: (userId: string | null) => void;
}

export function AssigneeSelect({
	value,
	members,
	onChange,
	disabled,
	className,
	showLabel,
	align,
}: AssigneeSelectProps) {
	const current = members.find((m) => m.userId === value);
	const user = current?.user ?? current?.usersTable;
	const displayName = user?.name || user?.email || current?.userId || "?";
	const avatar = user?.image ?? undefined;

	return (
		<SelectPopover
			trigger={
				<button
					type="button"
					className={cn(
						"flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors",
						!value &&
							"text-muted-foreground hover:text-foreground hover:bg-muted/80",
						className,
					)}
					onClick={(e) => e.stopPropagation()}
				>
					{value ? (
						<CustomAvatar
							className="size-6 shrink-0"
							avatar={avatar}
							name={displayName}
						/>
					) : (
						<div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 bg-transparent hover:border-muted-foreground hover:bg-muted/50 transition-all">
							<User className="size-3.5" />
						</div>
					)}
					{showLabel && (
						<span className="text-sm">{displayName || "Unassigned"}</span>
					)}
				</button>
			}
			placeholder="Search members..."
			emptyText="No member found."
			disabled={disabled}
			align={align}
			width="w-60"
		>
			{(close) => (
				<>
					<CommandItem
						value="unassigned"
						onSelect={() => {
							onChange(null);
							close();
						}}
					>
						<User className="mr-2 size-4 text-muted-foreground" />
						<span>Unassigned</span>
						{!value && <Check className="ml-auto size-4" />}
					</CommandItem>
					{members.map((member) => {
						const u = member.usersTable ?? member.user;
						const name = u?.name || u?.email || member.userId || "?";
						const searchValue = `${u?.name ?? ""} ${u?.email ?? ""}`.trim();
						return (
							<CommandItem
								key={member.id}
								value={searchValue}
								onSelect={() => {
									onChange(member.userId);
									close();
								}}
							>
								<CustomAvatar
									className="mr-2 size-5"
									avatar={u?.image ?? undefined}
									name={name}
								/>
								<span>{name}</span>
								{value === member.userId && (
									<Check className="ml-auto size-4" />
								)}
							</CommandItem>
						);
					})}
				</>
			)}
		</SelectPopover>
	);
}

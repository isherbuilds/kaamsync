import { cn } from "~/lib/utils";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
	className?: string;
	color?: string;
}

type GoogleIconProps = {
	className?: string;
	theme?: "light" | "dark";
};

// ============================================================================
// SVG BASE CONFIGURATION
// ============================================================================

const BASE_SVG_PROPS = {
	fill: "currentColor",
	focusable: false,
	role: "img" as const,
	viewBox: "0 0 16 16",
	xmlns: "http://www.w3.org/2000/svg",
} as const;

// ============================================================================
// PRIORITY ICONS
// ============================================================================

export const NoPriorityIcon = ({ className, color, ...props }: IconProps) => (
	<svg
		{...BASE_SVG_PROPS}
		aria-label="No Priority"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>No Priority</title>
		<rect height="1.5" opacity="0.9" rx="0.5" width="3" x="1.5" y="7.25" />
		<rect height="1.5" opacity="0.9" rx="0.5" width="3" x="6.5" y="7.25" />
		<rect height="1.5" opacity="0.9" rx="0.5" width="3" x="11.5" y="7.25" />
	</svg>
);

export const UrgentPriorityIcon = ({
	className,
	color,
	...props
}: IconProps) => (
	<svg
		{...BASE_SVG_PROPS}
		aria-label="Urgent Priority"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>Urgent Priority</title>
		<path d="M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z" />
	</svg>
);

export const HighPriorityIcon = ({ className, color, ...props }: IconProps) => (
	<svg
		{...BASE_SVG_PROPS}
		aria-label="High Priority"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>High Priority</title>
		<rect height="6" rx="1" width="3" x="1.5" y="8" />
		<rect height="9" rx="1" width="3" x="6.5" y="5" />
		<rect height="12" rx="1" width="3" x="11.5" y="2" />
	</svg>
);

export const MediumPriorityIcon = ({
	className,
	color,
	...props
}: IconProps) => (
	<svg
		{...BASE_SVG_PROPS}
		aria-label="Medium Priority"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>Medium Priority</title>
		<rect height="6" rx="1" width="3" x="1.5" y="8" />
		<rect height="9" rx="1" width="3" x="6.5" y="5" />
		<rect fillOpacity="0.4" height="12" rx="1" width="3" x="11.5" y="2" />
	</svg>
);

export const LowPriorityIcon = ({ className, color, ...props }: IconProps) => (
	<svg
		{...BASE_SVG_PROPS}
		aria-label="Low Priority"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>Low Priority</title>
		<rect height="6" rx="1" width="3" x="1.5" y="8" />
		<rect fillOpacity="0.4" height="9" rx="1" width="3" x="6.5" y="5" />
		<rect fillOpacity="0.4" height="12" rx="1" width="3" x="11.5" y="2" />
	</svg>
);

// ============================================================================
// STATUS ICONS
// ============================================================================

export const BacklogStatusIcon = ({
	className,
	color,
	...props
}: IconProps) => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 14 14"
		fill="none"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>Backlog Status</title>
		<circle
			cx="7"
			cy="7"
			r="6"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeDasharray="1.4 1.74"
			strokeDashoffset="0.65"
		/>
		<circle
			className="progress"
			cx="7"
			cy="7"
			r="2"
			fill="none"
			stroke="currentColor"
			strokeWidth="4"
			strokeDasharray="0 100"
			strokeDashoffset="0"
			transform="rotate(-90 7 7)"
		/>
	</svg>
);

export const NotStartedStatusIcon = ({
	className,
	color,
	...props
}: IconProps) => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 14 14"
		fill="none"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>Not Started Status</title>
		<circle
			cx="7"
			cy="7"
			r="6"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeDasharray="3.14 0"
			strokeDashoffset="-0.7"
		/>
		<circle
			className="progress"
			cx="7"
			cy="7"
			r="2"
			fill="none"
			stroke="currentColor"
			strokeWidth="4"
			strokeDasharray="0 100"
			strokeDashoffset="0"
			transform="rotate(-90 7 7)"
		/>
	</svg>
);

export const StartedStatusIcon = ({
	className,
	color,
	...props
}: IconProps) => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 14 14"
		fill="none"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>Started Status</title>
		<circle
			cx="7"
			cy="7"
			r="6"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeDasharray="3.14 0"
			strokeDashoffset="-0.7"
		/>
		<circle
			className="progress"
			cx="7"
			cy="7"
			r="2"
			fill="none"
			stroke="currentColor"
			strokeWidth="4"
			strokeDasharray="6 100"
			strokeDashoffset="0"
			transform="rotate(-90 7 7)"
		/>
	</svg>
);

export const PendingApprovalStatusIcon = ({
	className,
	color,
	...props
}: IconProps) => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 14 14"
		fill="none"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>Pending Approval Status</title>
		<circle
			cx="7"
			cy="7"
			r="6"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeDasharray="3.14 0"
			strokeDashoffset="-0.7"
		/>
		<circle
			className="progress"
			cx="7"
			cy="7"
			r="2"
			fill="none"
			stroke="currentColor"
			strokeWidth="4"
			strokeDasharray="4.167846253762459 100"
			strokeDashoffset="0"
			transform="rotate(-90 7 7)"
		/>
	</svg>
);

export const CompletedStatusIcon = ({
	className,
	color,
	...props
}: IconProps) => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 14 14"
		fill="none"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>Completed Status</title>
		<circle
			cx="7"
			cy="7"
			r="6"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeDasharray="3.14 0"
			strokeDashoffset="-0.7"
		/>
		<circle
			className="progress"
			cx="7"
			cy="7"
			r="2"
			fill="currentColor"
			stroke="currentColor"
			strokeWidth="6"
			strokeDasharray="18.84955592153876 37.69911184307752"
			strokeDashoffset="0"
			transform="rotate(-90 7 7)"
		/>
		<path
			d="M4.5 7L6.5 9L9.5 5"
			stroke="#fff"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const CanceledStatusIcon = ({
	className,
	color,
	...props
}: IconProps) => (
	<svg
		width="14"
		height="14"
		viewBox="0 0 14 14"
		fill="none"
		className={cn("size-3.5", className)}
		style={color ? { color } : undefined}
		{...props}
	>
		<title>Canceled Status</title>
		<circle
			cx="7"
			cy="7"
			r="6"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeDasharray="3.14 0"
			strokeDashoffset="-0.7"
		/>
		<circle
			className="progress"
			cx="7"
			cy="7"
			r="2"
			fill="none"
			stroke="currentColor"
			strokeWidth="6"
			strokeDasharray="18.84955592153876 37.69911184307752"
			strokeDashoffset="0"
			transform="rotate(-90 7 7)"
		/>
		<path
			stroke="none"
			fill="#fff"
			d="M3.73657 3.73657C4.05199 3.42114 4.56339 3.42114 4.87881 3.73657L5.93941 4.79716L7 5.85775L9.12117 3.73657C9.4366 3.42114 9.94801 3.42114 10.2634 3.73657C10.5789 4.05199 10.5789 4.56339 10.2634 4.87881L8.14225 7L10.2634 9.12118C10.5789 9.4366 10.5789 9.94801 10.2634 10.2634C9.94801 10.5789 9.4366 10.5789 9.12117 10.2634L7 8.14225L4.87881 10.2634C4.56339 10.5789 4.05199 10.5789 3.73657 10.2634C3.42114 9.94801 3.42114 9.4366 3.73657 9.12118L4.79716 8.06059L5.85775 7L3.73657 4.87881C3.42114 4.56339 3.42114 4.05199 3.73657 3.73657Z"
		/>
	</svg>
);

// ============================================================================
// BRAND ICONS
// ============================================================================

export function GoogleIcon({ className }: GoogleIconProps) {
	return (
		<svg
			className={cn("size-4", className)}
			height="24"
			role="img"
			viewBox="0 0 48 48"
			width="24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Google</title>
			<path
				d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20 s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
				fill="#fbc02d"
			/>
			<path
				d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
				fill="#e53935"
			/>
			<path
				d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
				fill="#4caf50"
			/>
			<path
				d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
				fill="#1565c0"
			/>
		</svg>
	);
}

// ============================================================================
// PRIORITY ICON HELPERS
// ============================================================================

export const PRIORITY_ICON_MAP = {
	0: UrgentPriorityIcon,
	1: HighPriorityIcon,
	2: MediumPriorityIcon,
	3: LowPriorityIcon,
	4: NoPriorityIcon,
} as const;

export type PriorityValue = keyof typeof PRIORITY_ICON_MAP;

export function getPriorityIconComponent(priority?: number | null) {
	if (priority == null) {
		return PRIORITY_ICON_MAP[4];
	}
	return PRIORITY_ICON_MAP[priority as PriorityValue] ?? PRIORITY_ICON_MAP[4];
}

export function renderPriorityIcon(
	priority?: number | null,
	color?: string,
): React.ReactNode {
	const Icon = getPriorityIconComponent(priority);
	if (!Icon) {
		return null;
	}
	return <Icon color={color} />;
}

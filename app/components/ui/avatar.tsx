import { Avatar as AvatarPrimitive } from "radix-ui";
import type * as React from "react";
import { memo } from "react";

import { cn } from "~/lib/utils";

function Avatar({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
	return (
		<AvatarPrimitive.Root
			data-slot="avatar"
			className={cn(
				"relative flex size-8 shrink-0 overflow-hidden rounded-full",
				className,
			)}
			{...props}
		/>
	);
}

function AvatarImage({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	return (
		<AvatarPrimitive.Image
			data-slot="avatar-image"
			className={cn("aspect-square size-full", className)}
			{...props}
		/>
	);
}

function AvatarFallback({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
	return (
		<AvatarPrimitive.Fallback
			data-slot="avatar-fallback"
			className={cn(
				"flex size-full center rounded-full bg-muted",
				className,
			)}
			{...props}
		/>
	);
}

export const CustomAvatar = memo(function CustomAvatar({
	name = "unknown",
	avatar,
	className,
}: {
	name?: string;
	avatar?: string | null;
	className?: string;
}) {
	return (
		<Avatar className={cn("size-8 rounded-full", className)}>
			<AvatarImage
				alt={name}
				src={avatar ?? `https://api.dicebear.com/9.x/glass/svg?seed=${name}`}
			/>
			<AvatarFallback className="rounded-full">{name.charAt(0)}</AvatarFallback>
		</Avatar>
	);
});

export { Avatar, AvatarImage, AvatarFallback };

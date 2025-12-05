import type { LucideIcon } from "lucide-react";
import { StableLink } from "~/components/stable-link";
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "~/components/ui/sidebar";

export function NavMain({
	items,
	orgSlug,
}: {
	items: {
		title: string;
		url: string;
		icon?: LucideIcon;
		items?: {
			title: string;
			url: string;
		}[];
	}[];
	orgSlug: string;
}) {
	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((item) => (
					<SidebarMenuItem key={item.title}>
						<SidebarMenuButton asChild tooltip={item.title}>
							<StableLink prefetch="render" to={`${orgSlug}${item.url}`}>
								{item.icon && <item.icon />}
								<span>{item.title}</span>
							</StableLink>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}

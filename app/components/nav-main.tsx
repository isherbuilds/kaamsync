import type { LucideIcon } from "lucide-react";
import { useLocation } from "react-router";
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
	const location = useLocation();

	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((item) => (
					<SidebarMenuItem key={item.title}>
						<SidebarMenuButton
							asChild
							tooltip={item.title}
							isActive={location.pathname.startsWith(`/${orgSlug}${item.url}`)}
						>
							<StableLink prefetch="viewport" to={`/${orgSlug}${item.url}`}>
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

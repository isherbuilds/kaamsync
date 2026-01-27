import type { LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { useLocation } from "react-router";
import { StableLink } from "~/components/shared/stable-link";
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "~/components/ui/sidebar";

interface NavItem {
	title: string;
	url: string;
	icon?: LucideIcon;
	items?: {
		title: string;
		url: string;
	}[];
}

interface NavMainProps {
	items: NavItem[];
	orgSlug: string;
}

export function NavMain({ items, orgSlug }: NavMainProps) {
	const location = useLocation();
	const { setOpenMobile } = useSidebar();

	const handleLinkClick = useCallback(() => {
		const timeoutId = setTimeout(() => setOpenMobile(false), 50);
		return () => clearTimeout(timeoutId);
	}, [setOpenMobile]);

	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((item) => (
					<SidebarMenuItem key={item.title}>
						<SidebarMenuButton
							asChild
							tooltip={item.title}
							isActive={location.pathname === `/${orgSlug}${item.url}`}
						>
							<StableLink
								prefetch="viewport"
								to={`/${orgSlug}${item.url}`}
								onClick={handleLinkClick}
							>
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

import type { LucideIcon } from "lucide-react/dist/lucide-react";
import { Link, useLocation } from "react-router";
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
}

interface NavMainProps {
	items: NavItem[];
	orgSlug: string;
}

export function NavMain({ items, orgSlug }: NavMainProps) {
	const location = useLocation();
	const { isMobile, setOpenMobile } = useSidebar();

	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((item) => (
					<SidebarMenuItem key={item.title}>
						<SidebarMenuButton
							asChild
							isActive={location.pathname === `/${orgSlug}${item.url}`}
						>
							<Link
								prefetch={isMobile ? "none" : "intent"}
								to={`/${orgSlug}${item.url}`}
								onClick={() => setTimeout(() => setOpenMobile(false), 50)}
							>
								{item.icon ? <item.icon /> : null}
								<span>{item.title}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}

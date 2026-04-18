"use client";

import { cn } from "@repo/ui";
import { LayoutDashboardIcon, ServerIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
	{ label: "Dashboard", href: "/platform", icon: LayoutDashboardIcon },
	{ label: "Organizations", href: "/platform/orgs", icon: ServerIcon },
];

export function PlatformNav() {
	const pathname = usePathname();

	return (
		<ul className="space-y-1">
			{NAV_ITEMS.map((item) => {
				const isActive =
					item.href === "/platform"
						? pathname === "/platform"
						: pathname === item.href || pathname.startsWith(`${item.href}/`);
				return (
					<li key={item.href}>
						<Link
							href={item.href}
							className={cn(
								"flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
								isActive
									? "bg-zinc-800 text-zinc-50 font-medium"
									: "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100",
							)}
						>
							<item.icon className="size-4" />
							{item.label}
						</Link>
					</li>
				);
			})}
		</ul>
	);
}

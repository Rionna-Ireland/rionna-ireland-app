import Link from "next/link";
import type { PropsWithChildren } from "react";

import { PlatformNav } from "./PlatformNav";

export function PlatformShell({ children }: PropsWithChildren) {
	return (
		<div className="bg-zinc-950 text-zinc-100 min-h-screen flex">
			<aside className="border-r border-zinc-800 bg-zinc-900 w-60 shrink-0 flex flex-col">
				<div className="px-6 py-5 border-b border-zinc-800">
					<div className="text-xs uppercase tracking-widest text-amber-400 font-bold">
						Platform
					</div>
					<div className="text-sm text-zinc-400 mt-1">Internal admin surface</div>
				</div>
				<nav className="flex-1 p-3">
					<PlatformNav />
				</nav>
				<div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-500">
					<Link href="/" className="hover:text-zinc-300">
						Exit to /
					</Link>
				</div>
			</aside>
			<main className="flex-1 p-8 overflow-y-auto">{children}</main>
		</div>
	);
}

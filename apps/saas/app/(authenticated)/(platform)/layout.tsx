import { getSession } from "@auth/lib/server";
import { PlatformShell } from "@platform/components/PlatformShell";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: PropsWithChildren) {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	if (session.user.role !== "platformAdmin") {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-8">
				<div className="max-w-md text-center">
					<div className="text-amber-400 text-xs uppercase tracking-widest font-bold mb-3">
						403 Forbidden
					</div>
					<h1 className="text-2xl font-bold mb-2">Restricted area</h1>
					<p className="text-zinc-400 text-sm">
						This surface is reserved for platform administrators.
					</p>
				</div>
			</div>
		);
	}

	return <PlatformShell>{children}</PlatformShell>;
}

import { listOrgs } from "@repo/api/modules/platform/procedures/list-orgs";
import { Button } from "@repo/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlatformOrgsPage() {
	const orgs = await listOrgs.callable({
		context: { headers: await headers() },
	})({});

	return (
		<div className="max-w-6xl mx-auto">
			<header className="mb-8 flex items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-zinc-50">Organizations</h1>
					<p className="text-sm text-zinc-400 mt-1">
						All clubs across the platform. {orgs.length} total.
					</p>
				</div>
				<Button asChild className="bg-amber-500 hover:bg-amber-400 text-zinc-950">
					<Link href="/platform/orgs/new">New organization</Link>
				</Button>
			</header>

			<div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
				<Table>
					<TableHeader>
						<TableRow className="border-zinc-800 hover:bg-transparent">
							<TableHead className="text-zinc-400">Name</TableHead>
							<TableHead className="text-zinc-400">Slug</TableHead>
							<TableHead className="text-zinc-400 text-right">Members</TableHead>
							<TableHead className="text-zinc-400 text-right">Active subs</TableHead>
							<TableHead className="text-zinc-400">Circle community</TableHead>
							<TableHead className="text-zinc-400">Created</TableHead>
							<TableHead className="text-zinc-400 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{orgs.length === 0 ? (
							<TableRow className="border-zinc-800 hover:bg-transparent">
								<TableCell colSpan={7} className="text-center text-zinc-500">
									No organizations yet.
								</TableCell>
							</TableRow>
						) : (
							orgs.map((org) => (
								<TableRow
									key={org.id}
									className="border-zinc-800 hover:bg-zinc-800/40"
								>
									<TableCell className="text-zinc-100 font-medium">
										<Link
											href={`/platform/orgs/${org.id}`}
											className="hover:underline"
										>
											{org.name}
										</Link>
									</TableCell>
									<TableCell className="text-zinc-400 font-mono text-xs">
										{org.slug}
									</TableCell>
									<TableCell className="text-zinc-200 text-right">
										{org.memberCount}
									</TableCell>
									<TableCell className="text-zinc-200 text-right">
										{org.activeSubscriptionCount}
									</TableCell>
									<TableCell className="text-zinc-400 font-mono text-xs">
										{org.circleCommunityId ?? "—"}
									</TableCell>
									<TableCell className="text-zinc-400 text-xs">
										{new Date(org.createdAt).toISOString().split("T")[0]}
									</TableCell>
									<TableCell className="text-right">
										<form
											action={`/platform/orgs/${org.id}/impersonate`}
											method="post"
											className="inline"
										>
											<Button
												type="submit"
												size="sm"
												variant="outline"
												className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
											>
												Open admin
											</Button>
										</form>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

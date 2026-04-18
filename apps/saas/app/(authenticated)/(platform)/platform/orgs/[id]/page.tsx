import { InviteAdminDialog } from "@platform/components/InviteAdminDialog";
import { RemoveAdminButton } from "@platform/components/RemoveAdminButton";
import { getOrgDetail } from "@repo/api/modules/platform/procedures/get-org-detail";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
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
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface OrgDetailPageProps {
	params: Promise<{ id: string }>;
}

interface MetadataPanelProps {
	title: string;
	rows: Array<{ label: string; value: string | null | undefined }>;
}

function MetadataPanel({ title, rows }: MetadataPanelProps) {
	return (
		<Card className="bg-zinc-900 border-zinc-800">
			<CardHeader>
				<CardTitle className="text-sm font-medium text-zinc-200">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<dl className="space-y-2">
					{rows.map((row) => (
						<div
							key={row.label}
							className="flex justify-between gap-3 text-xs border-b border-zinc-800 last:border-0 pb-2 last:pb-0"
						>
							<dt className="text-zinc-400">{row.label}</dt>
							<dd className="text-zinc-200 font-mono break-all text-right">
								{row.value || "—"}
							</dd>
						</div>
					))}
				</dl>
			</CardContent>
		</Card>
	);
}

function readNested(metadata: Record<string, unknown>, path: string[]): string | null {
	let cursor: unknown = metadata;
	for (const segment of path) {
		if (cursor && typeof cursor === "object" && segment in (cursor as Record<string, unknown>)) {
			cursor = (cursor as Record<string, unknown>)[segment];
		} else {
			return null;
		}
	}
	if (cursor === null || cursor === undefined) {
		return null;
	}
	return typeof cursor === "string" ? cursor : JSON.stringify(cursor);
}

export default async function OrgDetailPage({ params }: OrgDetailPageProps) {
	const { id } = await params;

	let org;
	try {
		org = await getOrgDetail.callable({
			context: { headers: await headers() },
		})({ organizationId: id });
	} catch {
		notFound();
	}

	const metadata = (org.metadata ?? {}) as Record<string, unknown>;
	const circleRows = [
		{ label: "communityId", value: readNested(metadata, ["circle", "communityId"]) },
		{
			label: "communityDomain",
			value: readNested(metadata, ["circle", "communityDomain"]),
		},
		{
			label: "trainerUpdatesSpaceId",
			value: readNested(metadata, ["circle", "trainerUpdatesSpaceId"]),
		},
	];
	const billingRows = [
		{
			label: "stripeProductId",
			value: readNested(metadata, ["billing", "stripeProductId"]),
		},
		{ label: "stripePriceId", value: readNested(metadata, ["billing", "stripePriceId"]) },
	];

	return (
		<div className="max-w-6xl mx-auto">
			<header className="mb-6">
				<Link
					href="/platform/orgs"
					className="text-xs text-zinc-500 hover:text-zinc-300"
				>
					← Back to organizations
				</Link>
				<div className="flex items-end justify-between gap-4 mt-2">
					<div>
						<h1 className="text-2xl font-bold text-zinc-50">{org.name}</h1>
						<p className="text-sm text-zinc-400 mt-1 font-mono">{org.slug}</p>
					</div>
					<form action={`/platform/orgs/${org.id}/impersonate`} method="post">
						<Button
							type="submit"
							className="bg-amber-500 hover:bg-amber-400 text-zinc-950"
						>
							Open admin as this org
						</Button>
					</form>
				</div>
			</header>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<Card className="bg-zinc-900 border-zinc-800">
					<CardHeader>
						<CardTitle className="text-sm font-normal text-zinc-400">
							Members
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-zinc-50">{org.memberCount}</div>
					</CardContent>
				</Card>
				<Card className="bg-zinc-900 border-zinc-800">
					<CardHeader>
						<CardTitle className="text-sm font-normal text-zinc-400">
							Active subscriptions
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-zinc-50">
							{org.activeSubscriptionCount}
						</div>
					</CardContent>
				</Card>
				<Card className="bg-zinc-900 border-zinc-800">
					<CardHeader>
						<CardTitle className="text-sm font-normal text-zinc-400">
							Created
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm text-zinc-200">
							{new Date(org.createdAt).toISOString().split("T")[0]}
						</div>
					</CardContent>
				</Card>
			</div>

			<section className="mb-6">
				<div className="flex items-end justify-between mb-3">
					<h2 className="text-sm font-medium text-zinc-200 uppercase tracking-wide">
						Admin roster
					</h2>
					<InviteAdminDialog organizationId={org.id} />
				</div>
				<div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
					<Table>
						<TableHeader>
							<TableRow className="border-zinc-800 hover:bg-transparent">
								<TableHead className="text-zinc-400">Name</TableHead>
								<TableHead className="text-zinc-400">Email</TableHead>
								<TableHead className="text-zinc-400">Last seen</TableHead>
								<TableHead className="text-zinc-400">Circle</TableHead>
								<TableHead className="text-zinc-400 text-right">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{org.admins.length === 0 ? (
								<TableRow className="border-zinc-800 hover:bg-transparent">
									<TableCell
										colSpan={5}
										className="text-center text-zinc-500"
									>
										No admins yet.
										{org.pendingInvitations.length > 0
											? ` ${org.pendingInvitations.length} invitation(s) pending.`
											: ""}
									</TableCell>
								</TableRow>
							) : (
								org.admins.map((admin) => (
									<TableRow
										key={admin.memberId}
										className="border-zinc-800 hover:bg-zinc-800/40"
									>
										<TableCell className="text-zinc-100">{admin.name}</TableCell>
										<TableCell className="text-zinc-400 text-xs">
											{admin.email}
										</TableCell>
										<TableCell className="text-zinc-400 text-xs">
											{admin.lastSeenAt
												? new Date(admin.lastSeenAt).toISOString().split("T")[0]
												: "—"}
										</TableCell>
										<TableCell className="text-zinc-400 text-xs font-mono">
											{admin.circleStatus ?? "—"}
										</TableCell>
										<TableCell className="text-right">
											<RemoveAdminButton
												organizationId={org.id}
												memberId={admin.memberId}
												memberLabel={admin.name || admin.email}
											/>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
				{org.pendingInvitations.length > 0 ? (
					<div className="mt-3 text-xs text-zinc-500">
						Pending invitations:{" "}
						{org.pendingInvitations.map((inv) => inv.email).join(", ")}
					</div>
				) : null}
			</section>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<MetadataPanel title="Circle integration" rows={circleRows} />
				<MetadataPanel title="Stripe billing" rows={billingRows} />
			</div>
		</div>
	);
}

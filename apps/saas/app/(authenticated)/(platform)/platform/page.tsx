import { db } from "@repo/database";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";

const ACTIVE_PURCHASE_STATUSES = ["active", "trialing", "past_due"];

interface StatCardProps {
	label: string;
	value: string | number;
	hint?: string;
}

function StatCard({ label, value, hint }: StatCardProps) {
	return (
		<Card className="bg-zinc-900 border-zinc-800">
			<CardHeader>
				<CardTitle className="text-sm font-normal text-zinc-400">{label}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-3xl font-bold text-zinc-50">{value}</div>
				{hint ? <div className="text-xs text-zinc-500 mt-2">{hint}</div> : null}
			</CardContent>
		</Card>
	);
}

async function getDashboardData() {
	const [orgCount, memberCount, activeSubsCount, recentEvents] = await Promise.all([
		db.organization.count(),
		db.member.count(),
		db.purchase.count({ where: { status: { in: ACTIVE_PURCHASE_STATUSES } } }),
		db.stripeEventLog
			.findMany({ orderBy: { processedAt: "desc" }, take: 10 })
			.catch(() => []),
	]);

	return { orgCount, memberCount, activeSubsCount, recentEvents };
}

export default async function PlatformDashboardPage() {
	const { orgCount, memberCount, activeSubsCount, recentEvents } = await getDashboardData();

	return (
		<div className="max-w-6xl mx-auto">
			<header className="mb-8">
				<h1 className="text-2xl font-bold text-zinc-50">Platform Dashboard</h1>
				<p className="text-sm text-zinc-400 mt-1">
					Cross-org health snapshot. Real observability lives in Sentry.
				</p>
			</header>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<StatCard label="Organizations" value={orgCount} />
				<StatCard label="Members (all orgs)" value={memberCount} />
				<StatCard
					label="Active subscriptions"
					value={activeSubsCount}
					hint="status in active / trialing / past_due"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<Card className="bg-zinc-900 border-zinc-800">
					<CardHeader>
						<CardTitle className="text-sm font-medium text-zinc-200">
							Latest Stripe events
						</CardTitle>
					</CardHeader>
					<CardContent>
						{recentEvents.length === 0 ? (
							<p className="text-sm text-zinc-500">No events recorded yet.</p>
						) : (
							<ul className="space-y-2">
								{recentEvents.map((event) => (
									<li
										key={event.id}
										className="text-xs text-zinc-300 flex justify-between border-b border-zinc-800 pb-2 last:border-0"
									>
										<span className="font-mono">{event.type}</span>
										<span className="text-zinc-500">
											{event.processedAt.toISOString()}
										</span>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card className="bg-zinc-900 border-zinc-800">
					<CardHeader>
						<CardTitle className="text-sm font-medium text-zinc-200">
							Ingest runs / Webhook errors
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-zinc-500">
							Coming soon — wired up once the ingest log table (S1-07) and Sentry
							alerting (D21) ship.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

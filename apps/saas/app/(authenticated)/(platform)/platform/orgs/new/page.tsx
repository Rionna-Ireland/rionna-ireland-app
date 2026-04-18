import { CreateOrgForm } from "@platform/components/CreateOrgForm";
import Link from "next/link";

export default function NewOrgPage() {
	return (
		<div className="max-w-2xl mx-auto">
			<header className="mb-6">
				<Link
					href="/platform/orgs"
					className="text-xs text-zinc-500 hover:text-zinc-300"
				>
					← Back to organizations
				</Link>
				<h1 className="text-2xl font-bold text-zinc-50 mt-2">New organization</h1>
				<p className="text-sm text-zinc-400 mt-1">
					Provisions the org and sends the first admin invite. You'll get the env-var
					checklist after submit.
				</p>
			</header>

			<div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
				<CreateOrgForm />
			</div>
		</div>
	);
}

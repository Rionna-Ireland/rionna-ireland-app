import { db } from "./client";
import type { OrganizationMetadata } from "../types/organization-metadata";

async function main() {
	console.log("🌱 Seeding database...");

	// 1. Organization: Pink Connections
	const org = await db.organization.create({
		data: {
			name: "Pink Connections",
			slug: "pink-connections",
			createdAt: new Date(),
			metadata: JSON.stringify({
				brand: { primaryColor: "#374B6C" },
				racing: { provider: "mock" },
				circle: { communityDomain: "community.pinkconnections.com" },
				billing: {
					stripeProductId: "prod_test",
					stripePriceId: "price_test",
				},
				contact: {
					aboutText: "Ireland's premier racing club for women",
					contactEmail: "hello@pinkconnections.com",
				},
			} satisfies OrganizationMetadata),
		},
	});

	console.log(`  ✓ Organization: ${org.name} (${org.id})`);

	// 2. Trainer
	const trainer = await db.trainer.create({
		data: {
			name: "Aidan O'Brien",
			organizationId: org.id,
		},
	});

	console.log(`  ✓ Trainer: ${trainer.name} (${trainer.id})`);

	// 3. Horses (5 total, mixed statuses)
	const horses = [
		{ name: "Starlight Rose", slug: "starlight-rose", status: "PRE_TRAINING" as const },
		{ name: "Crimson Flair", slug: "crimson-flair", status: "IN_TRAINING" as const },
		{ name: "Emerald Storm", slug: "emerald-storm", status: "IN_TRAINING" as const },
		{ name: "Velvet Thunder", slug: "velvet-thunder", status: "IN_TRAINING" as const },
		{ name: "Golden Reign", slug: "golden-reign", status: "REHAB" as const },
	];

	for (const h of horses) {
		const horse = await db.horse.create({
			data: {
				name: h.name,
				slug: h.slug,
				status: h.status,
				organizationId: org.id,
				photos: [],
				// Link IN_TRAINING horses to the trainer
				...(h.status === "IN_TRAINING" ? { trainerId: trainer.id } : {}),
			},
		});
		console.log(`  ✓ Horse: ${horse.name} (${horse.status})`);
	}

	console.log("\n🌱 Seed complete.");
}

main()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});

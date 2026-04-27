import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/client";

const DEFAULT_POOL_MAX = process.env.VERCEL ? 1 : 5;

function getPoolMax(): number {
	const parsed = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_POOL_MAX;
}

const prismaClientSingleton = () => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not set");
	}

	const adapter = new PrismaPg({
		connectionString: process.env.DATABASE_URL,
		connectionTimeoutMillis: 5000,
		idleTimeoutMillis: 5000,
		max: getPoolMax(),
	});

	return new PrismaClient({ adapter });
};

declare global {
	var prisma: PrismaClient;
}

// oxlint-disable-next-line no-redeclare -- This is a singleton
const prisma = globalThis.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
	globalThis.prisma = prisma;
}

export { prisma as db };

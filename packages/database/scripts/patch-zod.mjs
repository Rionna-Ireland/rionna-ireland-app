/**
 * Post-generate patch for prisma-zod-generator.
 *
 * The generator emits `Prisma.Decimal` for Decimal fields but doesn't add the
 * Prisma import. This script adds it after generation.
 */
import { readFileSync, writeFileSync } from "node:fs";

const file = "prisma/zod/index.ts";
let content = readFileSync(file, "utf8");

if (content.includes("Prisma.Decimal") && !content.includes('from "../generated/client"')) {
	content = content.replace(
		"import * as z from 'zod';",
		"import * as z from 'zod';\nimport { Prisma } from '../generated/client';",
	);
	writeFileSync(file, content);
	console.log("  patch-zod: added Prisma import to zod/index.ts");
} else {
	console.log("  patch-zod: no patch needed");
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/components/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { toastError } from "@repo/ui/components/toast";
import { orpcClient } from "@shared/lib/orpc-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hexColourRegex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const formSchema = z.object({
	name: z.string().min(1, "Required").max(64),
	slug: z
		.string()
		.min(2)
		.max(48)
		.regex(slugRegex, "Lowercase letters, numbers and single hyphens only"),
	primaryColor: z
		.string()
		.regex(hexColourRegex, "Must be a hex colour like #ff8800")
		.optional()
		.or(z.literal("")),
	logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
	adminEmail: z.email(),
});

type FormValues = z.infer<typeof formSchema>;

function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

export function CreateOrgForm() {
	const router = useRouter();
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			slug: "",
			primaryColor: "",
			logoUrl: "",
			adminEmail: "",
		},
	});

	const nameValue = form.watch("name");
	const slugDirtyRef = form.formState.dirtyFields.slug;

	useEffect(() => {
		if (slugDirtyRef) {
			return;
		}
		const suggested = slugify(nameValue ?? "");
		if (suggested) {
			form.setValue("slug", suggested, { shouldValidate: false, shouldDirty: false });
		}
	}, [nameValue, slugDirtyRef, form]);

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			const result = await orpcClient.platform.createOrg({
				name: values.name,
				slug: values.slug,
				primaryColor: values.primaryColor || undefined,
				logoUrl: values.logoUrl || undefined,
				adminEmail: values.adminEmail,
			});

			router.push(`/platform/orgs/new/created?slug=${encodeURIComponent(result.slug ?? values.slug)}&id=${encodeURIComponent(result.id)}`);
		} catch (error) {
			toastError(
				error instanceof Error
					? error.message
					: "Failed to create organization",
			);
		}
	});

	return (
		<Form {...form}>
			<form onSubmit={onSubmit} className="space-y-5">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-zinc-200">Name</FormLabel>
							<FormControl>
								<Input
									{...field}
									placeholder="Pink Connections"
									className="bg-zinc-900 border-zinc-700 text-zinc-100"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="slug"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-zinc-200">Slug</FormLabel>
							<FormControl>
								<Input
									{...field}
									placeholder="pink-connections"
									className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono"
								/>
							</FormControl>
							<p className="text-xs text-zinc-500">
								Used in URLs and env-var names. Auto-suggested from the name; edit
								to override.
							</p>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="primaryColor"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-zinc-200">
									Primary brand colour (optional)
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder="#ff66aa"
										className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="logoUrl"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-zinc-200">Logo URL (optional)</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder="https://…"
										className="bg-zinc-900 border-zinc-700 text-zinc-100"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="adminEmail"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-zinc-200">Initial admin email</FormLabel>
							<FormControl>
								<Input
									{...field}
									type="email"
									placeholder="founder@club.example"
									className="bg-zinc-900 border-zinc-700 text-zinc-100"
								/>
							</FormControl>
							<p className="text-xs text-zinc-500">
								They'll receive an invitation email immediately.
							</p>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="pt-3 flex justify-end">
					<Button
						type="submit"
						loading={form.formState.isSubmitting}
						className="bg-amber-500 hover:bg-amber-400 text-zinc-950"
					>
						Create organization
					</Button>
				</div>
			</form>
		</Form>
	);
}

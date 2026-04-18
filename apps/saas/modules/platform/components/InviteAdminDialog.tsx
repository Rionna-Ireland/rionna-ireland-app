"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpcClient } from "@shared/lib/orpc-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
	email: z.email(),
});

type FormValues = z.infer<typeof formSchema>;

interface InviteAdminDialogProps {
	organizationId: string;
}

export function InviteAdminDialog({ organizationId }: InviteAdminDialogProps) {
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { email: "" },
	});

	const onSubmit = form.handleSubmit(async ({ email }) => {
		try {
			await orpcClient.platform.inviteAdmin({ organizationId, email });
			toastSuccess(`Invitation sent to ${email}`);
			form.reset();
			setOpen(false);
			router.refresh();
		} catch (error) {
			toastError(error instanceof Error ? error.message : "Failed to send invitation");
		}
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size="sm"
					className="bg-amber-500 hover:bg-amber-400 text-zinc-950"
				>
					Invite admin
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite a new admin</DialogTitle>
					<DialogDescription>
						They'll receive an email with a sign-up / login link.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input {...field} type="email" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type="submit"
								loading={form.formState.isSubmitting}
								className="bg-amber-500 hover:bg-amber-400 text-zinc-950"
							>
								Send invitation
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

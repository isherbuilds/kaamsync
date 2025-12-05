import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { toast } from "sonner";
import { useZ } from "~/hooks/use-zero-cache";
import { sanitizeSlug } from "~/lib/utils";
import { createWorkspaceSchema } from "../lib/validations/organization";
import { InputField } from "./forms";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

interface CreateWorkspaceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated?: (workspace: { name: string }) => void;
}

export function CreateWorkspaceDialog({
	open,
	onOpenChange,
	onCreated,
}: CreateWorkspaceDialogProps) {
	const z = useZ();

	const [form, fields] = useForm({
		constraint: getZodConstraint(createWorkspaceSchema),
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: createWorkspaceSchema });
		},
		async onSubmit(event, { formData }) {
			event.preventDefault();
			const submission = parseWithZod(formData, {
				schema: createWorkspaceSchema,
			});
			if (submission.status === "success") {
				try {
					const slug = sanitizeSlug(submission.value.name);
					const code = slug.substring(0, 3).toUpperCase();

					await z.mutate.workspace.create({
						name: submission.value.name,
						code,
					});

					toast.success("Workspace created successfully");
					onCreated?.(submission.value);
					onOpenChange(false);
				} catch (error) {
					toast.error(
						error instanceof Error
							? error.message
							: "Failed to create workspace",
					);
				}
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm mx-auto">
				<DialogHeader>
					<DialogTitle>Create Workspace</DialogTitle>
				</DialogHeader>
				<form {...getFormProps(form)} className="space-y-4">
					<InputField
						labelProps={{ children: "Workspace Name" }}
						inputProps={{
							...getInputProps(fields.name, { type: "text" }),
							autoFocus: true,
							placeholder: "General",
						}}
						errors={fields.name.errors}
					/>
					<DialogFooter>
						<Button type="submit" className="w-full">
							Create
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

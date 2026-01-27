import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { useZero } from "@rocicorp/zero/react";
import { memo, useRef, useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { InputField } from "~/components/shared/forms";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { createTeamSchema } from "~/lib/organization/validations";

// --- Utilities ---

const deriveCodeFromName = (name: string): string =>
	name
		.replace(/[^a-zA-Z]/g, "")
		.substring(0, 3)
		.toUpperCase();

// --- Types ---

interface CreateTeamDialogProps {
	open: boolean;
	onOpenChange: (isOpen: boolean) => void;
}

// --- Component ---

export const CreateTeamDialog = memo(
	({ open, onOpenChange }: CreateTeamDialogProps) => {
		const zero = useZero();
		const isCodeManuallyEdited = useRef(false);
		const [isSubmitting, setIsSubmitting] = useState(false);

		const [form, fields] = useForm({
			id: "create-team-dialog",
			constraint: getZodConstraint(createTeamSchema),
			onValidate: ({ formData }) =>
				parseWithZod(formData, { schema: createTeamSchema }),
			onSubmit: async (event, { submission }) => {
				event.preventDefault();
				if (submission?.status !== "success") return;

				setIsSubmitting(true);
				zero
					.mutate(mutators.team.create(submission.value))
					.server.then(() => {
						toast.success("Team created");
						handleClose();
					})
					.catch((error) => {
						console.error("Failed to create team:", error);
						toast.error(
							error instanceof Error ? error.message : "Failed to create team",
						);
					})
					.finally(() => setIsSubmitting(false));
			},
		});

		const handleClose = () => {
			onOpenChange(false);
			isCodeManuallyEdited.current = false;
			form.reset();
		};

		const handleNameInput = (event: React.FormEvent<HTMLInputElement>) => {
			const name = event.currentTarget.value;
			if (!isCodeManuallyEdited.current) {
				form.update({
					name: fields.code.name,
					value: deriveCodeFromName(name),
				});
			}
			if (!name) isCodeManuallyEdited.current = false;
		};

		const handleCodeInput = () => {
			isCodeManuallyEdited.current = true;
		};

		return (
			<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
				<DialogContent className="max-w-90 p-4">
					<DialogHeader className="gap-2">
						<DialogTitle>New Team</DialogTitle>
						<DialogDescription className="text-xs">
							Give your team a name and a unique 3-letter code.
						</DialogDescription>
					</DialogHeader>

					<form {...getFormProps(form)} className="space-y-4">
						{/* Team Name Field */}
						<InputField
							inputProps={{
								...getInputProps(fields.name, { type: "text" }),
								autoFocus: true,
								placeholder: "Secondary Space",
								onInput: handleNameInput,
							}}
							labelProps={{ children: "Name" }}
							errors={fields.name.errors}
						/>

						{/* Team Code Field with Preview */}
						<div className="grid grid-cols-2 gap-4">
							<InputField
								inputProps={{
									...getInputProps(fields.code, { type: "text" }),
									placeholder: "SEC",
									className: "font-mono uppercase",
									onInput: handleCodeInput,
								}}
								labelProps={{ children: "Code" }}
								errors={fields.code.errors}
							/>
							<div className="flex h-9 items-center rounded-md border border-dashed bg-muted/20 px-3 font-mono text-muted-foreground text-xs uppercase">
								{fields.code.value || "???"}-101
							</div>
						</div>

						{/* Actions */}
						<div className="flex justify-end gap-2 pt-2">
							<Button type="button" variant="ghost" onClick={handleClose}>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Create Team"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		);
	},
);

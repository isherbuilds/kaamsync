import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { useZero } from "@rocicorp/zero/react";
import { memo, useRef, useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { getPlanLimits } from "~/lib/pricing";
import { createTeamSchema } from "../lib/validations/organization";
import { InputField } from "./forms";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

// Simple derivation logic
const deriveCode = (name: string) =>
	name
		.replace(/[^a-zA-Z]/g, "")
		.substring(0, 3)
		.toUpperCase();

export const CreateTeamDialog = memo(
	({
		open,
		onOpenChange,
		orgPlan,
		teamCount = 0,
	}: {
		open: boolean;
		onOpenChange: (o: boolean) => void;
		orgPlan?: string | null;
		teamCount?: number;
	}) => {
		const zr = useZero();
		const isManual = useRef(false);
		const [isSubmitting, setIsSubmitting] = useState(false);

		// Plan limits checking
		const planLimits = getPlanLimits(orgPlan);
		const canCreateTeam =
			planLimits.maxTeams === null || teamCount < planLimits.maxTeams;

		const [form, fields] = useForm({
			id: "create-team-dialog",
			constraint: getZodConstraint(createTeamSchema),
			onValidate: ({ formData }) =>
				parseWithZod(formData, { schema: createTeamSchema }),
			onSubmit: async (e, { submission }) => {
				e.preventDefault();
				if (submission?.status !== "success") return;

				setIsSubmitting(true);
				zr.mutate(mutators.team.create(submission.value))
					.server.then(() => {
						toast.success("Team created");
						close();
					})
					.catch(() => toast.error("Failed to create team"))
					.finally(() => setIsSubmitting(false));
			},
		});

		const close = () => {
			onOpenChange(false);
			isManual.current = false;
			// Reset the form when closing to clear validation state and values
			form.reset();
		};

		return (
			<Dialog open={open} onOpenChange={(o) => !o && close()}>
				<DialogContent className="max-w-90 p-4">
					<DialogHeader className="gap-2">
						<DialogTitle>New Team</DialogTitle>
						<DialogDescription className="text-xs">
							Give your team a name and a unique 3-letter code.
							{!canCreateTeam && planLimits.maxTeams && (
								<div className="mt-2 text-destructive">
									Team limit reached ({planLimits.maxTeams}). Upgrade to add
									more.
								</div>
							)}
						</DialogDescription>
					</DialogHeader>

					<form {...getFormProps(form)} className="space-y-4">
						<InputField
							inputProps={{
								...getInputProps(fields.name, { type: "text" }),
								autoFocus: true,
								placeholder: "Secondary Space",
								onInput: (e) => {
									const name = e.currentTarget.value;
									// If the user hasn't typed in 'code' yet, keep it in sync
									if (!isManual.current) {
										form.update({
											name: fields.code.name,
											value: deriveCode(name),
										});
									}
									// If name is cleared, allow auto-fill to start over
									if (!name) isManual.current = false;
								},
							}}
							labelProps={{ children: "Name" }}
							errors={fields.name.errors}
						/>

						<div className="grid grid-cols-2 gap-4">
							<InputField
								inputProps={{
									...getInputProps(fields.code, { type: "text" }),
									placeholder: "SEC",
									className: "font-mono uppercase",
									onInput: () => {
										isManual.current = true;
									}, // Once they type here, auto-fill stops
								}}
								errors={fields.code.errors}
							/>
							{/* Real-time Preview */}
							<div className="flex h-9 items-center rounded-md border border-dashed bg-muted/20 px-3 font-mono text-muted-foreground text-xs uppercase">
								{fields.code.value || "???"}-101
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-2">
							<Button type="button" variant="ghost" onClick={close}>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting || !canCreateTeam}>
								{isSubmitting ? "Creating..." : "Create Team"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		);
	},
);

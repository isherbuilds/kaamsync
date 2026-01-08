import { useControl } from "@conform-to/react/future";
import type { VariantProps } from "class-variance-authority";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { buttonVariants } from "~/components/ui/button";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "./ui/input-group";
import { Textarea } from "./ui/textarea";

export type ListOfErrors = Array<string | null | undefined> | null | undefined;

export type FormFieldProps = {
	labelProps?: React.LabelHTMLAttributes<HTMLLabelElement>;
	inputProps: React.InputHTMLAttributes<HTMLInputElement>;
	errors?: ListOfErrors;
	className?: string;
};

export interface LoadingButtonProps
	extends React.ComponentProps<"button">,
		VariantProps<typeof buttonVariants> {
	buttonText: string;
	loadingText: string;
	isPending: boolean;
	className?: string;
}

export function ErrorList({
	id,
	errors,
}: {
	errors?: ListOfErrors;
	id?: string;
}) {
	const errorsToRender = errors?.filter(Boolean);
	if (!errorsToRender?.length) {
		return null;
	}
	return (
		<ul className="flex flex-col" id={id}>
			{errorsToRender.map((e) => (
				<li className="text-destructive text-xs" key={e}>
					{e}
				</li>
			))}
		</ul>
	);
}

export function CustomChildrenField({
	labelProps,
	className,
	children,
	errors,
}: {
	labelProps?: React.LabelHTMLAttributes<HTMLLabelElement>;
	className?: string;
	// Accept either React nodes or a render-prop that receives the generated id
	children: React.ReactNode | ((id: string) => React.ReactNode);
	errors?: ListOfErrors;
}) {
	const fallbackId = useId();
	const id = fallbackId;
	const errorId = errors?.length ? `${id}-error` : undefined;
	const isFn = typeof children === "function";

	return (
		<div className={cn(className, "flex flex-col gap-2")}>
			{labelProps &&
				(isFn ? (
					<Label htmlFor={id} {...labelProps} />
				) : (
					<Label {...labelProps} />
				))}
			{isFn ? (children as (id: string) => React.ReactNode)(id) : children}
			{errorId ? <ErrorList errors={errors} id={errorId} /> : null}
		</div>
	);
}

export function InputField({
	labelProps,
	inputProps,
	errors,
	className,
}: FormFieldProps) {
	const fallbackId = useId();
	const id = inputProps.id || fallbackId;
	const errorId = errors?.length ? `${id}-error` : undefined;

	return (
		<div className={cn(className, "flex flex-col gap-2")}>
			{labelProps && <Label htmlFor={id} {...labelProps} />}
			<Input
				aria-describedby={errorId}
				aria-invalid={errorId ? true : undefined}
				id={id}
				{...inputProps}
			/>
			{errorId ? <ErrorList errors={errors} id={errorId} /> : null}
		</div>
	);
}

export function InputGroupField({
	labelProps,
	inputProps,
	errors,
	className,
	groupText,
}: FormFieldProps & { groupText: string }) {
	const fallbackId = useId();
	const id = inputProps.id || fallbackId;
	const errorId = errors?.length ? `${id}-error` : undefined;

	return (
		<div className={cn(className, "flex flex-col gap-2")}>
			{labelProps && <Label htmlFor={id} {...labelProps} />}
			<InputGroup>
				<InputGroupAddon>
					<InputGroupText>{groupText}</InputGroupText>
				</InputGroupAddon>
				<InputGroupInput
					aria-describedby={errorId}
					aria-invalid={errorId ? true : undefined}
					id={id}
					{...inputProps}
				/>
			</InputGroup>
			{errorId ? <ErrorList errors={errors} id={errorId} /> : null}
		</div>
	);
}

export function PasswordField({
	labelProps,
	inputProps,
	errors,
	className,
}: FormFieldProps) {
	const [isVisible, setIsVisible] = useState(false);
	const fallbackId = useId();
	const id = inputProps.id || fallbackId;
	const errorId = errors?.length ? `${id}-error` : undefined;
	const { ...restInputProps } = inputProps;

	return (
		<div className={cn(className, "flex flex-col gap-2")}>
			{labelProps && <Label htmlFor={id} {...labelProps} />}
			<div className="relative">
				<Input
					aria-describedby={errorId}
					aria-invalid={errorId ? true : undefined}
					className="pr-9"
					id={id}
					type={isVisible ? "text" : "password"}
					{...restInputProps}
				/>
				<Button
					aria-label={isVisible ? "Hide password" : "Show password"}
					className="absolute inset-y-0 right-0 flex h-full items-center justify-center pr-3 text-muted-foreground/80"
					onClick={() => setIsVisible(!isVisible)}
					size="icon"
					tabIndex={-1}
					type="button"
					variant="ghost"
				>
					{isVisible ? (
						<EyeOffIcon aria-hidden="true" size={16} />
					) : (
						<EyeIcon aria-hidden="true" size={16} />
					)}
				</Button>
			</div>
			{errorId ? <ErrorList errors={errors} id={errorId} /> : null}
		</div>
	);
}

export function TextareaField({
	labelProps,
	textareaProps,
	errors,
	className,
}: {
	labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
	textareaProps: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
	errors?: ListOfErrors;
	className?: string;
}) {
	const fallbackId = useId();
	const id = textareaProps.id ?? textareaProps.name ?? fallbackId;
	const errorId = errors?.length ? `${id}-error` : undefined;
	return (
		<div className={cn(className, "flex flex-col gap-2")}>
			<Label htmlFor={id} {...labelProps} />
			<Textarea
				aria-describedby={errorId}
				aria-invalid={errorId ? true : undefined}
				id={id}
				{...textareaProps}
			/>
			{errorId ? <ErrorList errors={errors} id={errorId} /> : null}
		</div>
	);
}

export type SelectProps = {
	id?: string;
	name: string;
	items: Array<{ name: string; value: string }>;
	placeholder: string;
	defaultValue?: string;
	["aria-describedby"]?: string;
	errors?: ListOfErrors;
	labelProps?: React.LabelHTMLAttributes<HTMLLabelElement>;
	className?: string;
};

export function SelectField({
	name,
	items,
	placeholder,
	defaultValue,
	...props
}: SelectProps) {
	const selectRef = useRef<React.ComponentRef<typeof SelectTrigger>>(null);
	const control = useControl({
		defaultValue,
		onFocus() {
			selectRef.current?.focus();
		},
	});

	return (
		<>
			<input name={name} ref={control.register} hidden />
			<Select
				value={control.value}
				onValueChange={(value) => control.change(value)}
				onOpenChange={(open) => {
					if (!open) {
						control.blur();
					}
				}}
			>
				<SelectTrigger {...props} ref={selectRef}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{items.map((item) => {
						return (
							<SelectItem key={item.value} value={item.value}>
								{item.name}
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>
		</>
	);
}

export function LoadingButton({
	buttonText,
	loadingText,
	isPending,
	className = "",
	...props
}: LoadingButtonProps) {
	return (
		<Button className={className} disabled={isPending} type="submit" {...props}>
			{isPending ? (
				<>
					<Spinner /> {loadingText}
				</>
			) : (
				buttonText
			)}
		</Button>
	);
}

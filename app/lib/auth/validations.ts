import { z } from "zod";

// Magic number constants
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 32;
const NAME_MIN_LENGTH = 3;
const TOKEN_MIN_LENGTH = 1;

type passwordSchemaType = z.infer<typeof passwordSchema>;

type PasswordConfirmationInput = {
  newPassword: passwordSchemaType;
  confirmPassword: passwordSchemaType;
};

const passwordConfirmationRefinement = (
  { confirmPassword, newPassword }: PasswordConfirmationInput,
  ctx: z.RefinementCtx
) => {
  if (confirmPassword !== newPassword) {
    ctx.addIssue({
      path: ["confirmPassword"],
      code: "custom",
      message: "New password and confirm password do not match.",
    });
  }
};

export const emailSchema = z
  .email({
    error: "Invalid email address.",
  })
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string({
    error: "Password is required.",
  })
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Password must be less than ${PASSWORD_MAX_LENGTH} characters long.`
  );

export const tokenSchema = z
  .string()
  .min(TOKEN_MIN_LENGTH, "Token is required.");

export const signInSchema = z.discriminatedUnion("provider", [
  z.object({
    email: emailSchema,
    password: passwordSchema,
    provider: z.literal("sign-in"),
  }),
  z.object({
    provider: z.literal("google"),
  }),
]);

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string({
      error: "Name is required.",
    })
    .min(
      NAME_MIN_LENGTH,
      `Name must be at least ${NAME_MIN_LENGTH} characters long.`
    )
    .trim(),
});

export const forgetPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: tokenSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .superRefine(passwordConfirmationRefinement);

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .superRefine(passwordConfirmationRefinement);

import { applyDecorators } from '@nestjs/common';
import { Matches, MinLength } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include upper, lower, and a number';

export function PasswordPolicy() {
  return applyDecorators(
    MinLength(PASSWORD_MIN_LENGTH),
    Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
      message: PASSWORD_POLICY_MESSAGE,
    }),
  );
}

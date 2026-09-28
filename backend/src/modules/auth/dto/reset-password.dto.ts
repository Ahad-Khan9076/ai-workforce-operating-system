import { IsString } from 'class-validator';
import { PasswordPolicy } from '../../../common/validators/password.validator.js';

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @PasswordPolicy()
  password!: string;
}

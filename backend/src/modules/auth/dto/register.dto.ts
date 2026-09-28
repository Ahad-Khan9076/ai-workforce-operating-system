import { IsEmail, IsString, MinLength } from 'class-validator';
import { PasswordPolicy } from '../../../common/validators/password.validator.js';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @PasswordPolicy()
  password!: string;
}

import { IsString, IsUrl, MinLength } from 'class-validator';

export class StartCheckoutDto {
  @IsString()
  @MinLength(2)
  planCode!: string;

  @IsUrl({ require_tld: false })
  successUrl!: string;

  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

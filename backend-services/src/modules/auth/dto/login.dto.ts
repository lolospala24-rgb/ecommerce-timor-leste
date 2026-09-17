// placeholder for src/modules/auth/dto/login.dto.ts
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;

  // Read directly off the raw request body by RecaptchaGuard, which runs
  // before this DTO is validated/transformed — declared here mainly so the
  // shape of a login request is documented in one place.
  @IsString()
  @IsOptional()
  recaptchaToken?: string;
}
// placeholder for src/modules/auth/dto/refresh-token.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  // Optional: the refresh token is normally read from the httpOnly cookie.
  // This field remains as a fallback for non-browser API clients.
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
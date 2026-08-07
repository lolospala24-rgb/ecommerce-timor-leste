import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SettingsService } from '../../modules/settings/settings.service';

// Runs last in the global guard chain (after JwtAuthGuard/RolesGuard) so
// request.user is already populated when present. Blocks storefront traffic
// while maintenanceMode is on, but always lets auth/admin/settings routes
// through — otherwise an admin could never log in or turn maintenance mode
// back off once it's enabled.
const ALWAYS_ALLOWED_PREFIXES = ['/api/v1/auth', '/api/v1/admin', '/api/v1/settings'];

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly settingsService: SettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request.method === 'OPTIONS') return true;

    const settings = await this.settingsService.getSettings();
    if (!settings.maintenanceMode) return true;

    if (request.user?.role === 'ADMIN') return true;

    const path: string = request.originalUrl || request.url || '';
    if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return true;
    }

    throw new ServiceUnavailableException(
      settings.maintenanceMessage || 'The site is currently under maintenance. Please check back later.',
    );
  }
}

import { Injectable } from '@nestjs/common';
// require package.json at runtime to avoid `resolveJsonModule` TS setting
const packageJson = require('../package.json');

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to E-commerce Timor-Leste API';
  }

  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  getVersion() {
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: 'E-commerce backend for Timor-Leste',
    };
  }
}
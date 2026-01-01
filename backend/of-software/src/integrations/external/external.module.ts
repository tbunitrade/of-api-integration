import { Module } from '@nestjs/common';
import { ExternalApiClient } from './external-api.client';

@Module({
  providers: [
    {
      provide: ExternalApiClient,
      useFactory: () => {
        const baseUrl = process.env.EXTERNAL_API_BASE_URL || '';
        const apiKey = process.env.EXTERNAL_API_KEY || '';

        console.log('[ExternalApiClient] init', {
          baseUrl,
          apiKey: apiKey ? '***set***' : '***empty***',
        });

        return new ExternalApiClient(baseUrl, apiKey);
      },
    },
  ],
  exports: [ExternalApiClient],
})
export class ExternalModule {}

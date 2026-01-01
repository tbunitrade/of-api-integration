// src/integrations/external/external-api.client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class ExternalApiClient {
  private readonly http: AxiosInstance;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 60_000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    try {
      const res = await this.http.request<T>(config);
      return res.data as any;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      console.log('[ExternalApiClient] request error', {
        url: config.url,
        method: config.method,
        status,
        data,
      });

      throw err;
    }
  }

  // ============= Audience / Lists (для мультиселектов) =============
  async getAudienceLists(accountId: string) {
    // URL/путь вы подставите под вашего провайдера
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/audience/lists`,
    });
  }

  // ============= Mass message =============
  async sendMassMessage(accountId: string, payload: any) {
    return this.request({
      method: 'POST',
      url: `/api/${accountId}/messages/mass`,
      data: payload,
    });
  }

  // ============= (позже) Schedule posts =============
  async schedulePost(accountId: string, payload: any) {
    return this.request({
      method: 'POST',
      url: `/api/${accountId}/posts/schedule`,
      data: payload,
    });
  }
}

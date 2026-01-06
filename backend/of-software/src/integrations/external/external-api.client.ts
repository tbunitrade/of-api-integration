// src/integrations/external/external-api.client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

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
    const base = this.http.defaults.baseURL || '';
    const fullUrl = `${base}${config.url || ''}`;
    console.log('[ExternalApiClient] request', { fullUrl, method: config.method });

    try {
      const res = await this.http.request<T>(config);
      return res.data as any;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.log('[ExternalApiClient] request error', { url: config.url, method: config.method, status, data });
      throw err;
    }
  }

  // ============= Audience Lists =============
  async getAudienceLists(accountId: string) {
    // у OnlyFansAPI.com пока нет публичного endpoint-а audience/lists
    // — можно просто вернуть пустой массив, чтобы не блокировать mass-messaging
    //console.log('[ExternalApiClient] mock getAudienceLists for', accountId);
    //return { lists: [] };

    return this.request({
        method: 'GET',
        url: `/api/${accountId}/user-lists`,
    });
  }

  // ============= Mass Messaging =============
  async sendMassMessage(accountId: string, payload: any) {
    // правильный путь
    return this.request({
      method: 'POST',
      url: `/api/${accountId}/mass-messaging`,
      data: payload,
    });
  }

  // ============= (на будущее) Schedule Posts =============
  async schedulePost(accountId: string, payload: any) {
    return this.request({
      method: 'POST',
      url: `/api/${accountId}/posts/schedule`,
      data: payload,
    });
  }
}

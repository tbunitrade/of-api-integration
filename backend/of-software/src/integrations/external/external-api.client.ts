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

  private _fixUrl(url?: string): string | undefined {
    if (!url) return url;

    const base = String(this.http.defaults.baseURL || '').replace(/\/+$/, '');
    const baseHasApi = /\/api$/i.test(base);
    const urlHasApi = url.startsWith('/api/');

    // baseURL уже ".../api", а url тоже начинается с "/api/..." -> убираем одно "/api"
    if (baseHasApi && urlHasApi) {
      return url.replace(/^\/api/, '');
    }

    return url;
  }

  private async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const fixedUrl = this._fixUrl(config.url as any);
    const base = this.http.defaults.baseURL || '';
    const fullUrl = `${base}${fixedUrl || ''}`;

    console.log('[ExternalApiClient] request', { fullUrl, method: config.method });

    try {
      const res = await this.http.request<T>({
        ...config,
        url: fixedUrl,
      });
      return res.data as any;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.log('[ExternalApiClient] request error', { url: fixedUrl, method: config.method, status, data });
      throw err;
    }
  }

  // ============= Audience Lists =============
  async getAudienceLists(accountId: string) {
    // ВАЖНО: plural -> user-lists
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/user-lists`,
    });
  }

  // ============= Mass Messaging =============
  async sendMassMessage(accountId: string, payload: any) {
    return this.request({
      method: 'POST',
      url: `/api/${accountId}/mass-messaging`,
      data: payload,
    });
  }

  async schedulePost(accountId: string, payload: any) {
    return this.request({
      method: 'POST',
      url: `/api/${accountId}/posts/schedule`,
      data: payload,
    });
  }
}

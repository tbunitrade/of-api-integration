// src/integrations/external/external-api.client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { randomUUID } from 'crypto';

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

  private _keys(obj: any): string[] {
    try {
      return obj && typeof obj === 'object' ? Object.keys(obj) : [];
    } catch {
      return [];
    }
  }

  private _sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private _shouldRetry(err: any): boolean {
    const status = err?.response?.status;

    if (status === 429) return true;

    const msg = String(err?.response?.data?.message || err?.message || '').toLowerCase();
    if (msg.includes('rate limit')) return true;
    if (msg.includes('limit exceeded')) return true;
    if (msg.includes('too many requests')) return true;

    return false;
  }

  private _getRetryDelayMs(attempt: number, err: any): number {
    // 1) retry-after header если есть
    const ra = err?.response?.headers?.['retry-after'];
    const raNum = ra != null ? Number(ra) : NaN;
    if (!Number.isNaN(raNum) && raNum > 0) {
      return Math.min(raNum * 1000, 60_000);
    }

    // 2) экспонента + джиттер
    const base = 800; // ms
    const exp = Math.min(base * Math.pow(2, attempt - 1), 10_000);
    const jitter = Math.floor(Math.random() * 250);
    return exp + jitter;
  }

  private async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const fixedUrl = this._fixUrl(config.url as any);
    const base = this.http.defaults.baseURL || '';
    const fullUrl = `${base}${fixedUrl || ''}`;

    const requestId = randomUUID();
    const startedAt = Date.now();

    // ВАЖНО: существующий лог НЕ трогаем — добавляем поля
    console.log('[ExternalApiClient] request', { requestId, fullUrl, method: config.method });

    const maxAttempts = 4; // 1 + 3 retry

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await this.http.request<T>({
          ...config,
          url: fixedUrl,
          headers: {
            ...(config.headers || {}),
            'x-request-id': requestId,
          },
        });

        const ms = Date.now() - startedAt;

        const body: any = res?.data;
        const topKeys = this._keys(body);
        const dataKeys = this._keys(body?.data);
        const metaKeys = this._keys(body?._meta);

        console.log('[ExternalApiClient] response', {
          requestId,
          method: config.method,
          url: fixedUrl,
          status: res?.status,
          ms,
          topKeys,
          dataKeys,
          metaKeys,
          hasList: Array.isArray(body?.data?.list),
          listLen: Array.isArray(body?.data?.list) ? body.data.list.length : undefined,
          hasMore: body?.data?.hasMore,
          creditsUsed: body?._meta?._credits?.used,
          creditsBalance: body?._meta?._credits?.balance,
          remainingMinute: body?._meta?._rate_limits?.remaining_minute,
          remainingDay: body?._meta?._rate_limits?.remaining_day,
        });

        return body as any;
      } catch (err: any) {
        const ms = Date.now() - startedAt;
        const status = err?.response?.status;
        const data = err?.response?.data;

        console.log('[ExternalApiClient] request error', {
          requestId,
          url: fixedUrl,
          method: config.method,
          status,
          ms,
          attempt,
          errorDataKeys: this._keys(data?.data),
          errorMetaKeys: this._keys(data?._meta),
          data,
        });

        // retry only for rate-limit-like errors
        if (attempt < maxAttempts && this._shouldRetry(err)) {
          const delay = this._getRetryDelayMs(attempt, err);
          console.log('[ExternalApiClient] retry', { requestId, attempt, delay });
          await this._sleep(delay);
          continue;
        }

        throw err;
      }
    }

    // unreachable, но TS happy
    throw new Error('ExternalApiClient request failed');
  }

  // ============= Audience Lists =============
  async getAudienceLists(accountId: string, params?: any) {
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/user-lists`,
      params,
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

  // ============= Vault =============
  async getVaultLists(accountId: string, params?: any) {
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/media/vault/lists`,
      params,
    });
  }

  async getVaultMediaList(accountId: string, params?: any) {
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/media/vault`,
      params,
    });
  }

  async getVaultMedia(accountId: string, mediaId: string | number) {
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/media/vault/${encodeURIComponent(String(mediaId))}`,
    });
  }

  async getVaultList(accountId: string, listId: string) {
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/media/vault/lists/${encodeURIComponent(String(listId))}`,
    });
  }

  async addMediaToVaultList(accountId: string, listId: string, mediaIds: string[]) {
    return this.request({
      method: 'POST',
      url: `/api/${accountId}/media/vault/lists/${encodeURIComponent(String(listId))}/media`,
      data: { mediaIds },
    });
  }
}

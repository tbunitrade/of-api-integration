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
  private _keys(obj: any): string[] {
    try {
      return obj && typeof obj === 'object' ? Object.keys(obj) : [];
    } catch {
      return [];
    }
  }

  private async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const fixedUrl = this._fixUrl(config.url as any);
    const base = this.http.defaults.baseURL || '';
    const fullUrl = `${base}${fixedUrl || ''}`;

    const startedAt = Date.now();

    console.log('[ExternalApiClient] request', { fullUrl, method: config.method });

    try {
      const res = await this.http.request<T>({
        ...config,
        url: fixedUrl,
      });

      const ms = Date.now() - startedAt;

      const body: any = res?.data;
      const topKeys = this._keys(body);
      const dataKeys = this._keys(body?.data);
      const metaKeys = this._keys(body?._meta);

      console.log('[ExternalApiClient] response', {
        method: config.method,
        url: fixedUrl,
        status: res?.status,
        ms,
        topKeys,
        dataKeys,
        metaKeys,
        // полезные “подсказки”, но без мусора
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
        url: fixedUrl,
        method: config.method,
        status,
        ms,
        errorDataKeys: this._keys(data?.data),
        errorMetaKeys: this._keys(data?._meta),
        data,
      });
      throw err;
    }
  }

  // ============= Audience Lists =============
  async getAudienceLists(accountId: string, params?: any ) {
    // ВАЖНО: plural -> user-lists
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/user-lists`,
      params
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

  // ✅ List Vault Lists (получить все категории/листы)
  async getVaultLists(accountId: string, params?: any) {
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/media/vault/lists`,
      params,
    });
  }

  // ✅ List Vault Media (получить медиа, можно фильтровать list=...)
  async getVaultMediaList(accountId: string, params?: any) {
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/media/vault`,
      params,
    });
  }

  // ✅ Get Vault Media (получить одно медиа по media_id)
  async getVaultMedia(accountId: string, mediaId: string | number) {
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/media/vault/${encodeURIComponent(String(mediaId))}`,
    });
  }

  async getVaultList(accountId: string, listId: string ) {
    return this.request({
      method: 'GET',
      url: `/api/${accountId}/media/vault/lists/${encodeURIComponent(String(listId))}`,
    });
  }

  async addMediaToVaultList(accountId: string, listId: string, mediaIds: string[]) {
    return this.request({
      method: 'POST',
      url: `/api/${accountId}/media/vault/lists/${encodeURIComponent(String(listId))}/media`,
      data: { mediaIds }
    });
  }
}

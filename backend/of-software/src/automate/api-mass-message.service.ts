// backend/of-software/src/automate/api-mass-message.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ExternalApiClient } from 'src/integrations/external/external-api.client';
import { ModelPlatformService } from 'src/modelPlatform/model_platform.service';

type ProviderList = { id: any; name: string; type?: string };

@Injectable()
export class ApiMassMessageService {
  constructor(
    private readonly externalApi: ExternalApiClient,
    private readonly modelPlatformService: ModelPlatformService,
  ) {}

  /**
   * dto.userLists / dto.excludedLists приходят как массив "токенов списка":
   * - default list: "fans", "following", "tagged" ...
   * - custom list:  1224114714 (или "1224114714")
   */
  private _normalizeListNames(input: any): string[] {
    const arr = Array.isArray(input) ? input : [];
    const out = arr
      .map((x) => String(x ?? '').trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const uniq: string[] = [];
    for (const token of out) {
      const key = token.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(token);
      }
    }
    return uniq;
  }

  private _extractProviderLists(providerRes: any): ProviderList[] {
    const candidate =
      providerRes?.lists ??
      providerRes?.data?.lists ??
      providerRes?.data?.list ??
      providerRes?.data ??
      providerRes;

    if (!Array.isArray(candidate)) return [];

    return candidate
      .map((x: any) => {
        if (typeof x === 'string' || typeof x === 'number') {
          const v = String(x).trim();
          return { id: v, name: v };
        }

        const id = x?.id ?? x?.key ?? x?.type ?? x?.slug ?? x?.name;
        const name = String(x?.name ?? x?.title ?? x?.label ?? x?.id ?? '').trim();
        const type = x?.type;

        return { id, name, type };
      })
      .filter((x: any) => x?.id != null && x?.name);
  }

  private _buildProviderKeySet(lists: ProviderList[]): Set<string> {
    const set = new Set<string>();
    for (const l of lists) {
      set.add(String(l.id).toLowerCase());

      // запасной вариант: если прилетит name/type
      if (l.name) set.add(String(l.name).toLowerCase());
      if (l.type) set.add(String(l.type).toLowerCase());
    }
    return set;
  }

  // ApiMassMessageService (class-level)
  private static _audienceCache = new Map<string, { ts: number; providerSet: Set<string> }>();
  private static _AUDIENCE_TTL_MS = 10 * 60 * 1000; // 10 минут

  private async _validateAudienceLists(accountId: string, dto: any) {
    const userLists = this._normalizeListNames(dto?.userLists);
    const excludedLists = this._normalizeListNames(dto?.excludedLists);

    if (!userLists.length && !excludedLists.length) {
      return { userLists, excludedLists };
    }

    // ====== CACHE (чтобы не дергать GET user-lists на каждый job) ======
    const key = String(accountId || '').trim();
    const now = Date.now();
    const cached = ApiMassMessageService._audienceCache.get(key);

    let providerSet: Set<string> = new Set();

    if (cached && (now - cached.ts) < ApiMassMessageService._AUDIENCE_TTL_MS) {
      providerSet = cached.providerSet;
    } else {
      const providerLists = await this._loadAllProviderLists(accountId);

      if (!providerLists.length) {
        console.log('[ApiMassMessageService] provider lists empty, skip strict validation', {
          accountId, userLists, excludedLists,
        });
        return { userLists, excludedLists };
      }

      providerSet = this._buildProviderKeySet(providerLists);

      ApiMassMessageService._audienceCache.set(key, {
        ts: now,
        providerSet,
      });
    }
    // ================================================================

    // // ЕДИНСТВЕННЫЙ источник истины: всегда грузим все списки
    // const providerLists = await this._loadAllProviderLists(accountId);
    //
    // // Если провайдер вернул пусто — НЕ блокируем mass-message (иначе будет флапать UX)
    // if (!providerLists.length) {
    //   console.log('[ApiMassMessageService] provider lists empty, skip strict validation', {
    //     accountId,
    //     userLists,
    //     excludedLists,
    //   });
    //   return { userLists, excludedLists };
    // }
    //
    // const providerSet = this._buildProviderKeySet(providerLists);

    const missingUser = userLists.filter((x) => !providerSet.has(String(x).toLowerCase()));
    const missingExcluded = excludedLists.filter((x) => !providerSet.has(String(x).toLowerCase()));

    if (missingUser.length || missingExcluded.length) {
      console.log('[ApiMassMessageService] audience lists mismatch', {
        accountId,
        missingUser,
        missingExcluded,
        //providerCount: providerLists.length,
      });

      ApiMassMessageService._audienceCache.delete(String(accountId || '').trim());

      throw new BadRequestException(
        `Audience lists are outdated. Missing: ` +
        `${missingUser.length ? `userLists=[${missingUser.join(', ')}] ` : ''}` +
        `${missingExcluded.length ? `excludedLists=[${missingExcluded.join(', ')}]` : ''}`.trim(),
      );
    }

    return { userLists, excludedLists };
  }

  // async startMassMessage(dto: any) {
  //   const modelPlatformId = Number(dto?.modelPlatformId);
  //   //const text = String(dto?.text || '').trim();
  //
  //   // внутри startMassMessage(payload)
  //   const text = String((dto?.text ?? dto?.message ?? dto?.content ?? '')).trim();
  //
  //   // compatibility with scheduler payload keys
  //   dto.userLists = dto.userLists ?? dto.audience_include_ids;
  //   dto.excludedLists = dto.excludedLists ?? dto.audience_exclude_ids;
  //   dto.userIds = dto.userIds ?? dto.user_ids_array;
  //
  //   // media ids from scheduler (vault_media_ids) -> provider expects mediaFiles
  //   // keep dto.mediaIds for backward compatibility but map it to mediaFiles later
  //   dto.mediaIds = dto.mediaIds ?? dto.vault_media_ids;
  //
  //   if (!modelPlatformId) throw new BadRequestException('modelPlatformId is required');
  //   if (!text) throw new BadRequestException('Text is required, DTO is empty');
  //
  //   const mp = await this.modelPlatformService.findById(modelPlatformId);
  //   if (!mp) throw new BadRequestException(`ModelPlatform not found: ${modelPlatformId}`);
  //
  //   const accountId = String(mp.ofid_username || '').trim();
  //   if (!accountId) {
  //     throw new BadRequestException(`Account ID (ofid_username) is empty for modelPlatformId=${modelPlatformId}`);
  //   }
  //
  //   //const { userLists, excludedLists } = await this._validateAudienceLists(accountId, dto);
  //
  //   //const userLists = this._normalizeListNames(dto?.userLists);
  //   //const excludedLists = this._normalizeListNames(dto?.excludedLists);
  //
  //   // If dispatcher passes skipValidateLists=true -> do NOT call GET user-lists
  //   let userLists = this._normalizeListNames(dto?.userLists);
  //   let excludedLists = this._normalizeListNames(dto?.excludedLists);
  //
  //   if (!dto?.skipValidateLists) {
  //     const validated = await this._validateAudienceLists(accountId, dto);
  //     userLists = validated.userLists;
  //     excludedLists = validated.excludedLists;
  //   }
  //
  //   const userIds = Array.isArray(dto?.userIds) ? dto.userIds : [];
  //
  //   // normalize media ids/strings
  //   const mediaIds = Array.isArray(dto?.mediaIds)
  //     ? dto.mediaIds.map((x: any) => String(x ?? '').trim()).filter(Boolean)
  //     : [];
  //
  //   // provider contract fields
  //   const lockedText =
  //     dto?.lockedText !== undefined ? !!dto.lockedText :
  //       dto?.locked_text !== undefined ? !!dto.locked_text :
  //         undefined;
  //
  //   const saveForLater =
  //     dto?.saveForLater !== undefined ? !!dto.saveForLater :
  //       dto?.save_for_later !== undefined ? !!dto.save_for_later :
  //         undefined;
  //
  //   const scheduledDate =
  //     dto?.scheduledDate != null ? String(dto.scheduledDate).trim() :
  //       dto?.scheduled_date != null ? String(dto.scheduled_date).trim() :
  //         undefined;
  //
  //   // IMPORTANT: price rules per docs: 0 or 3-200, and if price > 0 -> mediaFiles required
  //   const priceRaw =
  //     dto?.price !== undefined && dto?.price !== null && dto?.price !== ''
  //       ? Number(dto.price)
  //       : undefined;
  //
  //   const hasPrice = priceRaw !== undefined && !Number.isNaN(priceRaw);
  //   const price = hasPrice ? priceRaw : undefined;
  //
  //   // previews can be: file[] | string[] | int[]
  //   // const previews = Array.isArray(dto?.previews) ? dto.previews : undefined;
  //
  //   // previews can be: file[] | string[] | int[]
  //   const previewsRaw = Array.isArray(dto?.previews) ? dto.previews : undefined;
  //
  //   // free_preview (0/1) from MessageDto / frontend
  //   const freePreviewFlag = Number(dto?.free_preview ?? dto?.freePreview ?? 0) === 1;
  //
  //   // normalize previews ids (string/int -> string)
  //   const previews = Array.isArray(previewsRaw)
  //     ? previewsRaw.map((x: any) => String(x ?? '').trim()).filter(Boolean)
  //     : undefined;
  //
  //   // Build provider payload (correct names)
  //   const payload: any = {
  //     text,
  //     userLists,
  //     excludedLists,
  //     userIds,
  //     //...(mediaIds.length ? { mediaIds } : {} ),
  //   };
  //
  //   if (lockedText !== undefined) payload.lockedText = lockedText;
  //   if (saveForLater !== undefined) payload.saveForLater = saveForLater;
  //   if (scheduledDate) payload.scheduledDate = scheduledDate;
  //
  //   // mediaFiles mapping
  //   // mediaIds (vault ids / ofapi ids) -> mediaFiles
  //   if (mediaIds.length) payload.mediaFiles = mediaIds;
  //
  //   if (price !== undefined) {
  //     payload.price = price;
  //
  //     // validate price bounds (docs: 0 or 3-200)
  //     const okPrice = price === 0 || (price >= 3 && price <= 200);
  //     if (!okPrice) {
  //       throw new BadRequestException('price must be 0 or between 3 and 200');
  //     }
  //
  //     // If paid: mediaFiles REQUIRED
  //     // if (price > 0) {
  //     //   if (!payload.mediaFiles || !Array.isArray(payload.mediaFiles) || payload.mediaFiles.length === 0) {
  //     //     throw new BadRequestException('price > 0 requires mediaFiles (use vault_media_ids / mediaIds)');
  //     //   }
  //     //
  //     //   // previews optional, but supported
  //     //   if (previews && previews.length) payload.previews = previews;
  //     // }
  //     // If paid: mediaFiles REQUIRED
  //     if (price > 0) {
  //       if (!payload.mediaFiles || !Array.isArray(payload.mediaFiles) || payload.mediaFiles.length === 0) {
  //         throw new BadRequestException('price > 0 requires mediaFiles (use vault_media_ids / mediaIds)');
  //       }
  //
  //       // 1) effective previews: explicit dto.previews OR (free_preview==1 -> first media)
  //       let effectivePreviews: string[] | undefined = previews;
  //
  //       if ((!effectivePreviews || effectivePreviews.length === 0) && freePreviewFlag) {
  //         // old behavior: first media is free preview
  //         effectivePreviews = [String(payload.mediaFiles[0])];
  //       }
  //
  //       // 2) IMPORTANT: every preview media must also be listed in mediaFiles
  //       if (effectivePreviews && effectivePreviews.length) {
  //         const mf = payload.mediaFiles.map((x: any) => String(x ?? '').trim()).filter(Boolean);
  //         const set = new Set(mf);
  //
  //         for (const pid of effectivePreviews) {
  //           if (!set.has(pid)) {
  //             mf.push(pid);
  //             set.add(pid);
  //           }
  //         }
  //
  //         payload.mediaFiles = mf;
  //         payload.previews = effectivePreviews;
  //       }
  //     } else {
  //       // price === 0: previews not needed, mediaFiles allowed (already set if present)
  //       if (previews && previews.length) payload.previews = previews; // harmless; provider may ignore
  //     }
  //   } else {
  //     // price is unset: if previews provided - still pass (provider may ignore)
  //     if (previews && previews.length) payload.previews = previews;
  //   }
  //
  //
  //
  //   console.log('[ApiMassMessageService] sending', {
  //     modelPlatformId,
  //     accountId,
  //     textLen: text.length,
  //     userLists: userLists.length,
  //     excludedLists: excludedLists.length,
  //     userIds: payload.userIds?.length,
  //     lockedText: payload.lockedText,
  //     saveForLater: payload.saveForLater,
  //     scheduledDate: payload.scheduledDate,
  //     price: payload.price,
  //     mediaFilesLen: Array.isArray(payload.mediaFiles) ? payload.mediaFiles.length : undefined,
  //     previewsLen: Array.isArray(payload.previews) ? payload.previews.length : undefined,
  //     free_preview: freePreviewFlag,
  //   });
  //
  //   // delay  чуть больше 10с
  //   await this._throttle10s(accountId);
  //
  //   const res = await this.externalApi.sendMassMessage(accountId, payload);
  //
  //   console.log('[ApiMassMessageService] provider response', res);
  //   return res;
  // }


  async startMassMessage(dto: any) {
    const modelPlatformId = Number(dto?.modelPlatformId);

    // внутри startMassMessage(payload)
    const text = String((dto?.text ?? dto?.message ?? dto?.content ?? '')).trim();

    // compatibility with scheduler payload keys
    dto.userLists = dto.userLists ?? dto.audience_include_ids;
    dto.excludedLists = dto.excludedLists ?? dto.audience_exclude_ids;
    dto.userIds = dto.userIds ?? dto.user_ids_array;

    // media ids from scheduler (vault_media_ids) -> provider expects mediaFiles
    // keep dto.mediaIds for backward compatibility but map it to mediaFiles later
    dto.mediaIds = dto.mediaIds ?? dto.vault_media_ids;

    if (!modelPlatformId) throw new BadRequestException('modelPlatformId is required');
    if (!text) throw new BadRequestException('Text is required, DTO is empty');

    const mp = await this.modelPlatformService.findById(modelPlatformId);
    if (!mp) throw new BadRequestException(`ModelPlatform not found: ${modelPlatformId}`);

    const accountId = String(mp.ofid_username || '').trim();
    if (!accountId) {
      throw new BadRequestException(`Account ID (ofid_username) is empty for modelPlatformId=${modelPlatformId}`);
    }

    // If dispatcher passes skipValidateLists=true -> do NOT call GET user-lists
    let userLists = this._normalizeListNames(dto?.userLists);
    let excludedLists = this._normalizeListNames(dto?.excludedLists);

    if (!dto?.skipValidateLists) {
      const validated = await this._validateAudienceLists(accountId, dto);
      userLists = validated.userLists;
      excludedLists = validated.excludedLists;
    }

    const userIds = Array.isArray(dto?.userIds) ? dto.userIds : [];

    // normalize media ids/strings
    const mediaIds = Array.isArray(dto?.mediaIds)
      ? dto.mediaIds.map((x: any) => String(x ?? '').trim()).filter(Boolean)
      : [];

    // provider contract fields
    const lockedText =
      dto?.lockedText !== undefined ? !!dto.lockedText :
        dto?.locked_text !== undefined ? !!dto.locked_text :
          undefined;

    const saveForLater =
      dto?.saveForLater !== undefined ? !!dto.saveForLater :
        dto?.save_for_later !== undefined ? !!dto.save_for_later :
          undefined;

    const scheduledDate =
      dto?.scheduledDate != null ? String(dto.scheduledDate).trim() :
        dto?.scheduled_date != null ? String(dto.scheduled_date).trim() :
          undefined;

    // IMPORTANT: price rules per docs: 0 or 3-200, and if price > 0 -> mediaFiles required
    const priceRaw =
      dto?.price !== undefined && dto?.price !== null && dto?.price !== ''
        ? Number(dto.price)
        : undefined;

    const hasPrice = priceRaw !== undefined && !Number.isNaN(priceRaw);
    const price = hasPrice ? priceRaw : undefined;

    // free_preview (0/1) from MessageDto / frontend
    const freePreviewFlag = Number(dto?.free_preview ?? dto?.freePreview ?? 0) === 1;

    // если free_preview включили — тогда price обязателен”, добавь жёсткую проверку
    if (freePreviewFlag && (price === undefined || price <= 0)) {
      throw new BadRequestException('free_preview requires price > 0');
    }

    // Build provider payload (correct names)
    const payload: any = {
      text,
      userLists,
      excludedLists,
      userIds,
    };

    if (lockedText !== undefined) payload.lockedText = lockedText;
    if (saveForLater !== undefined) payload.saveForLater = saveForLater;
    if (scheduledDate) payload.scheduledDate = scheduledDate;

    // mediaFiles mapping: mediaIds -> mediaFiles
    if (mediaIds.length) payload.mediaFiles = mediaIds;

    if (price !== undefined) {
      payload.price = price;

      // validate price bounds (docs: 0 or 3-200)
      const okPrice = price === 0 || (price >= 3 && price <= 200);
      if (!okPrice) {
        throw new BadRequestException('price must be 0 or between 3 and 200');
      }

      // If paid: mediaFiles REQUIRED
      if (price > 0) {
        if (!payload.mediaFiles || !Array.isArray(payload.mediaFiles) || payload.mediaFiles.length === 0) {
          throw new BadRequestException('price > 0 requires mediaFiles (use vault_media_ids / mediaIds)');
        }

        // ✅ ONLY RULE: first media is free preview (if flag enabled)
        if (freePreviewFlag) {
          payload.previews = [String(payload.mediaFiles[0])];
        }
      }
    }

    console.log('[ApiMassMessageService] sending', {
      modelPlatformId,
      accountId,
      textLen: text.length,
      userLists: userLists.length,
      excludedLists: excludedLists.length,
      userIds: payload.userIds?.length,
      lockedText: payload.lockedText,
      saveForLater: payload.saveForLater,
      scheduledDate: payload.scheduledDate,
      price: payload.price,
      mediaFilesLen: Array.isArray(payload.mediaFiles) ? payload.mediaFiles.length : undefined,
      previewsLen: Array.isArray(payload.previews) ? payload.previews.length : undefined,
      free_preview: freePreviewFlag,
    });

    // delay  чуть больше 10с
    await this._throttle10s(accountId);

    const res = await this.externalApi.sendMassMessage(accountId, payload);

    console.log('[ApiMassMessageService] provider response', res);
    return res;
  }

  async getAudienceLists(modelPlatformId: number) {
    const mp = await this.modelPlatformService.findById(modelPlatformId);
    if (!mp) throw new BadRequestException(`ModelPlatform not found: ${modelPlatformId}`);

    const accountId = String(mp.ofid_username || '').trim();
    if (!accountId) throw new BadRequestException(`Account ID (ofid_username) is empty for modelPlatformId=${modelPlatformId}`);

    // Возвращаем ПОЛНЫЙ список, а не первую страницу
    const lists = await this._loadAllProviderLists(accountId);
    return { lists };
  }

  private async _loadAllProviderLists(accountId: string): Promise<ProviderList[]> {
    const all: ProviderList[] = [];

    let offset: any = undefined;
    let guard = 0;

    while (guard++ < 50) {

      // ВАЖНО: этот вызов предполагает поддержку params в ExternalApiClient.getAudienceLists
      const res = await this.externalApi.getAudienceLists(
        accountId,
        offset != null ? { offset, limit: 50 } : { limit: 50},
      );

      if (guard === 1) {
        console.log('[ApiMassMessageService] audience FIRST PAGE raw', {
          type: typeof res,
          isArray: Array.isArray(res),
          keys: res && typeof res === 'object' ? Object.keys(res) : [],
          dataKeys: res?.data && typeof res.data === 'object' ? Object.keys(res.data) : [],
          metaKeys: res?._meta && typeof res._meta === 'object' ? Object.keys(res._meta) : [],
          sample: Array.isArray(res)
            ? res.slice(0, 5)
            : (Array.isArray(res?.data) ? res.data.slice(0, 5) : null),
        });
      }

      const page = this._extractProviderLists(res);
      if (page.length) all.push(...page);

      //const hasMore = Boolean(res?.data?.hasMore ?? res?.hasMore);
      const hasMore = Boolean(
        res?.data?.hasMore ??
        res?.hasMore ??
        res?._pagination?.hasMore ??
        res?._pagination?.has_more ??
        res?._meta?.hasMore ??
        res?._meta?._pagination?.hasMore ??
        res?._meta?._pagination?.has_more
      );


      //const nextOffset = res?.data?.nextOffset ?? res?.nextOffset;
      const nextOffset =
        res?.data?.nextOffset ??
        res?.nextOffset ??
        res?._pagination?.nextOffset ??
        res?._pagination?.next_offset ??
        res?._meta?.nextOffset ??
        res?._meta?._pagination?.nextOffset ??
        res?._meta?._pagination?.next_offset;


      if (!hasMore || nextOffset == null) break;
      offset = nextOffset;

      if (guard === 1) {
        console.log('[ApiMassMessageService 2] audience raw first page keys', {
          keys: Object.keys(res || {}),
          dataKeys: Object.keys(res?.data || {}),
          metaKeys: Object.keys(res?._meta || {}),
        });
      }

      if (guard === 1) {
        console.log('[ApiMassMessageService] audience _pagination keys', {
          paginationKeys: res?._pagination && typeof res._pagination === 'object' ? Object.keys(res._pagination) : [],
          pagination: res?._pagination,
        });
      }
    }

    // uniq по id (case-insensitive) + сохраняем порядок
    const seen = new Set<string>();
    const uniq: ProviderList[] = [];
    for (const l of all) {
      const k = String(l.id).toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(l);
      }
    }

    return uniq;
  }

  // ApiMassMessageService (class-level)
  private static _lastSendAtByAccount = new Map<string, number>();

  private async _sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async _throttle10s(accountId: string) {
    const key = String(accountId || '').trim();
    if (!key) return;

    const now = Date.now();
    const last = ApiMassMessageService._lastSendAtByAccount.get(key) || 0;
    const diff = now - last;

    const waitMs = 10_500 - diff; // чуть больше 10с
    if (waitMs > 0) {
      console.log('[ApiMassMessageService] throttle: wait', { accountId: key, waitMs });
      await this._sleep(waitMs);
    }

    ApiMassMessageService._lastSendAtByAccount.set(key, Date.now());
  }
}

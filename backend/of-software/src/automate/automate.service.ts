import { Injectable } from '@nestjs/common';
import { SafariPostService } from "./safari-post.service";
import { SafariMessageService } from "./safari-message.service";
import { PuppeteerPostService } from "./puppeteer-post.service";
import { PuppeteerMessageService } from "./puppeteer-message.service";
import { ApiMassMessageService } from "./api-mass-message.service";

@Injectable()
export class AutomateService {
  constructor(
    private readonly safariPostService: SafariPostService,
    private readonly safariMessageService: SafariMessageService,
    private readonly puppeteerPostService: PuppeteerPostService,
    private readonly puppeteerMessageService: PuppeteerMessageService,
    private readonly apiMassMessageService: ApiMassMessageService
  ) {}

  startMassMessage(data: any = {}) {
    return this.apiMassMessageService.startMassMessage(data);
  }

  getAudienceLists(modelPlatformId: number) {
    return this.apiMassMessageService.getAudienceLists(modelPlatformId);
  }

  // Puppeteer
  startMessage(data: any = {}, manual = false, wait = false) {
    return this.puppeteerMessageService.startMessage(data, manual, wait);
  }

  startPost(allData: any = {}, manual = false, wait = false) {
    return this.puppeteerPostService.startPost(allData, manual, wait);
  }

  // Safari
  startPostSafari(data: any = {}) {
    return this.safariPostService.startPostSafari(data);
  }

  startPostSafariFingerPrint(data: any = {}) {
    return this.safariPostService.startPostSafariFingerPrint(data);
  }

  startMessageSafari(data: any = {}) {
    return this.safariMessageService.startMessageSafari(data);
  }

  startMessageSafariFingerPrint(data: any = {}) {
    return this.safariMessageService.startMessageSafariFingerPrint(data);
  }
}

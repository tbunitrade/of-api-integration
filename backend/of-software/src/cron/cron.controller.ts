import { Controller, Get, Query, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { CronService } from './cron.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateCronDto } from 'src/dtos/create-cron.dto';
import { ManualStartDto } from 'src/dtos/manual-start.dto';
import { UserService } from 'src/user/user.service';
import { AutomateService } from "../automate/automate.service";

@Controller('cron')
@ApiTags('cron')
export class CronController {
  constructor(
    private readonly cronService: CronService,
    private readonly userService: UserService,
    private readonly automateService: AutomateService,
  ) {}

  @Get('start')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async start(@Query() createRequestDto: CreateCronDto) {
    try {
      await this.cronService.create(createRequestDto);
      return true;
    } catch (error) {
      console.log(error);
    }
  }

  @Get('get')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async get() {
    try {
      const result = await this.cronService.getCrons();
      return result;
    } catch (error) {
      console.log(error);
    }
  }

  @Get('manual-start')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async manualStart(
    @Request() req,
    @Query() { isPost = false , waitForManualLogin = false }: ManualStartDto,
  ) {
    console.log(`[CRON] manualStart called: isPost=${isPost}, waitForManualLogin=${waitForManualLogin}`);
    try {
      const id = req.user.id;
      const user = await this.userService.findById(id);

      // 🔥 ЗАПУСКАЕМ ФОНОМ, НЕ ЖДЁМ
      setTimeout(() => {
        this.cronService.manualStart(!!isPost, true, user, waitForManualLogin);
      }, 0);

      // ⚡ Ответим сразу, чтобы не было 504
      return {
        success: true,
        message: `Задача ${isPost ? 'Post' : 'Message'} запущена`,
        waitForManualLogin,
      };
      // const result = await this.cronService.manualStart(!!isPost, true, user);
      // return result;
    } catch (error) {
      console.log(error);
    }
  }

  @Get('manual-start-safari')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async manualStartSafari(
    @Request() req,
    @Query() {isPost = true }: ManualStartDto

  ) {
    console.log(`[CRON] manualStartSafari called`);
    try {
      const id = req.user.id;
      const user = await this.userService.findById(id)

      setTimeout( ()=> {
        this.cronService.manualStartSafari(!!isPost, true, user);
      }, 0);

      return {
        success: true,
        message: `Safari job started`
      }
    } catch (error){
      console.log('cron Failed', error)
    }
  }

  @Get('manual-start-safari-finger-print')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async manualStartSafariFingerPrint(
    //@Query('waitForManualLogin') wait = false) { // this incorrect for Python
    @Request() req,
    @Query('modelPlatformId') modelPlatformId: string,
    ) {

    console.log('[CRON] manualStartSafariFingerPrint() called');
    //const id = req.user.id; // 🔥 это model_platform_id
    const id = Number(modelPlatformId);
    if (!id || Number.isNaN(id)) {
      console.log('[CRON] ❌ modelPlatformId not provided or invalid:', modelPlatformId);
      throw new BadRequestException('modelPlatformId is required');
    }

    const waitForManualLogin = true; // если у тебя фингерпринт-режим
    console.log('[CRON] запускаем Safari FingerPrint login для modelPlatform id=', id);

    await this.cronService.manualStartSafariFingerPrint(id);
    return {
      ok: true,
      modelPlatformId: id,
    };
  }
}

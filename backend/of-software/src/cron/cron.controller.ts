import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CronService } from './cron.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateCronDto } from 'src/dtos/create-cron.dto';

@Controller('cron')
@ApiTags('cron')
export class CronController {
  constructor(private readonly cronService: CronService) {}

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
}

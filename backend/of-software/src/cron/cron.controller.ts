import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { CronService } from './cron.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateCronDto } from 'src/dtos/create-cron.dto';
import { ManualStartDto } from 'src/dtos/manual-start.dto';
import { UserService } from 'src/user/user.service';

@Controller('cron')
@ApiTags('cron')
export class CronController {
  constructor(
    private readonly cronService: CronService,
    private readonly userService: UserService,
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
    @Query() { isPost = false }: ManualStartDto,
  ) {
    try {
      const id = req.user.id;
      const user = this.userService.findById(id);
      const result = await this.cronService.manualStart(true, !!isPost, user);
      return result;
    } catch (error) {
      console.log(error);
    }
  }
}

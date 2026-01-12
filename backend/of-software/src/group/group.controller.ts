// src/platform/platform.controller.ts

import {
  Body,
  Controller,
  Post,
  ValidationPipe,
  UseGuards,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Group } from './group.entity';
import { GroupService } from './group.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GroupDto } from 'src/dtos/group.dto';
import { GroupRequestDto } from 'src/dtos/group_request.dto';
import { ModelPlatformService } from 'src/modelPlatform/model_platform.service';
import { NGroupPlatformRequestDto } from 'src/dtos/ngroup-platform.dto';
import { IdsDto } from 'src/dtos/ids.dto';
import { UpdateGroupStatus } from 'src/dtos/update-group-status.dto';

@Controller('group')
@ApiTags('group')
export class GroupController {
  constructor(
    private readonly groupService: GroupService,
    private readonly modelPlatformService: ModelPlatformService,
  ) {}

  @Get('all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAll() {
    try {
      const result = await this.groupService.findAll();
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('get-by-model-platform')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAllByModelPlatform(@Query() requestDto: GroupRequestDto) {
    const { model_id, platform_id, massmsg } = requestDto;

    // нормализуем massmsg (может быть "1", "0", "true", "false", undefined)
    const massFlag =
      massmsg === undefined || massmsg === null || massmsg === ''
        ? undefined
        : (String(massmsg).toLowerCase() === 'true' || String(massmsg) === '1');

    const result = await this.groupService.findAllByModelPlatform(
      model_id,
      platform_id,
      massFlag, // NEW
    );

    result.map((it) => {
      it['message_count'] = it.messages?.length ?? 0;
      delete it['messages'];
    });

    return result;
  }

  @Get('all-with-messages')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async findAllWithMessages() {
    try {
      const _result = await this.groupService.findAllWithMessages();
      const result = _result.map((it) => {
        const _messages = it.messages.sort(function (a, b) {
          const x = a.id;
          const y = b.id;
          if (x < y) return -1;
          if (x > y) return 1;
          return 0;
        });
        it.messages = _messages;
        return it;
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('add')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async addGroup(@Body(new ValidationPipe()) group: GroupDto) {
    try {
      const modelPlatform =
        await this.modelPlatformService.findByModelAndPlatform(
          group.model_id,
          group.platform_id,
        );

      if (!modelPlatform) {
        throw new HttpException(
          {
            status: HttpStatus.FORBIDDEN,
            error: 'Model is not connected with platform',
          },
          HttpStatus.FORBIDDEN,
        );
      }
      // normalize massmsg
      // massmsg может прилететь как 1/0 или "1"/"0" или "true"/"false"
      const massBool =
        group.massmsg === undefined || group.massmsg === null || group.massmsg === ('' as any)
          ? false
          : (String(group.massmsg).toLowerCase() === 'true' || String(group.massmsg) === '1');

      // сохраняем в DTO как number (0/1), чтобы не ломать типизацию DTO
      group.massmsg = massBool ? 1 : 0;
      const result = await this.groupService.create(group);
      await this.groupService.addGroupToPlatform(group.platform_id, result.id);

      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('get-n-group-by-platform-id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getNGroupByPlatformId(
    @Query() requestDto: NGroupPlatformRequestDto,
  ): Promise<Group[]> {
    try {
      const result = await this.groupService.findNGroupsByPlatformId(
        requestDto.platform_id,
        requestDto.group_id,
        requestDto.model_id,
        requestDto.count,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('get-groups-with-messages')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getGroupsWithMessages(@Query() requestDto: IdsDto): Promise<Group[]> {
    try {
      const result = await this.groupService.getGroupsWithMessages(
        requestDto.group_ids,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getGroupById(@Param('id') id: number): Promise<Group> {
    try {
      const result = await this.groupService.findById(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('/platform/:id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getGroupsByPlatformId(@Param('id') id: number): Promise<Group[]> {
    try {
      const result = await this.groupService.findGroupByPlatformId(id);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch('bulk-update-status')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async bulkUpdateStatus(
    @Body() updateGroupStatus: UpdateGroupStatus,
  ): Promise<boolean> {
    try {
      const { groupIds, status } = updateGroupStatus;
      const result = await this.groupService.bulkUpdateStatus(groupIds, status);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async updateGroup(
    @Param('id') id: number,
    @Body() updateGroupDto: GroupDto,
  ): Promise<Group> {
    try {
      const payload: any = { ...(updateGroupDto as any) };

      // ✅ normalize massmsg -> boolean
      if (payload.massmsg !== undefined && payload.massmsg !== null && payload.massmsg !== '') {
        const s = String(payload.massmsg).toLowerCase();
        payload.massmsg = (s === 'true' || s === '1');
      }

      delete payload.platform_id;

      const result = await this.groupService.update(id, payload as Partial<Group>);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async deleteGroup(@Param('id') id: number): Promise<Group> {
    try {
      const result = await this.groupService.delete(id);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

// src/automate/utils/automate-logger.service.ts

import {Injectable} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {
  TaskType,
  TaskStep,
  TaskStatus,
  ModelStatusLogEntity,
} from '../entities/model-status-log.entity';

@Injectable()
export class AutomateLoggerService {
  constructor(
    @InjectRepository(ModelStatusLogEntity)
    private readonly logRepo: Repository<ModelStatusLogEntity>,
  ) {}

  async log(data: {
    modelPlatformId: number;
    type: TaskType;
    step: TaskStep;
    status: TaskStatus;
    message?: string;
  }) {
    await this.logRepo.insert({
      model_platform_id: data.modelPlatformId,
      type: data.type,
      step: data.step,
      status: data.status,
      message: data.message,
    });
  }
}

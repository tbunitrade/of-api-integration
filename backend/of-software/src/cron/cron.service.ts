import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';
import { CreateCronDto } from 'src/dtos/create-cron.dto';
import { ModelPlatformService } from 'src/modelPlatform/model_platform.service';
import * as path from 'path';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { GroupService } from 'src/group/group.service';
import { AutomateService } from 'src/automate/automate.service';
export interface IResponseCron {
  // Cron job name
  name?: string;
  // Next cron run date
  next?: string;
}

@Injectable()
export class CronService {
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private modelPlatformService: ModelPlatformService,
    private groupService: GroupService,
    private automateService: AutomateService,
  ) {
    const cronJobConfigs = this.getCronJobConfigs();
    cronJobConfigs.forEach((config) => {
      this.create(config);
    });
  }

  /**
   * Create Cron job
   *
   * @param createCronDto
   * @returns
   */
  async create(createCronDto: CreateCronDto) {
    //this is test line and need to be deleted
    const test = this.createCron();
    await test();
    // const job = new CronJob(createCronDto.interval, this.createCron());
    // this.schedulerRegistry.addCronJob(createCronDto.name, job);
    // job.start();
    // this.saveCronJob(createCronDto);
    // return {
    //   name: createCronDto.name,
    //   next: job.nextDate(),
    // };
  }

  /**
   * Find All Cron Jobs
   *
   * @returns
   */
  getCrons() {
    const jobs = this.schedulerRegistry.getCronJobs();
    const cronList: IResponseCron[] = [];
    jobs.forEach((value, key, map) => {
      let next;
      try {
        next = value.nextDate().toISO();
      } catch (e) {
        next = 'error: next fire date is in the past!';
      } finally {
        cronList.push({
          name: key,
          next,
        });
      }
    });
    return cronList;
  }

  /**
   * Find a Cron Job
   *
   * @returns
   */
  getCron() {}

  /**
   * delete a Cron Job
   *
   * @param name
   * @returns
   */
  delete(name: string) {
    this.schedulerRegistry.deleteCronJob(name);
    const cronDir = this.cronJobConfigPath();
    const jsonPath = path.join(cronDir, `${name}.json`);
    unlinkSync(jsonPath);
    return name;
  }

  /**
   * delete a Cron Job
   *
   * @param name
   * @returns
   */
  deleteAll() {}

  /**
   * Create Cron job
   *
   * @param createCronDto
   * @returns
   */
  private createCron = () => {
    return async () => {
      try {
        const modelPlatforms = await this.modelPlatformService.findAll(false);
        for (let i = 0; i < modelPlatforms.length; i++) {
          const mp = modelPlatforms[i];
          //debugging for live server
          if (mp.id != 24) continue;
          let groups = await this.groupService.findNGroupsByPlatformId(
            mp.platform_id,
            mp.latest_group_id || 0,
            mp.model_id,
            mp.number_of_days,
          );
          if (groups.length < mp.number_of_days) {
            const additionalGroups =
              await this.groupService.findNGroupsByPlatformId(
                mp.platform_id,
                0,
                mp.model_id,
                mp.number_of_days,
              );
            groups = [...groups, ...additionalGroups];
          }
          const groupIds = groups.map((g) => g.id);
          const groupsWithMessages =
            await this.groupService.getGroupsWithMessages(groupIds);
          const data: any = mp;
          data.groupsWithMessages = groupsWithMessages;
          await this.automateService.start(data);
        }
      } catch (error) {
        console.error('Error in Cron job => ', error?.message ?? 'Unknown');
      }
    };
  };

  private updateCron = (updateCronDto: CreateCronDto) => {
    try {
      const job = this.schedulerRegistry.getCronJob(updateCronDto.name);
      const cronTime = new CronTime(updateCronDto.interval);
      job.setTime(cronTime);
      job.start();
      this.saveCronJob(updateCronDto);
    } catch (error) {
      console.error('Error on cron job update => ', error);
    }
  };

  /**
   * Save Cron job to json file
   *
   * @param createCronDto
   */
  private saveCronJob = (createCronDto: CreateCronDto) => {
    const cronDir = this.cronJobConfigPath();
    if (!existsSync(cronDir)) {
      mkdirSync(cronDir, { recursive: true });
    }

    const jsonPath = path.join(cronDir, `${createCronDto.name}.json`);
    if (!existsSync(jsonPath)) {
      writeFileSync(jsonPath, JSON.stringify(createCronDto, null, 4), 'utf-8');
    }
  };

  /**
   * Cron Job Config Path
   *
   * @returns
   */
  private cronJobConfigPath = () => {
    return path.join(__dirname, `../../.cron-data`);
  };

  /**
   * Get Cron Job Configs
   *
   * @returns
   */
  private getCronJobConfigs = () => {
    const cronDir = this.cronJobConfigPath();
    if (!existsSync(cronDir)) {
      mkdirSync(cronDir, { recursive: true });
    }
    const files = readdirSync(cronDir);

    return files.map((file) => {
      return this.getCronJobConfig(file);
    });
  };

  /**
   * Get Cron Job Config by FileName
   *
   * @param fileName
   * @returns
   */
  private getCronJobConfig = (fileName: string): CreateCronDto => {
    return JSON.parse(
      readFileSync(path.join(this.cronJobConfigPath(), fileName), {
        encoding: 'utf-8',
      }),
    );
  };
}

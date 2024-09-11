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
import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';
import { PostService } from 'src/post/post.service';
import { PostFileService } from 'src/postFile/post_file.service';
import { PostTimeService } from 'src/postTime/post_time.service';
import { PostTime } from 'src/postTime/post_time.entity';
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
    private postService: PostService,
    private postFileService: PostFileService,
    private postTimeService: PostTimeService,
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
    const job = new CronJob(
      createCronDto.interval,
      this.createCron(),
      null,
      true,
      'America/New_York',
    );
    this.schedulerRegistry.addCronJob(createCronDto.name, job);
    job.start();
    this.saveCronJob(createCronDto);
    return {
      name: createCronDto.name,
      next: job.nextDate(),
    };
  }

  /*
   * Manual Start Cron Job
   */
  async manualStart(isPost = false) {
    //this is test line and need to be deleted
    const startJob = this.createCron(isPost, true);
    await startJob();
    return true;
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
  private createCron = (isPost = false, manualStart = false) => {
    const MaxOpeningBrowserCount = 5;
    return async () => {
      try {
        const modelPlatforms = await this.modelPlatformService.findAll(false);
        const sendAMessage = async (mp: ModelPlatform, manualStart) => {
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
          const unsortedGroupsWithMessages =
            await this.groupService.getGroupsWithMessages(groupIds);
          const groupsWithMessages = unsortedGroupsWithMessages.sort((a, b) => {
            return groupIds.indexOf(a.id) - groupIds.indexOf(b.id);
          });
          const data: any = mp;
          data.groupsWithMessages = groupsWithMessages;
          const result = await this.automateService.startMessage(
            data,
            manualStart,
          );
          console.log('Posted Date Result: ', result);
          if (result) {
            const latestGroupId = groupIds ? groupIds[result - 1] : 0;
            const now =
              manualStart && new Date(data.scheduled_date) > new Date()
                ? new Date(data.scheduled_date)
                : new Date();
            const afterDays = new Date(
              new Date(now).setDate(now.getDate() + result),
            );
            await this.modelPlatformService.update(mp.id, {
              latest_group_id: latestGroupId,
              scheduled_date: afterDays.toDateString(),
            });
            groupIds.map(async (_id, idx) => {
              const postedDate = new Date(
                new Date(now).setDate(now.getDate() + idx + 1),
              );
              await this.groupService.update(_id, {
                added_on_platform_at: postedDate,
              });
            });
          }
        };
        const postAPost = async (mp: ModelPlatform, manualStart) => {
          const postWithTimesAndCaptions = await this.postService.findById(
            mp.id,
          );

          const postFiles = await this.postFileService.findByPostId(
            postWithTimesAndCaptions.id,
          );
          if (!postWithTimesAndCaptions.post_times) return;
          if (!postWithTimesAndCaptions.captions) return;

          const data = {
            modelPlatform: mp,
            postWithTimesAndCaptions,
            scheduledDate: postWithTimesAndCaptions.scheduled_date,
            numberOfDays: postWithTimesAndCaptions.number_of_days,
            postFiles,
          };
          const result = await this.automateService.startPost(
            data,
            manualStart,
          );
          if (result) {
            const now =
              manualStart && new Date(data.scheduledDate) > new Date()
                ? new Date(data.scheduledDate)
                : new Date();
            const afterDays = new Date(
              new Date(now).setDate(now.getDate() + result),
            );
            await this.postService.update(postWithTimesAndCaptions.id, {
              scheduled_date: afterDays.toDateString(),
            });
          }
        };

        let i = 0;
        let promises = [];
        for (;;) {
          console.log('I', i);
          if (i >= modelPlatforms.length) break;
          const mp = modelPlatforms[i];
          if (isPost) {
            const postWithTimesAndCaptions = await this.postService.findById(
              mp.id,
            );

            if (postWithTimesAndCaptions.number_of_days !== 0) {
              promises.push(postAPost(mp, manualStart));
              continue;
            }
          } else {
            if (mp.number_of_days !== 0) {
              promises.push(sendAMessage(mp, manualStart));
              continue;
            }
          }

          if (
            (i + 1) % MaxOpeningBrowserCount === 0 ||
            i === modelPlatforms.length - 1
          ) {
            await Promise.allSettled(promises);
            promises = [];
          }
          i++;
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

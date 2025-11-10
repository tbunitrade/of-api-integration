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
  async manualStart(isPost = false, manualStart = false, user?: any, waitForManualLogin = false) {
    //this is test line and need to be deleted
    const startJob = this.createCron(isPost, manualStart, user, waitForManualLogin);
    await startJob();
    return true;
  }

  async manualStartSafari(isPost = true, manualStart = false, user? : any) {
    console.log(`[CRON] manualStartSafari() → Safari mode enabled`);

    const modelPlatforms = await this.modelPlatformService.findAll(false);

    for (const mp of modelPlatforms) {
      const data = {
        model_id: mp.model_id,
        platform_id: mp.platform_id,
        username: mp.username,
        password: mp.password,
      };

      console.log(`[CRON] запускаем Safari для modelPlatform id=${mp.id}`);
      await this.automateService.startPostSafari(data);
    }

    return true;
  }

  async manualStartSafariFingerPrint() {
    console.log(`[CRON] manualStartSafariFingerPrint() called`);

    const modelPlatforms = await this.modelPlatformService.findAll(false);

    for (const mp of modelPlatforms) {
      const data = {
        model_id: mp.model_id,
        platform_id: mp.platform_id,
        username: mp.username,
        fingerprint_username: mp.username, // ⚠️ Критично!
        caption: 'Test caption from Safari', // можно убрать
      };

      console.log(`[CRON] запускаем Safari FingerPrint login для modelPlatform id=${mp.id}`);
      await this.automateService.startPostSafariFingerPrint(data);
    }

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
  private createCron = (isPost = false, manualStart = false, user?: any, waitForManualLogin= false) => {
    //ограничили параллелизм до 1, то есть startPost() сейчас идут строго последовательно. Поэтому всё безопасно.
    const MaxOpeningBrowserCount = 1;
    return async () => {
      // ← вот сюда вставляем логи
      console.log('>>> CRON handler: пытаюсь запустить AutomateService');
      console.log(`>>> CRON handler: режим = ${isPost ? 'Post' : 'Message'}, manualStart = ${manualStart}`);
      console.log('>>> ENV.HEADLESS_MODE =', process.env.HEADLESS_MODE);
      console.log('>>> ENV.DISPLAY      =', process.env.DISPLAY);
      console.log('>>> ENV.PUPPETEER_EXECUTABLE_PATH =', process.env.PUPPETEER_EXECUTABLE_PATH);

      console.log(
        `this [CRON START] ${isPost ? 'Post' : 'Message'} job ${
          manualStart ? '(manual)' : '(scheduled)'
        } started at ${new Date().toISOString()}`,
      );
      console.log(
        `[CRON] ${manualStart ? 'Manual' : 'Auto'} job started - ${isPost ? 'Post' : 'Message'} @ ${new Date().toISOString()}`,
      );

      try {
        const modelPlatforms = await this.modelPlatformService.findAll(false);
        console.log(`>>> [CRON] Найдено modelPlatforms: ${modelPlatforms.length}`); // ← забор моделей
        for (const mp of modelPlatforms) {
          console.log(`→ mp.id=${mp.id}, username="${mp.username}", password="${mp.password ? '••••••' : '(пусто)'}"`);
        }
        console.log('911');
        const sendAMessage = async (mp: ModelPlatform, manualStart: boolean = false, waitForManualLogin: boolean = false) => {
          console.log('sendAMessage', sendAMessage)
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
          if (user && user.prokey) {
            data.prokey = user.prokey;
          }
          data.groupsWithMessages = groupsWithMessages;
          console.log(`>>> [CRON] Собираюсь запустить startMessage для ModelPlatform id=${mp.id}`);
          const result = await this.automateService.startMessage(data, manualStart,waitForManualLogin);
          console.log('Posted Date Result: ', result);
          console.log('9015');
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
              console.log('9017');
            });
            console.log('9018');
          }
          console.log('9019');
        };
        console.log('9020');
        const postAPost = async (mp: ModelPlatform, manualStart: boolean = false, waitForManualLogin: boolean = false) => {
          console.log(`>>> [CRON] Собираюсь запустить startPost для ModelPlatform id=${mp.id}`);

          const postWithTimesAndCaptions = await this.postService.findById(
            mp.id,
          );
          if (!postWithTimesAndCaptions?.post_times || !postWithTimesAndCaptions?.captions) {
            console.log(`>>> [CRON] У mp.id=${mp.id} нет post_times или captions → пропускаем`);
            return;
          }

          const postFiles = await this.postFileService.findByPostId(
            postWithTimesAndCaptions.id,
          );
          if (!postWithTimesAndCaptions.post_times) return;
          if (!postWithTimesAndCaptions.captions) return;

          const data: any = {
            modelPlatform: mp,
            postWithTimesAndCaptions,
            scheduledDate: postWithTimesAndCaptions.scheduled_date,
            numberOfDays: postWithTimesAndCaptions.number_of_days,
            postFiles,
          };
          if (user && user.prokey) {
            data.prokey = user.prokey;
          }
          const result = await this.automateService.startPost(
            data,
            manualStart,
            waitForManualLogin
          );
          console.log(`>>> [CRON] startPost вернул:`, result);
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
            console.log('9027');
          }
          console.log('9028');
        };
        console.log('9029');

        let i = 0;
        let promises = [];
        for (;;) {
          i++;
          if (i > modelPlatforms.length) break;
          const mp = modelPlatforms[i - 1];
          if (isPost) {
            const postWithTimesAndCaptions = await this.postService.findById(
              mp.id,
            );

            if (
              postWithTimesAndCaptions &&
              postWithTimesAndCaptions.number_of_days !== 0
            ) {
              console.log(' promises.push',  waitForManualLogin);
              promises.push(postAPost(mp, manualStart, waitForManualLogin));
            }
          } else {
            if (mp.number_of_days !== 0) {
              promises.push(sendAMessage(mp, manualStart, waitForManualLogin));
            }
          }

          if (i % MaxOpeningBrowserCount === 0 || i === modelPlatforms.length) {
            await Promise.allSettled(promises);
            promises = [];
          }
        }

        console.log('9039');
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

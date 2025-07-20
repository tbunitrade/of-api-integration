// src/_functions/work-utils.ts

import type { Page } from 'puppeteer';
import { setTimeout } from 'node:timers/promises';
import process from "node:process";

export async function work(_config: any = null) {
  //wait for page loaded
  let compareResultValue = null;
  let workConfig = _config;
  if (!Array.isArray(_config)) {
    workConfig = [_config];
  }
  for (let i = 0; i < workConfig.length; i++) {
    try {
      const browserClosed = this.isBrowserClosed();
      console.log('BrowserClosed', browserClosed);
      if (browserClosed) return 'browser_closed';

      try {
        const alertEle = await this._page.$('#ModalAlert button');
        if (alertEle) {
          const actualValue = await this._page.evaluate((selector) => {
            const div = document.querySelector(selector);
            return div ? div.textContent.trim() : null;
          }, '#ModalAlert .dialog_message');
          const shouldClickModal = actualValue
            .toLowerCase()
            .includes('No microphone detected'.toLowerCase());
          if (shouldClickModal) {
            await alertEle.click();
          }
        }
      } catch (err) {}
      try {
        //await this._page.setTimeout(1000);
        await setTimeout(1000);
      } catch (err) {}

      const step = workConfig[i];
      console.log(`Step: ${step.type}, Value: ${step.value}`);
      switch (step.type) {
        case 'click':
          const ele = await this._page.$(step.value);
          if (ele) {
            await ele.click();
          }

          break;
        case 'waitForSelector':
          try {
          await this._page.waitForSelector(step.value, {
            timeout: 10000,
          });
          } catch (err) {
            console.warn(`⚠️ Selector "${step.value}" not found or timed out`, err);
          }
          break;
        case 'loop':
          const messageListStr = step.value;
          const _messageList = messageListStr ? messageListStr.split(',') : [];

          if (_messageList.length === 0)  {
            compareResultValue = false;

            break;
          }
          const messageList = _messageList.map((m) => m.trim());

          for (const msg of messageList) {
            if (!step.childs?.yes) {
              console.warn('[loop] Отсутствует step.childs.yes - > пропускаем итерацию');

              continue;
            }

            const steps = Array.isArray(step.childs?.yes) ? step.childs.yes : [step.childs?.yes];

            for (const _step of steps) {
              const stepCopy = { ..._step };
              if (stepCopy.value) {
                stepCopy.value = stepCopy.value.replaceAll('$value', msg);
              }
              await this.work([stepCopy]);
            }
          }

          break;

        case 'type':
          await this._page.evaluate(
            ({ selector, value }) => {
              const ele = document.querySelector(selector);
              if (ele) {
                ele.value = '';
                ele.dispatchEvent(new Event('input', { bubbles: true })); // As this is vue website, it doens't chagne state value though we set value on input box
                ele.value = value;
                ele.dispatchEvent(new Event('input', { bubbles: true })); // As this is vue website, it doens't chagne state value though we set value on input box
              }
            },
            { selector: step.selector, value: step.value },
          );
          // await this._page.type(step.selector, step.value);
          break;
        case 'keyboardType':
          await this.typeWithShiftEnter(step.value);
          // await this._page.keyboard.type(step.value);
          // await this._page.type(step.selector, step.value);
          break;
        case 'clickForValue':
          await this._page.evaluate(
            ({ selector, value }) => {
              const elements = Array.from(
                document.querySelectorAll(selector),
              );
              const eles = elements.filter((ele) =>
                ele.textContent.toLowerCase().includes(value.toLowerCase()),
              );
              if (eles.length > 0) {
                eles[0].click();
              }
            },
            { selector: step.selector, value: step.value },
          );

          // await this._page.click(`${step.selector}:contains("${step.value})`);
          break;

        case 'appendMedias':
          if (!step.value || step.value?.length === 0) break;
          const fileNameList = step.value.split(',') || [];

          const filePathList = fileNameList.map((it) => {
            const fileName = it.replace(/^.*[\\/]/, '');
            return `${process.env.UPLOAD_FOLDER_URL}/${fileName}`;
          });
          for (let fidx = 0; fidx < filePathList.length; fidx++) {
            const [fileChooser] = await Promise.all([
              this._page.waitForFileChooser(),
              this._page.$eval(step.selector, (element) => element.click()),
            ]);
            const fileName = filePathList[fidx];
            await fileChooser.accept([fileName]);
            //await this._page.setTimeout(100);
            await setTimeout(100);
          }

          // await fileChooser.accept(filePathList);
          //await this._page.setTimeout(500);
          await setTimeout(500);

          const waitForUploadDone = async () => {
            while (1) {
              try {
                await this._page.waitForFunction(
                  () =>
                    !document.querySelector(
                      'span.b-dropzone__preview__progress',
                    ),
                  {
                    timeout: 3000,
                  },
                );
                break;
              } catch (err) {
                console.log('Waiting for uploading done: ', err);
              }
            }
          };
          await waitForUploadDone();
          const closeFileTypeNotAllowed = [
            {
              type: 'click',
              value: '#ModalAlert___BV_modal_content_ footer button',
            },
          ];
          await this.work(closeFileTypeNotAllowed);
          // await this._page.waitForSelector(
          //   'button.b-dropzone__preview__edit',
          //   {
          //     timeout: 60000,
          //   },
          // );
          break;
        case 'waitForTime':
          try {
            //await this._page.setTimeout(step.value);
            await  setTimeout(step.value);
          } catch (error) {}

          break;
        case 'clickUntil':
          let tries = 12; // максимум 12 итераций (12 месяцев)
          while (tries--) {
            const domValue = await this._page.evaluate((selector) => {
              const div = document.querySelector(selector);
              return div ? div.textContent.trim() : null;
            }, step.selector);

            console.log(`🗓️ clickUntil: current="${domValue}", target="${step.value}"`);

            if (!domValue) {
              console.warn(`⚠️ Selector "${step.selector}" not found or returned null`);
              break;
            }

            if (domValue.toLowerCase().includes(step.value.toLowerCase())) {
              console.log('✅ clickUntil: target month found');
              break;
            }

            const ele = await this._page.$(step.btnSelector);
            if (ele) {
              await ele.click();
              await this._page.waitForTimeout(500); // небольшая пауза для отрисовки UI
            } else {
              console.warn(`⚠️ Button selector "${step.btnSelector}" not found`);
              break;
            }
          }

          if (tries <= 0) {
            console.error(`❌ clickUntil: exceeded max attempts for value "${step.value}"`);
          }
          break;
        case 'compareValue':
          const actualValue = await this._page.evaluate((selector) => {
            const div = document.querySelector(selector);
            return div ? div.textContent.trim() : null;
          }, step.selector);
          compareResultValue = actualValue
            .toLowerCase()
            .includes(step.value.toLowerCase());
          break;
        case 'checkValue':
          //compareResultValue = !!this._messageData[step.key || ''];
          //compareResultValue = this._messageData.hasOwnProperty(step.key);
          compareResultValue = !!(this._messageData && Object.prototype.hasOwnProperty.call(this._messageData, step.key));
          break;
        case 'condition':
          const conditions = step.childs;
          if (compareResultValue === true) {
            await this.work(conditions['yes']);
          } else {
            await this.work(conditions['no']);
          }
          compareResultValue = null;
          break;
        case 'runScript':
          await this._page.evaluate(
            ({ value }) => {
              eval(value);
            },
            { value: step.value },
          );
          break;
        case 'waitForNavigation':
          await this._page.waitForNavigation();
          break;
        case 'close':
          await this._browser.close();
          break;
        default:
          break;
      }
    } catch (error) {
      console.log('Error in work: ', error);
    }
  }
}


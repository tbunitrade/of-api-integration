import axios from 'axios';

const TWO_CAPTCHA_KEY = '1f98aeffff33253bdcbe8b92bc9f7d3f';

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export class RecaptchaUtil {
  constructor() {}

  async initiateCaptcha2Request(siteKey: any, pageUrl: any, version: number) {
    console.log('googlekey', siteKey);
    const formData2 = {
      method: 'userrecaptcha',
      googlekey: siteKey,
      key: TWO_CAPTCHA_KEY,
      pageurl: pageUrl,
      // domain: 'recaptcha.net',
      enterprise: 1,
      action: 'login',
      // invisible: 1,
    };
    const formData3 = {
      method: 'userrecaptcha',
      googlekey: siteKey,
      key: TWO_CAPTCHA_KEY,
      pageurl: pageUrl,
      enterprise: 1,
      version: 'v3',
      // min_score: 0.9,
      action: 'login',
    };
    const formData = version === 2 ? formData2 : formData3;
    try {
      const resp = await axios.post('https://2captcha.com/in.php', formData);
      if (resp.status == 200) {
        const respObj = resp.data;
        console.log(respObj);
        const result = respObj.split('|') || [];
        if (result.length > 0) {
          return Promise.resolve(result[1]);
        } else {
          return Promise.reject(result[0]);
        }
        // if (respObj.status == 0) {
        //   return Promise.reject(respObj.request);
        // } else {
        //   return Promise.resolve(respObj.request);
        // }
      } else {
        console.warn(
          `2Captcha request failed, Status Code: ${resp.status}, INFO: ${resp.data}`,
        );
        return Promise.reject('Error');
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async requestCaptcha2Results(requestId: string) {
    const url = `http://2captcha.com/res.php?key=${TWO_CAPTCHA_KEY}&action=get&id=${requestId}`;

    return new Promise(async (resolve, reject) => {
      const rawResponse = await axios.get(url);
      const resp = rawResponse.data;
      const result = resp.split('|') || [];
      if (result.length > 0 && result[0] === 'OK') {
        console.log(resp);
        return resolve(result[1]);
      } else {
        console.log(resp);
        return reject(resp);
      }
      // if (resp.status === 0) {
      //   console.log(resp);
      //   return reject(resp.request);
      // }
      // console.log(resp);
      // return resolve(resp.request);
    });
  }

  async resolveRecaptcha2(siteKey: any, pageUrl: any, maxTryNo = 3, version) {
    try {
      const reqId = await this.initiateCaptcha2Request(
        siteKey,
        pageUrl,
        version,
      );
      console.log('captcha requested. awaiting results.');
      for (let tryNo = 1; tryNo <= maxTryNo; tryNo++) {
        try {
          const result = await this.requestCaptcha2Results(reqId);
          console.log(result);

          return Promise.resolve(result);
        } catch (err) {
          console.warn(err);
          if (
            err == 'ERROR_CAPTCHA_UNSOLVABLE' ||
            err == 'ERROR_WRONG_CAPTCHA_ID'
          )
            return Promise.reject(err);
          await sleep(10000);
        }
      }
      console.log('Captcha not found within time limit');
    } catch (err) {
      console.warn(err);
      return Promise.reject(err);
    }
  }
}

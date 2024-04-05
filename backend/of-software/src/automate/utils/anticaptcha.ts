import * as ac from '@antiadmin/anticaptchaofficial';
ac.setAPIKey('81f34721ce628803ecd77740de22fe26');

ac.setSoftId(0);
export const resolveCaptcha = async (siteUrl: string, siteKey: string) => {
  const result = await ac
    .solveRecaptchaV2EnterpriseProxyless(siteUrl, siteKey)
    .then((gresponse) => {
      console.log('g-response: ' + gresponse);
      return gresponse;
    })
    .catch((error) => console.log('test received error ' + error));
  return result;
};

export const resolveCaptchaV3 = async (siteUrl: string, siteKey: string) => {
  const result = await ac
    .solveRecaptchaV3Enterprise(
      siteUrl,
      siteKey,
      0.9, //minimum score required: 0.3, 0.7 or 0.9
      'login',
    )
    .then((gresponse) => {
      console.log('g-response: ' + gresponse);
      return gresponse;
    })
    .catch((error) => console.log('test received error ' + error));
  return result;
};

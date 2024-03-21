import { Configuration, NopeCHAApi } from 'nopecha';

const configuration = new Configuration({
  apiKey: '29rskzpn9t_5WXXXGFJ',
});

const nopecha = new NopeCHAApi(configuration);

export const solveRecaptcha = async (
  type: string,
  sitekey: string,
  url: string,
): Promise<string> => {
  try {
    const token = await nopecha.solveToken({
      type,
      sitekey,
      url,
      enterprise: true,
      data: {
        action: 'login',
      },
    });
    return token;
  } catch (error) {
    console.log('NopeCha solving error: ', error);
    return '';
  }
};

// stores/cron.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'
const useCronStore = defineStore({
  id: 'cron',
  state: () => ({
    isLoading: false,
    crons: []
  }),
  actions: {
    async triggerCronJobManually( waitForManualLogin = false ) {
      console.log('🔥🔥 triggerCronJobManually action called with waitForManualLogin =', waitForManualLogin);
      try {
        const params = new URLSearchParams();
        if (waitForManualLogin) {
          params.append('waitForManualLogin', 'true');
        }
        await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/cron/manual-start?${params.toString()}`);
        console.log('triggerCronJobManually front end cron store started',);
        return true;
      } catch (error) {
        console.error('Cronjob start failed:', error)
        throw error
      }
    },
    async triggerPostCronJobManually( waitForManualLogin = false) {
      console.log('🔥 triggerPostCronJobManually action called with waitForManualLogin =', waitForManualLogin);
      try {
        const params = new URLSearchParams();
        params.append('isPost', 'true');
        if (waitForManualLogin){
          params.append('waitForManualLogin', 'true');
        }

        await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/cron/manual-start?${params.toString()}`);
        console.log('🔥 Axios request sent');
        return true;
      } catch (error) {
        console.error('Cronjob start failed:', error)
        throw error
      }
    },
    async triggerPostCronJobManuallyWithSafari( waitForManualLogin = false) {
      console.log('🔥 triggerPostCronJobManuallyWithSafari action called with waitForManualLogin =', waitForManualLogin);
      try {
        const params = new URLSearchParams();

        params.append('isPost', 'true')
        if(waitForManualLogin) {
         params.append('waitForManualLogin', 'true');
        }

        await  axios.get(`${import.meta.env.VITE_APP_ROOT_API}/cron/manual-start-safari?${params.toString()}`);
        console.log('🔥 Axios for safari request sent');
        return true;

      }
      catch (error){
        console.error('CronjobSafari start failed:', error)
        throw error
      }
    },
    async triggerPostCronJobManuallyWithSafariFingerPrint( waitForManualLogin = false) {
      console.log('🔥 triggerPostCronJobManuallyWithSafari action called with waitForManualLogin =', waitForManualLogin);
      try {
        const params = new URLSearchParams();
        if (waitForManualLogin) {
          params.append('waitForManualLogin', 'true');
        }

        await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/cron/manual-start-safari-finger-print?${params.toString()}`);
        console.log('✅ Safari fingerprint job triggered');
      } catch (error) {
        console.error('❌ triggerPostCronJobManuallyWithSafariFingerPrint failed:', error);
      }
    }
  }
})
export { useCronStore }

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
    async triggerCronJobManually() {
      try {
        axios.get(`${import.meta.env.VITE_APP_ROOT_API}/cron/manual-start`);
        console.log('triggerCronJobManually front end cron store started',);
        return true;
      } catch (error) {
        console.error('Cronjob start failed:', error)
        throw error
      }
    },
    async triggerPostCronJobManually() {
      try {
        axios.get(`${import.meta.env.VITE_APP_ROOT_API}/cron/manual-start?isPost=true`);
        console.log('triggerPostCronJobManually front end cron store started',);
        return true;
      } catch (error) {
        console.error('Cronjob start failed:', error)
        throw error
      }
    },
  }
})
export { useCronStore }

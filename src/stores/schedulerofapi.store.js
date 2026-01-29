// src/stores/schedulerofapi.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const useSchedulerOfApiStore = defineStore({
  id: 'schedulerofapi',
  state: () => ({
    isLoading: false,
    items: [],
    total: 0,
    limit: 50,
    offset: 0,
  }),
  actions: {
    async findAll(params = {}) {
      try {
        this.isLoading = true
        const res = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/schedulerofapi`, { params })
        if (res.data) {
          this.items = res.data.items || []
          this.total = res.data.total || 0
          this.limit = res.data.limit ?? this.limit
          this.offset = res.data.offset ?? this.offset
        }
        this.isLoading = false
        return res.data
      } catch (e) {
        this.isLoading = false
        throw e
      }
    },

    async createJob(payload) {
      try {
        this.isLoading = true

        console.log('[schedulerofapi] POST url=', `${import.meta.env.VITE_APP_ROOT_API}/schedulerofapi`)
        console.log('[schedulerofapi] POST payload=', payload)

        const res = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/schedulerofapi`, payload)

        console.log('[schedulerofapi] POST response=', res?.data)

        this.isLoading = false
        return res.data
      } catch (e) {
        this.isLoading = false
        throw e
      }
    },

    async createJobsBulk(jobs = []) {
      let created = 0
      let skipped = 0
      let failed = 0

      for (const j of jobs) {
        try {
          const r = await this.createJob(j)
          if (r?.id) created++
        } catch (e) {
          // если бекенд пока отвечает 500 на дубликат — хотя бы не валим весь bulk
          console.log('[schedulerofapi] createJobsBulk item error', e?.response?.data || e?.message || e)
          failed++
        }
      }

      return { created, skipped, failed, total: jobs.length }
    },

    async purge(params = {}) {
      try {
        this.isLoading = true

        console.log('[schedulerofapi] DELETE purge params=', params)

        const res = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/schedulerofapi/purge`, { params })

        console.log('[schedulerofapi] purge response=', res?.data)

        this.isLoading = false
        return res.data
      } catch (e) {
        this.isLoading = false
        throw e
      }
    },

    // publish now
    async dispatch(params = {}) {
      try {
        this.isLoading = true

        console.log('[schedulerofapi] POST dispatch params=', params)

        const res = await axios.post(
          `${import.meta.env.VITE_APP_ROOT_API}/schedulerofapi/dispatch`,
          null,
          { params }
        )

        console.log('[schedulerofapi] dispatch response=', res?.data)

        this.isLoading = false
        return res.data
      } catch (e) {
        this.isLoading = false
        throw e
      }
    },
  },
})

export { useSchedulerOfApiStore }

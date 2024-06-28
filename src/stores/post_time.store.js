// post_time.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const usePostTimeStore = defineStore({
  id: 'post_time',
  state: () => ({
    isLoading: false,
    post_times: []
  }),
  actions: {
    async getPostTimes(post_id) {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/post/${post_id}/post-times`
        )

        if (response.data) {
          const postTimes = response.data
          this.post_times = postTimes
        }

        return response.data
      } catch (error) {
        console.error('PostTime get failed:', error)
        throw error
      }
    },

    async addPostTime(data) {
      try {
        this.isLoading = true
        const response = await axios.post(
          `${import.meta.env.VITE_APP_ROOT_API}/post_time/add`,
          data
        )

        if (response.data) {
          const postTime = response.data
          this.post_times = [...this.post_times, postTime]
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('PostTime add failed:', error)
        this.isLoading = false
        throw error
      }
    },

    async updatePostTime(data) {
      try {
        this.isLoading = true
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/post_time/${data.id}`,
          data
        )

        if (response.data) {
          const postTime = response.data
          this.post_times = this.post_times.map((pt) => {
            if (pt.id === postTime.id) return postTime
            return pt
          })
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('PostTime update failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deletePostTime(id) {
      try {
        this.isLoading = true
        const response = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/post_time/${id}`)
        if (response.data) {
          this.post_times = this.post_times.filter((it) => it.id !== id)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Post Time delete failed:', error)
        this.isLoading = false
        throw error
      }
    }
  }
})

export { usePostTimeStore }

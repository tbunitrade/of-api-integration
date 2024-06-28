// post.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const usePostStore = defineStore({
  id: 'post',
  state: () => ({
    isLoading: false,
    post: {}
  }),
  actions: {
    async getPost(params) {
      const { model_id, platform_id } = params
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/post/model/${model_id}/platform/${platform_id}`
        )

        if (response.data) {
          const post = response.data
          this.post = post
        }

        return response.data
      } catch (error) {
        console.error('Post get failed:', error)
        throw error
      }
    },

    async addPost(data) {
      try {
        this.isLoading = true
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/post/add`, data)

        if (response.data) {
          const post = response.data
          this.post = post
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Post add failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async updatePost(data) {
      try {
        this.isLoading = true
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/post/${data.id}`,
          data
        )

        if (response.data) {
          const post = response.data
          this.post = post
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Post update failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deletePost(id) {
      try {
        this.isLoading = true
        const response = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/post/${id}`)
        if (response.data) {
          this.post = {}
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Post delete failed:', error)
        this.isLoading = false
        throw error
      }
    }
  }
})

export { usePostStore }

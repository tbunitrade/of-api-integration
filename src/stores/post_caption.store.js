// post_time.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const usePostCaptionStore = defineStore({
  id: 'post_caption',
  state: () => ({
    isLoading: false,
    post_captions: []
  }),
  actions: {
    async getPostCaptions(post_id) {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/post/${post_id}/post-captions`
        )

        if (response.data) {
          this.post_captions  = response.data??[]
        }

        return response.data
      } catch (error) {
        console.error('PostCaption get failed:', error)
        throw error
      }
    },

    async addPostCaption(data) {
      try {
        this.isLoading = true
        const response = await axios.post(
          `${import.meta.env.VITE_APP_ROOT_API}/post_caption/add`,
          data
        )

        if (response.data) {
          const postCaption = response.data
          this.post_captions = [...this.post_captions, postCaption]
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('PostCaption add failed:', error)
        this.isLoading = false
        throw error
      }
    },

    async updatePostCaption(data) {
      try {
        this.isLoading = true
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/post_caption/${data.id}`,
          data
        )

        if (response.data) {
          const postCaption = response.data
          this.post_captions = this.post_captions.map((pc) => {
            if (pc.id === postCaption.id) return postCaption
            return pc
          })
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('PostCaption update failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deletePostCaption(id) {
      try {
        this.isLoading = true
        const response = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/post_caption/${id}`)
        if (response.data) {
          this.post_captions = this.post_captions.filter((it) => it.id !== id)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('PostCaption delete failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async uploadFiles(data, post_id) {
      try {
        this.isLoading = true
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/post_caption/post/${post_id}/upload`, data, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        if (response.data) {
          const postCaption = response.data
          this.post_captions = [...this.post_captions, ...postCaption]
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('File upload failed:', error)
        this.isLoading = false
        throw error
      }
    },
  }
})

export { usePostCaptionStore }

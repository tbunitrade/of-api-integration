// post_files.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const usePostFileStore = defineStore({
  id: 'post_file',
  state: () => ({
    isLoading: false,
    post_files: []
  }),
  actions: {
    async getPostFiles(id) {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/post_file/post/${id}`
        )

        if (response.data) {
          const postFiles = response.data
          this.post_files = postFiles
        }

        return response.data
      } catch (error) {
        console.error('PostFile get failed:', error)
        throw error
      }
    },
    setPostFiles(files) {
      this.post_files = files
    },
    setEmpty() {
      this.post_files = []
    },
    async uploadFiles(data, post_id) {
      try {
        this.isLoading = true
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/upload`, data, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        if (response.data) {
          const files = response.data
          files.map(async (f) => {
            const postData = {
              post_id,
              url: f
            }
            const resp = await axios.post(
              `${import.meta.env.VITE_APP_ROOT_API}/post_file/add`,
              postData
            )
            if (resp.data) {
              this.post_files = [...this.post_files, resp.data]
            }
          })
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('File upload failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deleteFile(file, id) {
      try {
        this.isLoading = true
        const response = await axios.delete(
          `${import.meta.env.VITE_APP_ROOT_API}/post_file/${id}`
        )
        if (response.data) {
          const fileDeleteResponse = await axios.get(
            `${import.meta.env.VITE_APP_ROOT_API}/upload/delete?file=${file}`
          )
          if (fileDeleteResponse.data) {
            this.post_files = this.post_files.filter((it) => it.id !== id)
          }
        }
        this.isLoading = false
        return response.data
      } catch (err) {
        console.error('File delete failed: ', err)
        this.isLoading = false
        throw err
      }
    }
  }
})

export { usePostFileStore }

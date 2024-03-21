// files.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const useFileStore = defineStore({
  id: 'file',
  state: () => ({
    isLoading: false,
    files: []
  }),
  actions: {
    getAllFiles() {
      return this.files
    },
    setFiles(files) {
      this.files = files
    },
    setEmpty() {
      this.files = []
    },
    async uploadFiles(data) {
      try {
        this.isLoading = true
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/upload`, data, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        if (response.data) {
          const files = response.data
          this.files = [...this.files, ...files]
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
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/upload/delete?id=${id}&file=${file}`
        )
        if (response.data) {
          this.files = this.files.filter((it) => it !== file)
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

export { useFileStore }

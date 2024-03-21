// platform.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const usePlatformStore = defineStore({
  id: 'platform',
  state: () => ({
    isLoading: false,
    platforms: [],
    selectedPlatform: null
  }),
  actions: {
    setSelectedPlatform(selectedPlatform) {
      this.selectedPlatform = selectedPlatform || this.platforms[0]
    },
    async getAllPlatforms() {
      try {
        const response = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/platform/all`)

        if (response.data) {
          const platforms = response.data
          this.platforms = platforms
          this.selectedPlatform = this.platforms[0]
          localStorage.setItem('selectedPlatform', JSON.stringify(this.selectedPlatform))
        }

        return response.data
      } catch (error) {
        console.error('Platforms get failed:', error)
        throw error
      }
    },
    async addPlatform(data) {
      try {
        this.isLoading = true
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/platform/add`, data)

        if (response.data) {
          const platform = response.data
          this.platforms = [...this.platforms, platform]
          this.selectedPlatform = this.platforms[0]
          localStorage.setItem('selectedPlatform', JSON.stringify(this.selectedPlatform))
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Platform add failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async updatePlatform(data) {
      try {
        this.isLoading = true
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/platform/${data.id}`,
          data
        )

        if (response.data) {
          const platform = response.data
          this.platforms = this.platforms.map((it) => {
            if (it.id === platform.id) {
              return platform
            }
            return it
          })
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Platforms add failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deletePlatform(id) {
      try {
        this.isLoading = true
        const response = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/platform/${id}`)
        if (response.data) {
          this.platforms = this.platforms.filter((it) => it.id !== id)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Platform delete failed:', error)
        this.isLoading = false
        throw error
      }
    }
  }
})

export { usePlatformStore }

// model_platform.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const useModelPlatformStore = defineStore({
  id: 'model_platforms',
  state: () => ({
    isLoading: false,
    model_platforms: []
  }),
  actions: {
    async getAllModelPlatforms() {
      try {
        this.isLoading = true
        const response = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/model_platform/all`)

        if (response.data) {
          const model_platforms = response.data
          this.model_platforms = model_platforms
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        this.isLoading = false
        console.error('Model Platforms get failed:', error)
        throw error
      }
    },

    async getAModelPlatform(model_id) {
      try {
        this.isLoading = true
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/model_platform/model/${model_id}`
        )

        if (response.data) {
          const model_platforms = response.data
          this.model_platforms = model_platforms
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        this.isLoading = false
        console.error('Model Platforms get failed:', error)
        throw error
      }
    },

    async getModelPlatform(model_id, platform_id) {
      try {
        this.isLoading = true
        const response = await axios.get(
          `${
            import.meta.env.VITE_APP_ROOT_API
          }/model_platform/model/${model_id}/platform/${platform_id}`
        )

        if (response.data) {
          const model_platforms = response.data
          this.model_platforms = [model_platforms]
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        this.isLoading = false
        console.error('Model Platforms get failed:', error)
        throw error
      }
    },

    async addModelPlatform(data) {
      try {
        this.isLoading = true
        const response = await axios.post(
          `${import.meta.env.VITE_APP_ROOT_API}/model_platform/add`,
          data
        )

        if (response.data) {
          const model_platform = response.data
          this.model_platforms = [...this.model_platforms, model_platform]
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        this.isLoading = false
        console.error('Model Platform add failed:', error)
        throw error
      }
    },
    async updateModelPlatform(data) {
      try {
        this.isLoading = true
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/model_platform/${data.id}`,
          data
        )

        if (response.data) {
          const model_platform = response.data
          this.model_platforms = this.model_platforms.map((it) => {
            if (it.id === model_platform.id) {
              return model_platform
            }
            return it
          })
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        this.isLoading = false
        console.error('Platforms add failed:', error)

        throw error
      }
    },
    async deleteModelPlatform(id) {
      try {
        this.isLoading = true
        const response = await axios.delete(
          `${import.meta.env.VITE_APP_ROOT_API}/model_platform/${id}`
        )
        if (response.data) {
          this.model_platforms = this.model_platforms.filter((it) => it.id !== id)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Model_Platform delete failed:', error)
        this.isLoading = false
        throw error
      }
    }
  }
})

export { useModelPlatformStore }

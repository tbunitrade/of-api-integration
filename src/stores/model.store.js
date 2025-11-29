// model.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const useModelStore = defineStore({
  id: 'model',
  state: () => ({
    isLoading: false,
    models: [],
    selectedModel: {
     id: null,
     name : ''
    }
  }),
  actions: {
    setSelectedModel(model) {
      this.selectedModel = model
    },

    removeSelectedModel() {
      this.selectedModel = null
    },

    async getAllModels() {
      try {
        const response = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/model/all`)

        if (response.data) {
          const models = response.data
          this.models = models
        }

        return response.data
      } catch (error) {
        console.error('Models get failed:', error)
        throw error
      }
    },

    async getAllModelsWithPlatforms() {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/model/all-with-platform`
        )

        if (response.data) {
          const models = response.data
          this.models = models
        }

        return response.data
      } catch (error) {
        console.error('Models get failed:', error)
        throw error
      }
    },
    async addModel(data) {
      try {
        this.isLoading = true
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/model/add`, data)

        if (response.data) {
          const model = response.data
          this.models = [...this.models, model]
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Model add failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async updateModel(data) {
      try {
        this.isLoading = true
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/model/${data.id}`,
          data
        )

        if (response.data) {
          const model = response.data
          this.models = this.models.map((it) => {
            if (it.id === model.id) {
              return model
            }
            return it
          })
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Models add failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deleteModel(id) {
      try {
        this.isLoading = true
        const response = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/model/${id}`)
        if (response.data) {
          this.models = this.models.filter((it) => it.id !== id)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Model delete failed:', error)
        this.isLoading = false
        throw error
      }
    }
  }
})

export { useModelStore }

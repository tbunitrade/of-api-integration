// group.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const useGroupStore = defineStore({
  id: 'group',
  state: () => ({
    isLoading: false,
    groups: []
  }),
  actions: {
    async getAllGroups(params) {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/group/get-by-model-platform`,
          {
            params
          }
        )
        if (response.data) {
          const groups = response.data
          this.groups = groups
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Groups get failed:', error)
        throw error
      }
    },
    async addGroup(data) {
      try {
        this.isLoading = true
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/group/add`, data)

        if (response.data) {
          const group = response.data
          this.groups = [...this.groups, group]
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Group add failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async updateGroup(data) {
      try {
        this.isLoading = true
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/group/${data.id}`,
          data
        )

        if (response.data) {
          const group = response.data
          this.groups = this.groups.map((it) => {
            if (it.id === group.id) {
              return group
            }
            return it
          })
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Groups add failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async bulkUpdateStatus(data) {
      try {
        this.isLoading = true
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/group/bulk-update-status`,
          data
        )

        if (response.data === true) {
          this.groups = this.groups.map((it) => {
            if (data.groupIds.includes(it.id)) {
              it.status = parseInt(data.status)
            }
            return it
          })
          console.log('this.groups', this.groups)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Groups update failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deleteGroup(id) {
      try {
        this.isLoading = true
        const response = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/group/${id}`)
        if (response.data) {
          this.groups = this.groups.filter((it) => it.id !== id)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Groups delete failed:', error)
        this.isLoading = false
        throw error
      }
    }
  }
})

export { useGroupStore }

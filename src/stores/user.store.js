// user.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const useUserStore = defineStore({
  id: 'user',
  state: () => ({
    isLoading: false,
    users: []
  }),
  actions: {
    async getAllUsers() {
      try {
        this.isLoading = true
        const response = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/user/all`)

        if (response.data) {
          const users = response.data
          this.users = users
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Users get failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async addUser(data) {
      try {
        this.isLoading = true
        data.confirm_password = data.confirmPassword
        delete data.confirmPassword
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/user/add`, data)

        if (response.data) {
          const user = response.data
          this.users = [...this.users, user]
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Users add failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async updateUser(data) {
      try {
        this.isLoading = true
        data.confirm_password = data.confirmPassword
        delete data.confirmPassword
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/user/${data.id}`,
          data
        )

        if (response.data) {
          const user = response.data
          this.users = this.users.map((it) => {
            if (it.id === user.id) {
              return user
            }
            return it
          })
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Users add failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deleteUser(id) {
      try {
        this.isLoading = true
        const response = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/user/${id}`)
        if (response.data) {
          this.users = this.users.filter((it) => it.id !== id)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('User delete failed:', error)
        this.isLoading = false
        throw error
      }
    }
  }
})

export { useUserStore }

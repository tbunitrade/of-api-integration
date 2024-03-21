// auth/index.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const useAuthStore = defineStore({
  id: 'auth',
  state: () => ({
    isLoading: false,
    isLoggedIn: false,
    access_token: null,
    user: null
  }),
  actions: {
    async login({ email, password }) {
      try {
        this.isLoading = true
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/auth/login`, {
          email: email,
          password: password
        })

        if (response.data) {
          const { access_token, user } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('user', JSON.stringify(user))
          this.access_token = access_token
          this.user = user
          this.isLoggedIn = true
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        this.isLoading = false
        console.error('Login failed:', error)
        throw error
      }
    },

    async getMyProfile() {
      try {
        const response = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/user/me`)

        if (response.data) {
          const { user } = response.data
          this.user = user
        }

        return response.data
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      }
    },

    async updateMyProfile({ firstName, lastName, email }) {
      try {
        const response = await axios.patch(`${import.meta.env.VITE_APP_ROOT_API}/user/me`, {
          email: email,
          firstName: firstName,
          lastName: lastName
        })

        if (response.data) {
          const user = response.data
          localStorage.setItem('user', JSON.stringify(user))
          this.user = user
        }

        return response.data
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      }
    },

    logout() {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      this.access_token = null
      this.user = null
      this.isLoggedIn = false
    }
  }
})

export { useAuthStore }

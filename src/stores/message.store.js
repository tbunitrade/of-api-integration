// message.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const useMessageStore = defineStore({
  id: 'message',
  state: () => ({
    isLoading: false,
    messages: []
  }),
  actions: {
    async getMessagesByGroup(id) {
      try {
        const response = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/message/group/${id}`)
        if (response.data) {
          const messages = response.data
          this.messages = messages
        } else {
          this.messages = []
        }

        return response.data
      } catch (error) {
        console.error('Messages get failed:', error)
        throw error
      }
    },

    async getMessagesByModel(id) {
      try {
        const response = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/message/model/${id}`)
        if (response.data) {
          const messages = response.data
          this.messages = messages
        } else {
          this.messages = []
        }

        return response.data
      } catch (error) {
        console.error('Messages get failed:', error)
        throw error
      }
    },

    async getAllMessages() {
      try {
        const response = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/message/all`)

        if (response.data) {
          const messages = response.data
          this.messages = messages
        }

        return response.data
      } catch (error) {
        console.error('Messages get failed:', error)
        throw error
      }
    },
    async addMessage(data) {
      try {
        this.isLoading = true
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/message/add`, data)

        if (response.data) {
          const message = response.data
          this.messages = [...this.messages, message]
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Message add failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async updateMessage(data) {
      try {
        this.isLoading = true
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/message/${data.id}`,
          data
        )

        if (response.data) {
          const message = response.data
          this.messages = this.messages.map((it) => {
            if (it.id === message.id) {
              return message
            }
            return it
          })
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Message update failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deleteMessage(id) {
      try {
        this.isLoading = true
        const response = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/message/${id}`)
        if (response.data) {
          this.messages = this.messages.filter((it) => it.id !== id)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('Messages delete failed:', error)
        this.isLoading = false
        throw error
      }
    }
  }
})

export { useMessageStore }

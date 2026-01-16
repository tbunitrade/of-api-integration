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
    async getMessagesByGroup(id, opts = {}) {
      try {
        const params = {}
        if (opts.massmsg !== undefined) params.massmsg = opts.massmsg ? 1 : 0

        const response = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/message/group/${id}`,
          Object.keys(params).length? {params} : {})
        if (response.data) {
          this.messages = response.data || []
        }

        return response.data
      } catch (error) {
        console.error('Messages get failed:', error)
        throw error
      }
    },

    async getMessagesByModel(id, searchStr, opts = {} ) {
      try {
        const params = {}
        if (searchStr) params.searchStr = searchStr
        if (opts.massmsg !== undefined) params.massmsg = opts.massmsg ? 1 : 0

        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/message/model/${id}`,
          Object.keys(params).length ? { params } : {}
        )
        if (response.data) {
          this.messages = response.data || []
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
          this.messages = response.data
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
          //this.messages = [...this.messages, message]
          const idx = this.messages.findIndex((it) => String(it.id) === String(message.id))
          if (idx === -1) this.messages = [...this.messages, message]
          else this.messages = this.messages.map((it) => (String(it.id) === String(message.id) ? message : it))
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
            // if (it.id === message.id) {
            //   return message
            // }
            if (String(it.id) === String(message.id)) {
              return { ...it, ...message } // сохраним group_name из raw, если он был
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

// axios.js
import axios from 'axios'
import { notify } from '@kyvg/vue3-notification'

const instance = axios.create()

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') // Replace with your actual token key
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add a response interceptor
instance.interceptors.response.use(
  (response) => {
    // Do something with the response data
    return response
  },
  (error) => {
    // Do something with the response error
    if (error.response.status === 401) {
      // Redirect to the login page or handle the unauthorized error
      window.location.href = '#/login'
    } else {
      notify({
        title: error.response.data.error,
        type: 'error',
        duration: 3000,
        text: error.response.data.message
      })
    }
    return Promise.reject(error)
  }
)

export default instance

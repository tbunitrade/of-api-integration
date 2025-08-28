import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
//import SimpleVueValidation from 'simple-vue-validator'
import Notifications from '@kyvg/vue3-notification'
//import vue3Spinner from 'vue3-spinner'
import { ClipLoader } from 'vue3-spinner'   // ✅ берём компонент
import { useMainStore } from '@/stores/main.js'

import './css/main.css'

// Init Pinia
const pinia = createPinia()

// Create Vue app
const app = createApp(App)
app.use(Notifications)
app.use(pinia)

//app.use(vue3Spinner)
//app.use(router).use(SimpleVueValidation).mount('#app')
app.component('ClipLoader', ClipLoader)
app.use(router).mount('#app')
// Init main store
const mainStore = useMainStore(pinia)

// Fetch sample data
mainStore.fetchSampleClients()
mainStore.fetchSampleHistory()

// Dark mode
// Uncomment, if you'd like to restore persisted darkMode setting, or use `prefers-color-scheme: dark`. Make sure to uncomment localStorage block in src/stores/darkMode.js
// import { useDarkModeStore } from './stores/darkMode'

// const darkModeStore = useDarkModeStore(pinia)

// if (
//   (!localStorage['darkMode'] && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
//   localStorage['darkMode'] === '1'
// ) {
//   darkModeStore.set(true)
// }

// Default title tag
const defaultDocumentTitle = 'Of-Software'

// Set document title from route meta
router.afterEach((to) => {
  document.title = to.meta?.title
    ? `${to.meta.title} — ${defaultDocumentTitle}`
    : defaultDocumentTitle
})

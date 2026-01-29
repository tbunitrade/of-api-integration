// src/views/CronJobsView.vue
<script setup>
import { computed, reactive, ref, onMounted, watch } from 'vue'
import { useSchedulerOfApiStore } from '@/stores/schedulerofapi.store'

const store = useSchedulerOfApiStore()

const filters = reactive({
  model_platform_id: '',
  group_id: '',
  message_id: '',
  job_type: '',
  status: '',
})

const page = ref(1)
const limit = ref(50)

const maxPage = computed(() => {
  const t = Number(store.total || 0)
  const l = Number(limit.value || 50)
  return Math.max(1, Math.ceil(t / l))
})

const jsonModal = reactive({
  open: false,
  title: '',
  text: '',
})

function openJson(title, obj) {
  let text = ''
  try {
    // payload/response у тебя jsonb: иногда уже объект, иногда строка
    const v = typeof obj === 'string' ? JSON.parse(obj) : obj
    text = JSON.stringify(v, null, 2)
  } catch (e) {
    text = String(obj ?? '')
  }
  jsonModal.title = title
  jsonModal.text = text
  jsonModal.open = true
}

async function load() {
  await store.load({
    page: page.value,
    limit: limit.value,
    model_platform_id: filters.model_platform_id || undefined,
    group_id: filters.group_id || undefined,
    message_id: filters.message_id || undefined,
    job_type: filters.job_type || undefined,
    status: filters.status || undefined,
  })
}

function onApply() {
  page.value = 1
  load()
}

function onReset() {
  filters.model_platform_id = ''
  filters.group_id = ''
  filters.message_id = ''
  filters.job_type = ''
  filters.status = ''
  page.value = 1
  load()
}

function onReload() {
  load()
}

function go(p) {
  page.value = p
  load()
}

watch(limit, () => {
  page.value = 1
  load()
})

onMounted(() => load())
</script>

<template>
  <div class="p-4">
    <a href="http://localhost:5173/?#/mass">Go to Mass</a>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">CRON / Scheduler (OF API)</h2>
      <button class="px-3 py-2 border rounded" @click="onReload">Reload</button>
    </div>

    <div class="grid grid-cols-6 gap-2 mb-4">
      <input class="border p-2 rounded" v-model="filters.model_platform_id" placeholder="model_platform_id" />
      <input class="border p-2 rounded" v-model="filters.group_id" placeholder="group_id" />
      <input class="border p-2 rounded" v-model="filters.message_id" placeholder="message_id" />
      <input class="border p-2 rounded" v-model="filters.job_type" placeholder="job_type (massmsg)" />
      <input class="border p-2 rounded" v-model="filters.status" placeholder="status (queued/sent/...)" />
      <select class="border p-2 rounded" v-model="limit">
        <option :value="20">20</option>
        <option :value="50">50</option>
        <option :value="100">100</option>
        <option :value="200">200</option>
      </select>
    </div>

    <div class="mb-3">
      <button class="px-3 py-2 border rounded" @click="onApply">Apply</button>
      <button class="ml-2 px-3 py-2 border rounded" @click="onReset">Reset</button>
    </div>

    <div v-if="store.loading" class="mb-2">Loading...</div>

    <div class="overflow-auto border rounded">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50">
        <tr>
          <th class="text-left p-2">id</th>
          <th class="text-left p-2">mp</th>
          <th class="text-left p-2">group</th>
          <th class="text-left p-2">msg</th>
          <th class="text-left p-2">type</th>
          <th class="text-left p-2">status</th>
          <th class="text-left p-2">attempt</th>
          <th class="text-left p-2">scheduled_at</th>
          <th class="text-left p-2">external_id</th>
          <th class="text-left p-2">payload</th>
          <th class="text-left p-2">response</th>
          <th class="text-left p-2">error</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="it in store.items" :key="it.id" class="border-t">
          <td class="p-2">{{ it.id }}</td>
          <td class="p-2">{{ it.model_platform_id }}</td>
          <td class="p-2">{{ it.group_id }}</td>
          <td class="p-2">{{ it.message_id }}</td>
          <td class="p-2">{{ it.job_type }}</td>
          <td class="p-2">{{ it.status }}</td>
          <td class="p-2">{{ it.attempt }}</td>
          <td class="p-2">{{ it.scheduled_at }}</td>
          <td class="p-2">{{ it.external_id }}</td>

          <td class="p-2">
            <button class="underline" @click="openJson('payload', it.payload)">view</button>
          </td>
          <td class="p-2">
            <button class="underline" @click="openJson('response', it.response)">view</button>
          </td>
          <td class="p-2">
            <button v-if="it.error" class="underline" @click="openJson('error', it.error)">view</button>
            <span v-else>-</span>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between mt-4">
      <div>Total: {{ store.total }}</div>
      <div class="flex items-center gap-2">
        <button class="px-3 py-2 border rounded" :disabled="page<=1" @click="go(page-1)">Prev</button>
        <div>Page {{ page }}</div>
        <button class="px-3 py-2 border rounded" :disabled="page>=maxPage" @click="go(page+1)">Next</button>
      </div>
    </div>

    <!-- JSON modal -->
    <div v-if="jsonModal.open" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div class="bg-white w-full max-w-4xl rounded p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="font-bold">{{ jsonModal.title }}</div>
          <button class="px-3 py-2 border rounded" @click="jsonModal.open=false">Close</button>
        </div>
        <pre class="text-xs overflow-auto max-h-[70vh] border rounded p-3">{{ jsonModal.text }}</pre>
      </div>
    </div>

  </div>
</template>


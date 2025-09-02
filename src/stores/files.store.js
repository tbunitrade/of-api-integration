// files.store.js
//для сообщений, работает в MessageView.vue
// (возможно чат или файл-менеджер не по постам)

import { defineStore } from 'pinia'
import axios from '../plugin/axios'
import {error} from "simple-vue-validator/src/templates";

const useFileStore = defineStore({
  id: 'file',
  state: () => ({
    isLoading: false,
    files: []
  }),
  actions: {
    getAllFiles() {
      return this.files
    },
    setFiles(files) {
      this.files = files
    },
    setEmpty() {
      this.files = []
    },
    async uploadFiles( data, onProgress, signal ) {
      try {
        this.isLoading = true
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/upload`, data, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.lengthComputable) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(percentCompleted);
            }
          },
          signal,
          timeout: 0,
        });

        if (response.data) {
          const files = response.data
          this.files = [...this.files, ...files]
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('File upload failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deleteFile(file, id, modelName, entity = 'messages') {
      try {
        this.isLoading = true
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/upload/delete?id=${id}&file=${encodeURIComponent(file)}`
        )
        if (response.data) {
          this.files = this.files.filter((it) => it !== file);

          await this.refreshFiles({
            model_name: modelName,
            model_id: String(id),
            entity,
          })
        }
        this.isLoading = false
        return response.data
      } catch (err) {
        console.error('File delete failed: ', err)
        this.isLoading = false
        throw err
      }
    },
    async refreshFiles(params) {
      try {
        // params: { model_name: 'message', model_id: '123' }
        const { model_name, model_id, entity } = params || {};
        if (!model_name || !model_id) return [];

        const res = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/upload/list`,
          { params: { model_name, model_id, entity } }
        );
        const files = res.data || [];
        this.files = files;
        return files;
      } catch (e) {
        console.error('refreshFiles failed:', e);
        throw e;
      }
    }

  }
})

export { useFileStore }

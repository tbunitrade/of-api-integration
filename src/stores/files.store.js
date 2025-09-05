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
              console.log('refresh');
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(percentCompleted);
            }

            console.log('refresh 2');
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
    //async deleteFile(file, id, modelName, entity = 'messages') {
    //async deleteFile(file, id, modelName, entity = 'messages', groupId = null) {
    async deleteFile(file, meta) {
      try {
        this.isLoading = true;
        // meta: { messageId, groupId, modelName, entity }
        const { messageId, modelName, entity = 'messages' } = meta || {}
        const response = await axios.get(
      `${import.meta.env.VITE_APP_ROOT_API}/upload/delete?id=${encodeURIComponent(messageId)}&file=${encodeURIComponent(file)}`
        )

        // const response = await axios.get(
        //   `${import.meta.env.VITE_APP_ROOT_API}/upload/delete?id=${messageId}&file=${encodeURIComponent(file)}`
        // );

        // затем честный рефреш
        if (entity === 'messages') {
          await this.refreshFiles({
            entity: 'messages',
            model_name: modelName,
            group_id: meta.group_id,
            message_id: meta.group_id
          })
        } else {
          await this.refreshFiles({
            entity,
            model_name: modelName,
            group_id: meta.group_id,
            model_id: meta.model_id, // старый кейс для post, если надо

          })
        }


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
    async refreshFiles( params = {} ) {
      try {
        const { entity = 'post', model_name, model_id, group_id, message_id, message_name } = params;
        if (!model_name) return [];

        // Для messages используем group_id + message_id

        const query =
          entity === 'messages'
            ? { model_name, entity, group_id, message_id }
            : { model_name, entity, model_id, message_name }
        const res = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/upload/list`, { params: query });
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

// files.store.js
// для сообщений, работает в MessageView.vue
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
    async deleteFile(file, arg2, arg4 = 'messages') {
      try {
        this.isLoading = true;

         // Поддержка старого сигнатура: (file, id, modelName, entity?)
        // И нового: (file, { messageId, groupId, modelName, entity })
         let messageId, groupId, modelName, entity
         if (typeof arg2 === 'object') {
             ({ messageId, groupId, modelName, entity = 'messages' } = arg2)
             // fallback на старый ключ:
             if (!groupId && arg2.group_id) groupId = arg2.group_id
         } else {
             messageId = arg2
             entity = arg4
         }

        const response = await axios.get(
          //`${import.meta.env.VITE_APP_ROOT_API}/upload/delete?id=${messageId}&file=${encodeURIComponent(file)}`
            `${import.meta.env.VITE_APP_ROOT_API}/upload/delete?file=${encodeURIComponent(file)}`
        );

        // затем честный рефреш
        if (entity === 'messages') {
          await this.refreshFiles({
            entity: 'messages',
            model_name: modelName,
            group_id: String(groupId),
            message_id: String(messageId)
          })
        } else {
          await this.refreshFiles({
            model_name: modelName,
            model_id: String(messageId), // старый кейс для post, если надо
            entity
          })
        }

        if (response.data) {
          this.files = this.files.filter((it) => it !== file);

          await this.refreshFiles({
            model_name: modelName,
            model_id: String(messageId),
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

        const { model_name, entity = 'post', model_id, group_id, message_id } = params || {};
        if (!model_name) return [];

        // Для messages нужны group_id + message_id
        const query =
        entity === 'messages'
        ? { model_name, entity, group_id, message_id }
        : { model_name, entity, model_id };

           // Валидация для messages
        if (entity === 'messages') {
            if (!group_id || !message_id || String(message_id).trim() === '') {
              console.warn('refreshFiles: skip (no real message_id yet)');
              return [];
            }
            const res = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/upload/list`, {
               params: { model_name, entity, group_id, message_id }
            });
            this.files = res.data || [];
            return this.files;
        }

        if (!model_id) return [];
        const res = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/upload/list`, {
          params: { model_name, model_id, entity }
        });


        this.files = res.data || [];
        return res.data || [];
      } catch (e) {
        console.error('refreshFiles failed:', e);
        throw e;
      }
    }
  }
})

export { useFileStore }

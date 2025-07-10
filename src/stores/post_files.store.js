// post_files.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'

const usePostFileStore = defineStore({
  id: 'post_file',
  state: () => ({
    isLoading: false,
    post_files: []
  }),
  actions: {
    async getPostFiles(id) {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/post_file/post/${id}`
        )

        if (response.data) {
          const postFiles = response.data
          this.post_files = postFiles
        }

        return response.data
      } catch (error) {
        console.error('PostFile get failed:', error)
        throw error
      }
    },
    setPostFiles(files) {
      this.post_files = files
    },
    setEmpty() {
      this.post_files = []
    },
    async uploadFiles(data, post_id, onProgress, signal = null, onComplete = null ) {
      try {
        this.isLoading = true;

        // Сначала загружаем файлы
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/upload`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.lengthComputable) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          },
          signal
        });

        if (response.data) {
          const files = response.data;

          // 🔥 Отправляем add-запросы НЕ ЖДЁМ
          Promise.allSettled(
            files.map(async (f) => {
              const postData = { post_id, url: f };
              try {
                const resp = await axios.post(
                  `${import.meta.env.VITE_APP_ROOT_API}/post_file/add`,
                  postData
                );
                if (resp.data) {
                  this.post_files.push(resp.data);
                }
              } catch (err) {
                console.error('❌ add failed for', f, err);
              }
            })
          ).then(() => {
            console.log('✅ All add requests completed');
          });
        }

        return response.data;
      } catch (error) {
        console.error('File upload failed:', error);
        throw error;
      } finally {
        this.isLoading = false;
        if (onComplete && typeof onComplete === 'function') {
          onComplete();
        }
      }
    },
    async deleteFile(file, id) {
      try {
        this.isLoading = true
        const response = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/post_file/${id}`)
        if (response.data) {
          //const fileDeleteResponse = await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/upload/delete?file=${file}`)
          //if (fileDeleteResponse.data) {
          this.post_files = this.post_files.filter((it) => it.id !== id)
          //this.post_files = this.post_files.filter((it) => it.url !== file)

          //}
        }
        //this.isLoading = false
        return response.data
      } catch (err) {
        console.error('File delete failed: ', err)
        this.isLoading = false
        throw err
      } finally {
        this.isLoading = false;
      }
    },
    async deleteMany(ids) {
      try {
        this.isLoading = true;

        // 1. Удалить записи из post_file
        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/post_file/delete-many`, { ids });

        if (response.data?.success) {
          // 2. Получить URL-ы удаляемых файлов
          //const filesToDelete = this.post_files.filter((file) => ids.includes(file.id));

          // 3. Удалить физические файлы
          // for (const file of filesToDelete) {
          //   try {
          //     await axios.get(`${import.meta.env.VITE_APP_ROOT_API}/upload/delete?file=${file.url}`);
          //   } catch (e) {
          //     console.warn(`⚠️ Ошибка при удалении файла: ${file.url}`, e);
          //   }
          // }

          // 4. Удалить из состояния
          this.post_files = this.post_files.filter((file) => !ids.includes(file.id));
        }

        return true;
      } catch (err) {
        console.error('❌ deleteManyFiles failed:', err);
        return false;
      } finally {
        this.isLoading = false;
      }
    }
  }
})

export { usePostFileStore }

// post_time.store.js
import { defineStore } from 'pinia'
import axios from '../plugin/axios'
//import postInStore from 'simple-vue-validator/src/rule'

const usePostCaptionStore = defineStore({
  id: 'post_caption',
  state: () => ({
    isLoading: false,
    post_captions: []
  }),
  actions: {
    async getPostCaptions(post_id) {
      try {
        console.log(`[🟢 getPostCaptions] post_id: ${post_id}`)
        console.trace('[🔍 getPostCaptions] Call stack trace')
        const response = await axios.get(
          `${import.meta.env.VITE_APP_ROOT_API}/post/${post_id}/post-captions`
        )

        if (response.data) {
          this.post_captions  = response.data??[]
          console.log(`[✅ getPostCaptions] received ${this.post_captions.length} captions`)
        }

        return response.data
      } catch (error) {
        console.error('❌ getPostCaptions  failed:', error)
        throw error
      }
    },

    async addPostCaption(data) {
      try {
        this.isLoading = true
        console.log('[📤 addPostCaption] data:', data)
        const response = await axios.post(
          `${import.meta.env.VITE_APP_ROOT_API}/post_caption/add`,
          data
        )

        if (response.data) {
          const postCaption = response.data
          this.post_captions = [...this.post_captions, postCaption]
          console.log('[✅ addPostCaption] added one caption')
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('❌ addPostCaption add failed:', error)
        this.isLoading = false
        throw error
      }
    },

    async updatePostCaption(data) {
      try {
        this.isLoading = true
        console.log('[📝 updatePostCaption] data:', data)
        const response = await axios.patch(
          `${import.meta.env.VITE_APP_ROOT_API}/post_caption/${data.id}`,
          data
        )

        if (response.data) {
          const postCaption = response.data
          this.post_captions = this.post_captions.map((pc) => {
            if (pc.id === postCaption.id) return postCaption
            return pc
          })
          console.log('[✅ updatePostCaption] updated caption ID:', postCaption.id)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('❌ [updatePostCaption] update failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deletePostCaption(id) {
      try {
        this.isLoading = true
        console.log('[🗑 deletePostCaption] id:', id)
        const response = await axios.delete(`${import.meta.env.VITE_APP_ROOT_API}/post_caption/${id}`)
        if (response.data) {
          this.post_captions = this.post_captions.filter((it) => it.id !== id)
          console.log('[✅ deletePostCaption] deleted caption ID:', id)
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('❌ [deletePostCaption]  delete failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async uploadFiles(data, post_id) {
      try {
        this.isLoading = true
        console.log('[📁 uploadFiles] post_id:', post_id)
        console.log('[📁 uploadFiles] FormData entries:')
        for (let pair of data.entries()) {
          console.log(`   - ${pair[0]}:`, pair[1])
        }

        const response = await axios.post(`${import.meta.env.VITE_APP_ROOT_API}/post_caption/post/${post_id}/upload`, data, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        if (response.data) {
          //  const postCaption = response.data
          // // this.post_captions = [...this.post_captions, ...postCaption]
          // console.error('response.data: ', postCaption)
          // await this.getPostCaptions(post_id)
          console.log('[✅ uploadFiles] Response:', response.data)
          console.log('[⏬ uploadFiles] Calling getPostCaptions(post_id)...')
          await this.getPostCaptions(post_id)
        } else {
          console.warn('[⚠️ uploadFiles] No data returned in response')
        }
        this.isLoading = false
        return response.data
      } catch (error) {
        console.error('❌ [uploadFiles] File upload failed:', error)
        this.isLoading = false
        throw error
      }
    },
    async deleteManyPostCaptions(ids,post_id) {
      console.log('[🗑️ deleteManyPostCaptions] ids:', ids)
      const response = await axios.post(
        `${import.meta.env.VITE_APP_ROOT_API}/post_caption/delete-many`,
        { ids }
      )

      if (response.data) {
        console.log('[✅ deleteManyPostCaptions] result:', response.data)
        //await this.getPostCaptions(this.post_id)
        //await this.getPostCaptions(postInStore.value.id)
        await this.getPostCaptions(post_id)
        return response.data
      }

      throw new Error('Failed to delete captions')
    }
  }
})

export { usePostCaptionStore }

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from '@/lib/toast'
import { ArrowLeft, Check, Eye, ImagePlus, MapPin, Phone, Save, UserRound } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user'
import { CampusMap } from '@/types'
import { IMAGE_FILE_ACCEPT, isSupportedImageFile, uploadImages } from '@/lib/upload'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const avatarFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const originalAvatar = ref('')
const avatarLoadFailed = ref(false)
let avatarPreviewUrl = ''

const form = reactive({
  nickname: '',
  campus: '',
  avatar: '',
  wechat: '',
  phone: '',
})

const campusOptions = Object.entries(CampusMap).map(([value, label]) => ({ value, label }))
const previewCampus = computed(() => {
  const campusId = Number(form.campus)
  return Number.isNaN(campusId) ? form.campus || '尚未选择校区' : CampusMap[campusId] || '尚未选择校区'
})
const previewInitial = computed(() => form.nickname.trim().slice(0, 1) || '喵')
const avatarSource = computed(() => (avatarLoadFailed.value ? '' : form.avatar))

const syncUserInfo = () => {
  const userInfo = userStore.userInfo
  if (!userInfo) return

  form.nickname = userInfo.nickname || ''
  form.campus = userInfo.campus === undefined || userInfo.campus === null ? '' : String(userInfo.campus)
  form.avatar = userInfo.avatar || ''
  originalAvatar.value = userInfo.avatar || ''
  form.wechat = userInfo.contact?.wechat || ''
  form.phone = userInfo.contact?.phone || ''
  avatarLoadFailed.value = false
}

onMounted(syncUserInfo)

const triggerUpload = () => fileInputRef.value?.click()

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!isSupportedImageFile(file)) {
    toast.error('仅支持 JPG 或 PNG 格式图片')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error('图片大小不能超过 5MB')
    return
  }

  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
  avatarFile.value = file
  avatarPreviewUrl = URL.createObjectURL(file)
  form.avatar = avatarPreviewUrl
  avatarLoadFailed.value = false
  toast.success('头像已选择，保存后生效')
}

const handleAvatarError = () => {
  avatarLoadFailed.value = true
}

const handleSave = async () => {
  const nickname = form.nickname.trim()
  const phone = form.phone.trim()
  const wechat = form.wechat.trim()

  if (!nickname || !form.campus || !phone || !wechat) {
    toast.warning('请完整填写昵称、校区和联系方式')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    toast.warning('请输入有效的 11 位手机号')
    return
  }

  loading.value = true
  try {
    const avatarKey = avatarFile.value ? (await uploadImages([avatarFile.value]))[0] : undefined
    await userStore.updateProfile({
      nickname,
      avatar: originalAvatar.value,
      campus: Number(form.campus),
      contact: { phone, wechat },
    }, avatarKey)
    toast.success('资料已保存')
    router.push('/userCenter')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '保存失败，请重试')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  if (window.history.length > 1) router.back()
  else router.push('/userCenter')
}

onBeforeUnmount(() => {
  if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
})
</script>

<template>
  <div class="public-page public-profile-editor min-h-full">
    <header class="profile-editor-header">
      <div class="flex min-w-0 items-start gap-3 sm:gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          class="profile-editor-back shrink-0"
          aria-label="返回个人中心"
          @click="handleCancel"
        >
          <ArrowLeft data-icon="inline-start" />
        </Button>
        <div class="min-w-0">
          <p class="profile-editor-eyebrow">ACCOUNT / PROFILE</p>
          <h1 class="profile-editor-title">编辑个人资料</h1>
          <p class="profile-editor-description">更新你的公开身份信息，让校园里的每次互动都更容易被认出。</p>
        </div>
      </div>
      <div class="profile-editor-header-status" aria-live="polite">
        <Check />
        <span>资料仅对已登录用户可见</span>
      </div>
    </header>

    <form class="profile-editor-layout" @submit.prevent="handleSave">
      <div class="flex min-w-0 flex-col gap-5 sm:gap-6">
        <section class="profile-editor-section">
          <header class="profile-editor-section-header">
            <div class="profile-editor-section-icon profile-editor-section-icon-accent"><UserRound /></div>
            <div>
              <h2>头像与身份</h2>
              <p>选择一张清晰的头像，方便朋友在动态和求助中认出你。</p>
            </div>
          </header>
          <div class="profile-editor-avatar-panel">
            <Avatar class="profile-editor-avatar">
              <AvatarImage v-if="avatarSource" :src="avatarSource" :alt="form.nickname || '用户头像'" @error="handleAvatarError" />
              <AvatarFallback>{{ previewInitial }}</AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <p class="profile-editor-avatar-name truncate">{{ form.nickname || '还没有昵称' }}</p>
              <p class="profile-editor-avatar-meta">JPG / PNG · 最大 5MB</p>
              <input ref="fileInputRef" class="hidden" type="file" :accept="IMAGE_FILE_ACCEPT" @change="handleFileChange" />
              <Button type="button" variant="outline" class="profile-editor-upload mt-4" @click="triggerUpload">
                <ImagePlus data-icon="inline-start" />
                更换头像
              </Button>
            </div>
            <div class="profile-editor-avatar-mark" aria-hidden="true"><Eye /></div>
          </div>
        </section>

        <section class="profile-editor-section">
          <header class="profile-editor-section-header">
            <div class="profile-editor-section-icon"><MapPin /></div>
            <div>
              <h2>基本信息</h2>
              <p>这些内容会出现在你的个人资料和社区互动中。</p>
            </div>
          </header>
          <div class="profile-editor-fields profile-editor-fields-two">
            <label class="profile-editor-field" for="profile-nickname">
              <span>昵称 <b>*</b></span>
              <Input id="profile-nickname" v-model="form.nickname" maxlength="30" autocomplete="nickname" placeholder="例如：爱吃鱼的猫" />
              <small>最多 30 个字符</small>
            </label>
            <label class="profile-editor-field" for="profile-campus">
              <span>所在校区 <b>*</b></span>
              <Select v-model="form.campus">
                <SelectTrigger id="profile-campus" aria-label="选择所在校区">
                  <SelectValue placeholder="请选择校区" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="campus in campusOptions" :key="campus.value" :value="campus.value">
                    {{ campus.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <small>用于匹配附近的校园动态</small>
            </label>
          </div>
        </section>

        <section class="profile-editor-section">
          <header class="profile-editor-section-header">
            <div class="profile-editor-section-icon profile-editor-section-icon-warm"><Phone /></div>
            <div>
              <h2>联系方式</h2>
              <p>仅用于领养申请和 SOS 救援等需要联系你的场景。</p>
            </div>
          </header>
          <div class="profile-editor-fields profile-editor-fields-two">
            <label class="profile-editor-field" for="profile-wechat">
              <span>微信号 <b>*</b></span>
              <Input id="profile-wechat" v-model="form.wechat" maxlength="50" autocomplete="username" placeholder="请输入微信号" />
            </label>
            <label class="profile-editor-field" for="profile-phone">
              <span>手机号 <b>*</b></span>
              <Input id="profile-phone" v-model="form.phone" inputmode="tel" maxlength="11" autocomplete="tel" placeholder="请输入 11 位手机号" />
            </label>
          </div>
        </section>

        <footer class="profile-editor-actions">
          <Button type="button" variant="outline" class="profile-editor-cancel" :disabled="loading" @click="handleCancel">
            返回个人中心
          </Button>
          <Button type="submit" class="profile-editor-save" :disabled="loading">
            <Save data-icon="inline-start" />
            {{ loading ? '保存中...' : '保存资料' }}
          </Button>
        </footer>
      </div>

      <aside class="profile-editor-aside">
        <section class="profile-editor-preview">
          <div class="profile-editor-preview-heading"><span>LIVE PREVIEW</span><Eye /></div>
          <div class="profile-editor-preview-avatar">
            <Avatar class="size-full">
              <AvatarImage v-if="avatarSource" :src="avatarSource" :alt="form.nickname || '预览头像'" @error="handleAvatarError" />
              <AvatarFallback>{{ previewInitial }}</AvatarFallback>
            </Avatar>
          </div>
          <h2 class="profile-editor-preview-name">{{ form.nickname || '你的昵称' }}</h2>
          <p class="profile-editor-preview-campus">{{ previewCampus }}</p>
          <div class="profile-editor-preview-rule" />
          <p class="profile-editor-preview-copy">更新后，其他同学会在你的公开资料卡中看到这些信息。</p>
        </section>
        <section class="profile-editor-tip">
          <p class="profile-editor-tip-label">PROFILE NOTE</p>
          <p>联系方式不会显示在公开个人中心，只会在你主动参与的申请或求助流程中提供给工作人员。</p>
        </section>
      </aside>
    </form>
  </div>
</template>

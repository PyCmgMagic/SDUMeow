import { imageUploadApi } from '@pc/lib/api'
import type { ImageUploadType, PresignedImageUploads } from '@pc/types'

export const IMAGE_FILE_ACCEPT = '.jpg,.png,image/jpeg,image/png'

const getImageUploadType = (file: File): ImageUploadType | null => {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'jpg' || extension === 'png') return extension
  return null
}

export const isSupportedImageFile = (file: File) => Boolean(getImageUploadType(file))

const assertPresignedUploads = (uploads: PresignedImageUploads, fileCount: number) => {
  if (
    !uploads ||
    !Array.isArray(uploads.keys) ||
    !Array.isArray(uploads.uploadUrls) ||
    uploads.keys.length !== fileCount ||
    uploads.uploadUrls.length !== fileCount ||
    uploads.keys.some((key) => typeof key !== 'string' || !key.trim()) ||
    uploads.uploadUrls.some((url) => typeof url !== 'string' || !url.trim())
  ) {
    throw new Error('图片上传地址格式无效，请联系后端检查 /s3/upload-image 响应')
  }
}

export const uploadImages = async (files: File[], authScope: 'user' | 'admin' = 'user'): Promise<string[]> => {
  if (!files.length) return []

  const types: ImageUploadType[] = files.map((file) => {
    const type = getImageUploadType(file)
    if (!type) throw new Error('仅支持 JPG 或 PNG 格式图片')
    return type
  })

  const uploads = await imageUploadApi.prepareImageUploads({ types }, authScope)
  assertPresignedUploads(uploads, files.length)

  await Promise.all(files.map((file, index) =>
    putObjectToPresignedUrl(file, uploads.uploadUrls[index]!),
  ))

  return uploads.keys
}

async function putObjectToPresignedUrl(file: File, uploadUrl: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    credentials: 'omit',
  })

  if (!response.ok) {
    throw new Error(`图片上传失败，HTTP ${response.status}`)
  }
}

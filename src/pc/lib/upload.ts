import COS from 'cos-js-sdk-v5'
import { cosApi } from '@pc/lib/api'
import type { CosImageUploadCredentials, ImageUploadType } from '@pc/types'

export const IMAGE_FILE_ACCEPT = '.jpg,.png,image/jpeg,image/png'

const getImageUploadType = (file: File): ImageUploadType | null => {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'jpg' || extension === 'png') return extension
  return null
}

export const isSupportedImageFile = (file: File) => Boolean(getImageUploadType(file))

const assertCredentials = (credentials: CosImageUploadCredentials, fileCount: number) => {
  const required = [
    credentials.tmpSecretId,
    credentials.tmpSecretKey,
    credentials.sessionToken,
    credentials.bucket,
    credentials.region,
  ]

  if (required.some((value) => !value?.trim()) || credentials.keys.length !== fileCount || credentials.keys.some((key) => !key?.trim())) {
    throw new Error('图片上传凭证格式无效，请联系后端检查 /cos/upload-image 响应')
  }
}

export const uploadImages = async (files: File[], authScope: 'user' | 'admin' = 'user'): Promise<string[]> => {
  if (!files.length) return []

  const types: ImageUploadType[] = files.map((file) => {
    const type = getImageUploadType(file)
    if (!type) throw new Error('仅支持 JPG 或 PNG 格式图片')
    return type
  })

  const credentials = await cosApi.prepareImageUploads({ types }, authScope)
  assertCredentials(credentials, files.length)

  const cos = new COS({
    SecretId: credentials.tmpSecretId,
    SecretKey: credentials.tmpSecretKey,
    SecurityToken: credentials.sessionToken,
  })

  await Promise.all(files.map((file, index) => {
    const key = credentials.keys[index]
    if (!key) throw new Error('图片上传队列异常')

    return cos.putObject({
      Bucket: credentials.bucket,
      Region: credentials.region,
      Key: key,
      Body: file,
      ContentType: file.type || undefined,
    })
  }))

  return credentials.keys
}

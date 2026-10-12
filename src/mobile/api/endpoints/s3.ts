import { apiRequest } from '@/api/client'
import type { ApiResult } from '@/types/api'

export type PrepareUploadPayload = {
  types: string[]
}

type PreparedUploads = {
  keys: string[]
  uploadUrls: string[]
}

function getImageType(file: File): string {
  const extension = file.name.split('.').pop()?.trim().toLowerCase()
  if (extension) {
    return extension === 'jpeg' ? 'jpg' : extension
  }

  const mimeSubtype = file.type.split('/')[1]?.trim().toLowerCase()
  return mimeSubtype ? (mimeSubtype === 'jpeg' ? 'jpg' : mimeSubtype) : 'jpg'
}

export function prepareImageUpload(payload: PrepareUploadPayload): Promise<ApiResult<PreparedUploads>> {
  return apiRequest({ method: 'POST', url: '/s3/upload-image', data: payload })
}

export async function uploadImages(files: File[]): Promise<string[]> {
  return uploadPreparedImages(files)
}

export async function uploadImageKeys(files: File[]): Promise<string[]> {
  return uploadPreparedImages(files)
}

async function uploadPreparedImages(files: File[]): Promise<string[]> {
  if (!files.length) {
    return []
  }

  const preparedResult = await prepareImageUpload({ types: files.map(getImageType) })
  const preparedUploads = preparedResult.data

  if (
    !preparedUploads ||
    !Array.isArray(preparedUploads.keys) ||
    !Array.isArray(preparedUploads.uploadUrls) ||
    preparedUploads.keys.length !== files.length ||
    preparedUploads.uploadUrls.length !== files.length ||
    preparedUploads.keys.some((key) => typeof key !== 'string' || !key.trim()) ||
    preparedUploads.uploadUrls.some((url) => typeof url !== 'string' || !url.trim())
  ) {
    throw new Error('图片上传地址格式无效，请联系后端检查 /s3/upload-image 响应')
  }

  await Promise.all(files.map((file, index) =>
    putObjectToPresignedUrl(file, preparedUploads.uploadUrls[index]!),
  ))
  return preparedUploads.keys
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

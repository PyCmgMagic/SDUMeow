import { useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Form, type FormInstance } from 'antd'

export type DraftKey = 'publish' | 'sos' | 'new-cat' | 'adopt' | 'me-edit'
type Draft = { values: Record<string, unknown>; files: File[] }
const drafts = new Map<DraftKey, Draft>()
const generations = new Map<DraftKey, number>()
let sessionGeneration = 0

export function readDraft(key: DraftKey): Draft {
  return drafts.get(key) ?? { values: {}, files: [] }
}

export function clearDrafts() {
  sessionGeneration += 1
  drafts.clear()
}

export function clearDraft(key: DraftKey) {
  generations.set(key, (generations.get(key) ?? 0) + 1)
  drafts.delete(key)
}

function useDraftWriter(key: DraftKey) {
  const [session] = useState(sessionGeneration)
  const [generation] = useState(generations.get(key) ?? 0)
  return (patch: Partial<Draft>) => {
    if (session !== sessionGeneration || generation !== (generations.get(key) ?? 0)) return
    const previous = readDraft(key)
    drafts.set(key, { ...previous, ...patch, values: { ...previous.values, ...patch.values } })
  }
}

/** 保存字段和 File 本身；预览 URL 由每次挂载的布局重新生成和释放。 */
export function useDraftSnapshot(key: DraftKey, values: Record<string, unknown>, files?: File[]) {
  const write = useDraftWriter(key)
  useLayoutEffect(() => { write({ values, ...(files ? { files } : {}) }) })
}

export function useAntdDraft<T extends object>(
  key: DraftKey,
  form: FormInstance<T>,
  decode: (values: Record<string, unknown>) => Partial<T> = (values) => values as Partial<T>,
  encode: (values: T) => Record<string, unknown> = (values) => ({ ...values } as Record<string, unknown>),
) {
  const [initial] = useState(() => decode(readDraft(key).values))
  const values = Form.useWatch([], { form, preserve: true }) as T | undefined
  const write = useDraftWriter(key)
  const initialized = useRef(false)
  useLayoutEffect(() => {
    form.setFieldsValue(initial as Parameters<FormInstance<T>['setFieldsValue']>[0])
    initialized.current = true
  }, [form, initial])
  useLayoutEffect(() => {
    if (initialized.current && values) write({ values: encode(values) })
  })
  return initial
}

export type DraftMediaItem = { id: string; file: File; dataUrl: string }
export function useDraftMedia(key: DraftKey): [DraftMediaItem[], Dispatch<SetStateAction<DraftMediaItem[]>>] {
  const [files] = useState(() => readDraft(key).files)
  const [items, setItems] = useState<DraftMediaItem[]>([])
  const current = useRef(items)
  const write = useDraftWriter(key)
  useLayoutEffect(() => {
    const restored = files.map((file, index) => ({ id: `restored-${index}`, file, dataUrl: URL.createObjectURL(file) }))
    current.current = restored
    setItems(restored)
    return () => restored.forEach((item) => URL.revokeObjectURL(item.dataUrl))
  }, [files])
  const update: Dispatch<SetStateAction<DraftMediaItem[]>> = (next) => {
    const resolved = typeof next === 'function' ? next(current.current) : next
    current.current = resolved
    write({ files: resolved.map((item) => item.file) })
    setItems(resolved)
  }
  return [items, update]
}

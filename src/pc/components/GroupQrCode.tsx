import { useEffect, useState } from 'react'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '@pc/components/ui/button'
import { communityApi } from '@pc/lib/api'

type QrState = { status: 'loading' | 'ready' | 'error'; url: string }

/** Fetch a fresh signed URL for every retry, including image failures. */
export function GroupQrCode() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<QrState>({ status: 'loading', url: '' })

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let image: HTMLImageElement | undefined
    const fail = () => {
      if (!active) return
      clearTimeout(timer)
      setState({ status: 'error', url: '' })
    }
    setState({ status: 'loading', url: '' })
    void communityApi.getGroupQrCode(controller.signal).then(({ qrcodeUrl }) => {
      if (!active) return
      image = new Image()
      image.onload = () => {
        if (!active) return
        clearTimeout(timer)
        setState({ status: 'ready', url: qrcodeUrl })
      }
      image.onerror = fail
      timer = setTimeout(() => {
        if (image) { image.onload = null; image.onerror = null }
        fail()
      }, 15000)
      image.src = qrcodeUrl
    }).catch(fail)
    return () => {
      active = false
      controller.abort()
      clearTimeout(timer)
      if (image) { image.onload = null; image.onerror = null }
    }
  }, [attempt])

  return (
    <div className="team-qr mx-auto mt-5 w-full max-w-64 overflow-hidden rounded-xl border border-border bg-muted/50 p-2"
      aria-label="加入群聊二维码" aria-busy={state.status === 'loading'}>
      {state.status === 'ready' ? (
        <img src={state.url} alt="加入软件园猫猫群二维码" className="w-full object-contain"
          onError={() => setState({ status: 'error', url: '' })} />
      ) : state.status === 'loading' ? (
        <div className="flex aspect-square flex-col items-center justify-center gap-3 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="size-6 animate-spin" aria-hidden="true" /><p>正在加载二维码…</p>
        </div>
      ) : (
        <div className="flex aspect-square flex-col items-center justify-center gap-4 p-3 text-center">
          <p role="alert" className="text-sm leading-6 text-muted-foreground">二维码加载失败，请重试</p>
          <Button type="button" variant="outline" onClick={() => {
            setState({ status: 'loading', url: '' })
            setAttempt((value) => value + 1)
          }}><RefreshCw className="size-4" aria-hidden="true" />重新加载</Button>
        </div>
      )}
    </div>
  )
}

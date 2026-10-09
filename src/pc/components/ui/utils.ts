import * as React from 'react'

/**
 * Faithful React port of the Vue `<Transition>` wrapper used by the former
 * desktop app. Vue renders no wrapper node, so this hook instead manages the
 * transition classes directly on the rendered element, following Vue's
 * sequence: apply `*-from` + `*-active`, flip to `*-to` on the next frame,
 * then drop all transition classes after the element's own CSS duration.
 */
interface VueTransitionClasses {
  enterActiveClass?: string
  enterFromClass?: string
  enterToClass?: string
  leaveActiveClass?: string
  leaveFromClass?: string
  leaveToClass?: string
}

type Phase = 'hidden' | 'enter-from' | 'enter-to' | 'shown' | 'leave-from' | 'leave-to'

const transitionMs = (element: HTMLElement | null) => {
  if (!element) return 0
  const style = window.getComputedStyle(element)
  const parse = (value: string) =>
    (Number.parseFloat(value) || 0) * (value.trim().endsWith('ms') ? 1 : 1000)
  const durations = (style.transitionDuration || '0s').split(',').map(parse)
  const delays = (style.transitionDelay || '0s').split(',').map(parse)
  return Math.max(...durations.map((duration, i) => duration + (delays[i] ?? 0)), 0)
}

export function useVueTransition(show: boolean, classes: VueTransitionClasses) {
  const [phase, setPhase] = React.useState<Phase>(show ? 'shown' : 'hidden')
  const frameRef = React.useRef<number>(0)
  const timerRef = React.useRef<number>(0)
  const elementRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    const cancelPending = () => {
      cancelAnimationFrame(frameRef.current)
      window.clearTimeout(timerRef.current)
    }

    if (show) {
      cancelPending()
      setPhase('enter-from')
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => setPhase('enter-to'))
      })
      return cancelPending
    }

    cancelPending()
    setPhase((current) => (current === 'hidden' ? current : 'leave-from'))
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = requestAnimationFrame(() => {
        setPhase((current) => (current === 'leave-from' ? 'leave-to' : current))
      })
    })
    return cancelPending
  }, [show])

  React.useEffect(() => {
    if (phase !== 'enter-to' && phase !== 'leave-to') return
    const duration = transitionMs(elementRef.current) || 250
    timerRef.current = window.setTimeout(() => {
      setPhase((current) => (current === 'enter-to' ? 'shown' : current === 'leave-to' ? 'hidden' : current))
    }, duration)
    return () => window.clearTimeout(timerRef.current)
  }, [phase])

  const setElement = React.useCallback((node: HTMLElement | null) => {
    elementRef.current = node
  }, [])

  const join = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ')

  const transitionClass =
    phase === 'enter-from'
      ? join(classes.enterActiveClass, classes.enterFromClass)
      : phase === 'enter-to'
        ? join(classes.enterActiveClass, classes.enterToClass)
        : phase === 'leave-from'
          ? join(classes.leaveActiveClass, classes.leaveFromClass)
          : phase === 'leave-to'
            ? join(classes.leaveActiveClass, classes.leaveToClass)
            : undefined

  return { visible: phase !== 'hidden', transitionClass, setElement }
}

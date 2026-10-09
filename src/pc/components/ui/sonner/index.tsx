import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'

type SonnerProps = ToasterProps

const Toaster = ({
  position = 'top-right',
  ...props
}: SonnerProps) => {
  return (
    <Sonner
      className="toaster group"
      position={position}
      {...props}
      toastOptions={{
        ...(props.toastOptions ?? {}),
        // vue-sonner called this field `classes`; React sonner names it `classNames`.
        classNames: {
          toast:
            'group toast group-[.toaster]:rounded-lg group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:flex group-[.toaster]:items-center group-[.toaster]:py-3 group-[.toaster]:px-4 group-[.toaster]:gap-3 group-[.toaster]:text-sm',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:rounded-md',
          cancelButton: 'group-[.toast]:rounded-md',
          closeButton: 'group-[.toast]:border-border group-[.toast]:bg-background group-[.toast]:text-foreground',
          ...(props.toastOptions?.classNames ?? {}),
        },
      }}
      icons={{
        loading: <Loader2Icon className="animate-spin" />,
        success: <CircleCheckIcon className="text-green-600" />,
        warning: <TriangleAlertIcon className="text-yellow-600" />,
        info: <InfoIcon className="text-blue-600" />,
        error: <OctagonXIcon className="text-red-600" />,
        close: <XIcon />,
        ...(props.icons ?? {}),
      }}
    />
  )
}

export { Toaster }
export type { ToasterProps }

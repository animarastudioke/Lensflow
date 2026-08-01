import * as React from 'react'
import * as ResizablePrimitive from '@radix-ui/react-resizable'
import { GripVertical, GripHorizontal, Grip } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResizablePanelGroupProps extends React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Root> {
  direction?: 'horizontal' | 'vertical'
}

const ResizablePanelGroup = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.Root>,
  ResizablePanelGroupProps
>(({ className, direction = 'horizontal', children, ...props }, ref) => (
  <ResizablePrimitive.Root
    ref={ref}
    dir={direction === 'horizontal' ? 'ltr' : undefined}
    className={cn('flex w-full h-full data-[panel-group-direction=vertical]:flex-col', className)}
    {...props}
  >
    {children}
  </ResizablePrimitive.Root>
))
ResizablePanelGroup.displayName = ResizablePrimitive.Root.displayName

interface ResizablePanelProps extends React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Panel> {
  minSize?: number
  maxSize?: number
}

const ResizablePanel = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.Panel>,
  ResizablePanelProps
>(({ className, minSize, maxSize, ...props }, ref) => (
  <ResizablePrimitive.Panel
    ref={ref}
    className={cn(
      'flex flex-1 overflow-auto data-[panel-selected]:border-border data-[panel-selected]:bg-accent',
      className
    )}
    style={{
      ...props.style,
      flexBasis: props.style?.flexBasis,
      minWidth: minSize,
      maxWidth: maxSize,
      minHeight: minSize,
      maxHeight: maxSize,
    }}
    {...props}
  />
))
ResizablePanel.displayName = ResizablePrimitive.Panel.displayName

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.Handle>,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Handle> & {
    withIndicator?: boolean
  }
>(({ className, withIndicator = true, ...props }, ref) => (
  <ResizablePrimitive.Handle
    ref={ref}
    className={cn(
      'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:w-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[dragging]:bg-border data-[dragging]:text-border data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:h-px data-[panel-group-direction=vertical]:after:w-full',
      className
    )}
    {...props}
  >
    {withIndicator && (
      <div className="flex items-center justify-center">
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      </div>
    )}
  </ResizablePrimitive.Handle>
))
ResizableHandle.displayName = ResizablePrimitive.Handle.displayName

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
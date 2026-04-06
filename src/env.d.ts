/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace JSX {
  interface IntrinsicElements {
    'iconify-icon': any
  }
}

declare module 'astro-icon/components' {
  import type { HTMLAttributes } from 'astro/types'
  export interface IconProps extends HTMLAttributes<'svg'> {
    name: string
    size?: number | string
    width?: number | string
    height?: number | string
    class?: string
    title?: string
  }
  export function Icon(props: IconProps): any
}

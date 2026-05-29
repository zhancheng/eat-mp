/// <reference types="@dcloudio/types" />
/// <reference types="vite/client" />

import './types/global'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

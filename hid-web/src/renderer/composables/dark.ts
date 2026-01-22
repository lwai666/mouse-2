import { ref } from 'vue'
import { usePreferredDark, useToggle } from '@vueuse/core'

// these APIs are auto-imported from @vueuse/core
export const preferredDark = usePreferredDark()
// export const isDark = useDark()
export const isDark = ref(true)
export const toggleDark = useToggle(isDark)

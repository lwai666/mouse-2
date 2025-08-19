import { acceptHMRUpdate, defineStore } from 'pinia'

interface LatestVersionType {
  id: number
  version: string
  url: string
  description: string
  spiFilePath: string
  usbFilePath: string
  uploadDate: string
}

export const useUserStore = defineStore('user', () => {
  /**
   * Current name of the user.
   */
  const savedName = ref('')
  const alertTitle = ref('')
  const mouseButtonStatus = ref<'connecting' | 'normal'>('normal')
  const previousNames = ref(new Set<string>())
  const latestVersion = ref<LatestVersionType>({})

  const usedNames = computed(() => Array.from(previousNames.value))
  const otherNames = computed(() => usedNames.value.filter(name => name !== savedName.value))

  const devices = ref([
    { vendorId: 0x2FE3, productId: 0x0007, name: "鼠标", sendData: 0x0F },
    { vendorId: 0x2FE5, productId: 0x0005, name: "接收器", sendData: 0x18 },
  ])




  /**
   * Changes the current name of the user and saves the one that was used
   * before.
   *
   * @param name - new name to set
   */
  function setNewName(name: string) {
    if (savedName.value)
      previousNames.value.add(savedName.value)

    savedName.value = name
  }

  function setAlertTitle(name: string) {
    alertTitle.value = name
  }

  function setLatestVersion(value: LatestVersionType) {
    latestVersion.value = value
  }

  async function fetchLatestVersion() {
    const res = await fetch(`${import.meta.env.VITE_SERVER_API}/api/latest-version?_${new Date().getTime()}`, { method: 'GET' })
    if (res.status === 200) {
      const data = await res.json()
      setLatestVersion(data)
    }
  }

  return {
    devices,
    alertTitle,
    latestVersion,
    setAlertTitle,
    setLatestVersion,
    mouseButtonStatus,
    savedName,
    setNewName,
    otherNames,
    fetchLatestVersion,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))

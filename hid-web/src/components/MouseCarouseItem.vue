<script setup lang="ts">
const props = withDefaults(defineProps(), { width: '50%' })
const { t } = useI18n()
const language = inject('language')
// const transport = inject<Ref<TransportWebHIDInstance>>('transport');

watch(() => language, () => {
  // const constants = useConstants(t)
  // const data = constants.mouseKeyOptions.find(item => item.value === 1999)
  // data?.children?.forEach((item, index) => {
  //   item.label = profileInfo?.macroList[index]?.name
  // })
  // options.value = deepClone(constants.mouseKeyOptions)
}, { immediate: true, deep: true })
</script>

<template>
  <div class="w-100% flex items-center justify-between" style="flex-direction: column;margin-top: 20px;">
    <div class="mb-10px flex items-center justify-between" style="width: 81%;">
      <img src="/public/mouseCarouseItem/1.png" alt="" srcset="">
      <img style="height: 1px;width: 320px;" src="/public/mouseCarouseItem/line.png" alt="" srcset="">
      <img src="/public/mouseCarouseItem/2.png" alt="" srcset="">
      <img style="height: 1px;width: 320px;" src="/public/mouseCarouseItem/line.png" alt="" srcset="">
      <img src="/public/mouseCarouseItem/3.png" alt="" srcset="">
      <img style="height: 1px;width: 320px;" src="/public/mouseCarouseItem/line.png" alt="" srcset="">
      <img src="/public/mouseCarouseItem/4.png" alt="" srcset="">
    </div>
    <div class="flex justify-between" style="width: 100%;margin-top: 20px;">
      <div class="flex items-center" style="flex-direction: column;width: 330px;">
        <img src="/public/mouseCarouseItem/icon1_new.png" alt="" srcset="" style="height: 142px;">
        <div style="margin-top: 38px;">
          <p>{{ t('description.click_to_add_device') }}</p>
        </div>
      </div>
      <div class="flex items-center" style="flex-direction: column;width: 330px;">
        <img src="/public/mouseCarouseItem/icon2_new.png" alt="" srcset="" style="height: 142px;">

        <div
          style="margin-top: 38px;align-self: flex-start;margin-left: 20px;"
        >
          <p>{{ t('description.click_to_select_device') }}</p>
        </div>
      </div>
      <div class="flex items-center" style="flex-direction: column;width: 330px;">
        <img src="/public/mouseCarouseItem/icon3_new.png" alt="" srcset="">

        <div style="margin-top: 26px;align-self: flex-start;margin-left: 80px;">
          <p>{{ t('description.click_to_connect_device') }}</p>
        </div>
      </div>
      <div class="flex items-center" style="flex-direction: column;width: 330px;">
        <img src="/public/mouseCarouseItem/icon4_new.png" alt="" srcset="" style="height: 142px;">

        <div style="margin-top: 38px;">
          <p>{{ t('description.click_to_enter_settings') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>

</style>

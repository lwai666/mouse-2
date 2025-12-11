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
  <div   class="w-100% flex justify-between items-center" style="flex-direction: column;margin-top: 20px;">
    <div class="flex justify-between items-center mb-10px" style="width: 70%;">
        <img src="/public/mouseCarouseItem/1.png" alt="" srcset="">
        <img style="height: 1px;" src="/public/mouseCarouseItem/line.png" alt="" srcset="">
        <img src="/public/mouseCarouseItem/2.png" alt="" srcset="">
        <img style="height: 1px;" src="/public/mouseCarouseItem/line.png" alt="" srcset="">
        <img src="/public/mouseCarouseItem/3.png" alt="" srcset="">
    </div>
    <div class="flex justify-between" style="width: 86%;margin-top: 20px;">
      <div class="flex justify-between items-center" style="flex-direction: column;width: 300px;">
          <div style="margin-bottom: 5px;">
            <p >{{ t('description.mouse_pairing_instructions1') }}</p>
            <p >({{ t('description.mouse_pairing_instructions1_sub') }})</p>
          </div>
          <img src="/public/mouseCarouseItem/icon1.png" alt="" srcset="">
      </div>

      <div  class="flex justify-between items-center" style="flex-direction: column;width: 300px;">
        <div style="margin-bottom: 5px;">
          <p >{{ t('description.mouse_pairing_instructions2') }}</p>
          <p style="margin-bottom: 5px;">{{ t('description.mouse_pairing_instructions2_sub') }}</p>
        </div>
          
          <img src="/public/mouseCarouseItem/icon2.png" alt="" srcset="">
      </div>
      <div  class="flex justify-between items-center" style="flex-direction: column;width: 300px;">
        <div style="margin-bottom: 5px;">
          <p >{{ t('description.mouse_pairing_instructions3') }}</p>
          <p style="margin-bottom: 5px;">{{ t('description.mouse_pairing_instructions3_sub') }}</p>
        </div>

          
          <img src="/public/mouseCarouseItem/icon3.png" alt="" srcset="">
      </div>
    </div>
  </div>
</template>

<style>

</style>

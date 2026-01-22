<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { base64ToJson, jsonToBase64, removeAt9th } from '~/renderer/utils';


interface Props {
  value: Record<string, any>
  currentProfileIndex: number
  profileList: Array<{ title: string, base64: string }>
}

const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits<{
  (e: 'change', value: any): void
  (e: 'mouseenterShare'): void
}>();

const currentProfileIndex = ref<number>(0)

watch(() => props.currentProfileIndex, () => {
  currentProfileIndex.value = props.currentProfileIndex
})

const profileList = ref([
  { title: 'Profile 1', base64: '' },
  { title: 'Profile 2', base64: '' },
  { title: 'Profile 3', base64: '' },
  { title: 'Profile 4', base64: '' },
])

watch(props.profileList, () => {
  console.log('props.profileList changed:', props.profileList);
  profileList.value = props.profileList
})

// watch(props.value, () => {
//   profileList.value[currentProfileIndex.value].base64 = jsonToBase64(props.value)
// })

// onMounted(() => {
//   const savedProfiles = localStorage.getItem('profileList');
//   if (savedProfiles) {
//     profileList.value = JSON.parse(savedProfiles);
//   }
// })

// watch(profileList, (newValue) => {
//   localStorage.setItem('profileList', JSON.stringify(newValue));
// }, { deep: true });


function onClick(index: number) {
  console.log('ProfileItem clicked:', index);
  if (index === currentProfileIndex.value) { return }
  currentProfileIndex.value = index
  onChange(index)
}

function onChange(index?: number) {
  let profileInfo = '';
  try {
    profileInfo = base64ToJson(removeAt9th(profileList.value[currentProfileIndex.value].base64));

    console.log('profileInfo in ProfileList:', profileList.value, profileInfo,currentProfileIndex.value);
  } catch (e) {
    // console.error("格式错误=======", e)
  }
  emit('change', { profileInfo, index })
}
</script>

<template>
  <ProfileItem
    v-for="(profile, index) of profileList" :key="index"
    class="w-full h-25%"
    v-model="profile.base64"
    v-model:title="profile.title"
    :index="index"
    :active="currentProfileIndex === index"
    @click="onClick"
    @change="onChange"
    @mouseenterShare="emit('mouseenterShare')"
  />
</template>

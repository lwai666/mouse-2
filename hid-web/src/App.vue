<script setup lang="ts">
// https://github.com/vueuse/head
// you can use this to manipulate the document head in any components,
// they will be rendered correctly in the html results with vite-ssg
useHead({
  title: 'Scyrox',
  meta: [
    { name: 'description', content: 'Opinionated Vite Starter Template wx shunyue1321' },
    { name: 'author', content: 'GitHub shunyue1320' },
    { name: 'author wx', content: 'shunyue1321' },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      // href: () => '/favicon.ico',
      href: () => preferredDark.value ? '/favicon-dark.ico' : '/favicon.ico',
    },
  ],
})
</script>

<template>
  <RouterView />
</template>

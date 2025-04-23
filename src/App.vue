<script setup>
import Sidebar from "./components/buttons/Sidebar.vue";
export default {
  components: {
    Sidebar,
  },
};
</script>

<template>
  <RouterView />
  <Sidebar />
</template>

<style scoped></style>

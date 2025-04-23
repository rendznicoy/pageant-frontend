<script>
import { ref } from "vue";
import { collapsed, toggleCollapsed, sidebarWidth } from "../../state";

export default {
  props: {},
  setup() {
    return {
      collapsed,
      toggleCollapsed,
      sidebarWidth,
    };
  },
};
</script>
<template>
  <div class="sidebar" :style="{ width: sidebarWidth }">
    <span class="collapse-icon" @click="toggleSidebar"></span>
    <i class=""></i>
  </div>
</template>

<style>
:root {
  --sidebar-bg-color: #f2f2f2;
  --sidebar-item-hover: #ffffff;
  --sidebar-item-active: #004400;
}
</style>

<style scoped>
.sidebar {
  color: white;
  background-color: var(--sidebar-bg-color);

  float: left;
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  bottom: 0;
  padding: 0.5em;

  transition: 0.3s ease;

  display: flex;
  flex-direction: column;
}
</style>

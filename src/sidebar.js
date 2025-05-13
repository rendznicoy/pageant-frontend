import { defineStore } from "pinia";
import { ref } from "vue";

export const useSidebarStore = defineStore("sidebar", () => {
  const isOpen = ref(false); // Sidebar closed by default
  const toggle = () => (isOpen.value = !isOpen.value);
  return { isOpen, toggle };
});

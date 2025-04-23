import { ref, computed } from "vue";

export const collapsed = ref(false);
export const toggleCollapsed = () => (collapsed.value = !collapsed.value);

export const SIDEBAR_WIDTH = 360;
export const SIDEBAR_WIDTH_COLLAPSED = 76;
export const sidebarWidth = computed(
  () => `${collapsed.value ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH}px`
);

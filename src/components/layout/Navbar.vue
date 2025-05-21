<script setup>
import { ref } from "vue";
import { onMounted } from "vue";
import { useUserStore } from "@/stores/user";
import Notifications from "../shared/Notifications.vue";
import { useSidebarStore } from "../../sidebar";

const isRefreshing = ref(false);
const sidebar = useSidebarStore();
const userStore = useUserStore();
const emit = defineEmits(["refresh-dashboard"]);

const toggleSidebar = () => {
  sidebar.toggle();
  console.log("Navbar toggled sidebar, isOpen:", sidebar.isOpen); // Debug log
};

const handleRefreshDashboard = () => {
  isRefreshing.value = true;
  emit("refresh-dashboard");
  setTimeout(() => (isRefreshing.value = false), 1000); // Simulate animation duration
};

onMounted(() => {
  userStore.fetchUser();
});
</script>

<template>
  <div class="flex flex-col">
    <!-- Main Navbar -->
    <div
      class="flex items-center justify-between py-3 px-6 bg-green-900 text-white border-t border-green-800"
    >
      <!-- Left side (burger icon) -->
      <div class="flex items-center">
        <button
          @click="toggleSidebar"
          class="focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          <div class="burger-container">
            <div class="burger-icon" :class="{ active: sidebar.isOpen }">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.burger-container {
  width: 30px;
  height: 20px;
  position: relative;
  cursor: pointer;
}

.burger-icon {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.3s ease;
}

.burger-icon span {
  display: block;
  position: absolute;
  height: 2px;
  width: 100%;
  background: white;
  border-radius: 2px;
  opacity: 1;
  left: 0;
  transform: rotate(0deg);
  transition: 0.25s ease-in-out;
}

.burger-icon span:nth-child(1) {
  top: 0px;
}

.burger-icon span:nth-child(2) {
  top: 9px;
}

.burger-icon span:nth-child(3) {
  top: 18px;
}

.burger-icon.active span:nth-child(1) {
  top: 9px;
  transform: rotate(45deg);
}

.burger-icon.active span:nth-child(2) {
  opacity: 0;
}

.burger-icon.active span:nth-child(3) {
  top: 9px;
  transform: rotate(-45deg);
}
</style>

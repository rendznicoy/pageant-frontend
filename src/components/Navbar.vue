<script setup>
import { onMounted, ref } from "vue";
import axiosClient from "../axios";
import Menubar from "./buttons/Menubar.vue";
import Notifications from "./buttons/Notifications.vue";
import { useSidebarStore } from "../sidebar";

const user = ref(null);
const sidebar = useSidebarStore();

const toggleSidebar = () => {
  sidebar.toggle();
};

onMounted(() => {
  axiosClient.get("/api/v1/user").then((response) => {
    user.value = response.data;
  });
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

      <!-- Center (contact info) -->
      <div class="items-center hidden md:block">
        <i class="fas fa-phone mr-2"></i>
        <span>Call us : Smart - 09991980065</span>
        <i class="fas fa-envelope ml-8 mr-2"></i>
        <span
          >E-mail :
          <a
            href="mailto:vpageantscoringsystem@gmail.com"
            class="hover:underline"
          >
            vpageantscoringsystem@gmail.com
          </a>
        </span>
      </div>

      <!-- Right side -->
      <div class="flex items-center space-x-4" v-if="user">
        <!-- Notifications -->
        <Notifications />
        <!-- Chat / Messages - DISABLED -->
        <div class="relative group" title="Messages are under maintenance.">
          <i
            class="fas fa-comment-dots text-xl text-gray-400 cursor-not-allowed"
          ></i>
        </div>

        <!-- Profile Menu -->
        <div v-if="user">
          <Menubar :user="user" />
        </div>
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

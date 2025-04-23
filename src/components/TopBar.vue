<script setup>
import { ref } from "vue";
import SideBar from "./buttons/Sidebar.vue";

const isSidebarOpen = ref(false);
</script>
<template>
  <div class="flex min-h-screen">
    <SideBar v-model="isSidebarOpen" />

    <!-- Main Content -->
    <div class="flex-1 w-full">
      <!-- Top Nav -->
      <div
        class="bg-green-900 text-white py-2 px-4 flex justify-between items-center"
      >
        <button
          @click="isSidebarOpen = !isSidebarOpen"
          class="text-white text-2xl focus:outline-none"
        >
          <svg
            v-if="!isSidebarOpen"
            xmlns="http://www.w3.org/2000/svg"
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span v-else class="text-2xl">✕</span>
        </button>
        <span>
          📞 Call us : Globe - 09158668124 | Smart - 09619601809 📧
          elearning.support@vsu.edu.ph
        </span>
      </div>

      <main class="p-6">
        <h1 class="text-2xl font-bold text-green-800">
          Welcome to your Admin Dashboard
        </h1>
      </main>
    </div>
  </div>
</template>

<style scoped></style>

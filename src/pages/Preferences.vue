<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const goToDashboard = () => {
  router.push("/admin/dashboard");
};
</script>
<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Temporary Logout Button -->
    <div class="absolute top-4 right-4">
      <button
        @click="goToDashboard"
        class="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none transition-colors"
      >
        <i class="fas fa-sign-out-alt mr-2"></i>
        Dashboard
      </button>
    </div>

    <!-- Placeholder for Tabulator Dashboard Content -->
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-800">Preferences</h1>
      <p class="mt-4 text-gray-600">Welcome to Prefences Page.</p>
      <!-- Add your existing dashboard content here -->
    </div>
  </div>
</template>

<style lang="scss" scoped></style>

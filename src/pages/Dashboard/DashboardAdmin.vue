<script setup>
import { useRouter } from "vue-router";
import axiosClient from "../../axios";

const router = useRouter();

function logout() {
  axiosClient
    .post("/api/v1/logout")
    .then(() => {
      /*       document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
      document.cookie = "laravel_session=; Max-Age=0; path=/"; */
      router.push("/login/admin");
    })
    .catch((error) => {
      console.error("Logout error:", error);
      router.push("/login/admin"); // Still redirect even if API call fails
    });
}
</script>
<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <div class="flex items-center">
            <button @click="logout" class="text-gray-600 hover:text-gray-900">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main class="py-10">
      <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <!-- Dashboard content goes here -->
        <div class="px-4 py-8 sm:px-0">
          <h2 class="text-2xl font-bold mb-4">
            Welcome to the Admin Dashboard
          </h2>
          <p>You have successfully logged in!</p>
        </div>
      </div>
    </main>
  </div>
</template>

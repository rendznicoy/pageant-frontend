<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import axiosClient from "../../axios";
import GuestLayout from "../../components/GuestLayout.vue";

const router = useRouter();

const data = ref({
  pin_code: "",
});

function handleLogin() {
  axiosClient.get("/api/csrf-cookie").then(() => {
    axiosClient
      .post("/api/v1/login", {
        pin_code: data.value.pin_code,
        remember: data.value.remember,
      })
      .then((response) => {
        if (response.status === 200) {
          router.push("/judge/dashboard");
        }
      })
      .catch((error) => {
        console.error("Login error:", error);
      });
  });
}
</script>

<template>
  <GuestLayout>
    <form @submit.prevent="handleLogin" class="mt-16 space-y-8">
      <div>
        <input
          type="text"
          id="pin_code"
          name="pin_code"
          placeholder="Judge PIN Code"
          class="shadow-sm block w-full sm:text-sm border border-gray-400 rounded-sm h-8 focus:outline-green-400 pl-4 py-2 px-3"
          required
          v-model="data.pin_code"
        />
      </div>
      <div>
        <button
          type="submit"
          class="w-full flex justify-center py-2 px-8 border border-transparent rounded-sm shadow-sm text-sm font-bold text-gray-900 bg-yellow-300 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600"
        >
          Log in as Judge
        </button>
      </div>

      <div class="mt-3 text-center text-sm">
        <a
          href="/login/admin"
          class="font-medium text-green-700 hover:text-orange-600 hover:underline"
        >
          Are you an Admin or Tabulator?
        </a>
      </div>
    </form>
  </GuestLayout>
</template>

<style scoped></style>

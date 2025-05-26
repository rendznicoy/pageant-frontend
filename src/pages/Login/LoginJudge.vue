<script setup>
import { ref, nextTick, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useDarkModeStore } from "@/stores/darkMode";
import axiosClient from "../../axios";
import GuestLayout from "../../components/layout/GuestLayout.vue";
import { debounce } from "lodash"; // Import lodash debounce

const router = useRouter();
const userStore = useUserStore();
const darkModeStore = useDarkModeStore();
const pinInputs = Array.from({ length: 6 }, () => ref(""));
const inputRefs = ref([]);
const error = ref("");
const isLoading = ref(false);
const formSubmitted = ref(false);

const isDarkMode = computed(() => darkModeStore.isDarkMode);

// Debounced login function
const debouncedHandleJudgeLogin = debounce(async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  const pin_code = pinInputs.map((r) => r.value).join("");
  error.value = "";
  try {
    console.log("Skipping CSRF for judge login");
    console.log(axiosClient.defaults.headers.common["Authorization"]);

    const response = await axiosClient.post(
      "/api/v1/login/judge",
      { pin_code },
      { withCredentials: false }
    );

    const { token, user } = response;
    if (!user || !token) throw new Error("Incomplete login response");

    localStorage.setItem("token", token);
    localStorage.setItem("judgeSession", "true");

    axiosClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    userStore.setUser(user);

    console.log("Redirecting to judge dashboard...");
    await router.push("/judge/dashboard");
  } catch (err) {
    error.value =
      err.response?.data?.message || "Invalid PIN. Please try again.";
    console.error("Judge login error:", err);
  } finally {
    isLoading.value = false;
  }
}, 300);

function handleInput(index, event) {
  const value = event.target.value.toUpperCase().slice(0, 1);
  pinInputs[index].value = value;
  if (value && index < 5) {
    inputRefs.value[index + 1]?.focus();
  }
}

function handleKeydown(index, event) {
  if (event.key === "Backspace" && !pinInputs[index].value && index > 0) {
    inputRefs.value[index - 1]?.focus();
  }
}

function handlePaste(event) {
  const pasted = event.clipboardData.getData("text").toUpperCase().slice(0, 6);
  [...pasted].forEach((char, idx) => {
    pinInputs[idx].value = char;
  });
  nextTick(() => {
    inputRefs.value[Math.min(pasted.length, 5)]?.focus();
  });
  event.preventDefault();
}

function handleJudgeLogin() {
  formSubmitted.value = true;

  // Check if all PIN fields are filled
  const pin_code = pinInputs.map((r) => r.value).join("");
  if (pin_code.length < 6) {
    error.value = "Please enter all 6 characters of your PIN.";
    return;
  }

  debouncedHandleJudgeLogin();
}

function redirectToAdminLogin() {
  router.push("/login/admin");
}
// Reset form validation when user starts typing
const resetValidation = () => {
  if (formSubmitted.value && pinInputs.every((input) => input.value)) {
    formSubmitted.value = false;
    error.value = "";
  }
};

// Watch for changes in PIN inputs to reset validation
pinInputs.forEach((input, index) => {
  input.watch?.(() => resetValidation());
});

onMounted(() => {
  // Focus on first input
  if (inputRefs.value[0]) {
    inputRefs.value[0].focus();
  }
});
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-x-hidden overflow-y-auto transition-colors duration-300"
    :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-100'"
  >
    <!-- Show loading overlay -->
    <div
      v-if="isLoading"
      class="fixed inset-0 backdrop-blur-md bg-opacity-50 flex justify-center items-center z-50"
    >
      <div
        class="rounded-lg p-8 flex flex-col items-center shadow-lg transition-colors duration-300"
        :class="isDarkMode ? 'bg-gray-800' : 'bg-white'"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2"
          :class="isDarkMode ? 'border-yellow-400' : 'border-yellow-500'"
        ></div>
        <span
          class="mt-4 transition-colors duration-300"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
        >
          Verifying PIN...
        </span>
      </div>
    </div>

    <!-- Main login card -->
    <div
      class="max-w-md w-full rounded-xl shadow-lg p-8 transition-colors duration-300"
      :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
    >
      <!-- Logo/Icon -->
      <div class="flex justify-center">
        <a href="/">
          <img
            class="h-20 mb-8 w-auto"
            src="/logoFI.png"
            alt="Visayas State University Logo"
          />
        </a>
      </div>

      <!-- Title -->
      <div class="text-center mb-8">
        <h2
          class="text-2xl font-semibold mb-2 transition-colors duration-300"
          :class="isDarkMode ? 'text-white' : 'text-black'"
        >
          Judge Login
        </h2>
        <p
          class="text-sm transition-colors duration-300"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        >
          Enter your 6-character PIN to access the judging panel
        </p>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="border px-4 py-3 rounded-lg mb-6 transition-colors duration-300"
        :class="
          isDarkMode
            ? 'bg-red-900/20 border-red-700 text-red-400'
            : 'bg-red-100 border-red-300 text-red-800'
        "
        role="alert"
      >
        <div class="flex items-center">
          <i class="fas fa-exclamation-circle mr-2"></i>
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- PIN Form -->
      <form @submit.prevent="handleJudgeLogin" class="space-y-6">
        <!-- PIN Input Label -->
        <div>
          <label
            class="block text-sm font-medium mb-4 transition-colors duration-300"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-800'"
          >
            Enter Your PIN
          </label>

          <!-- PIN Input Fields -->
          <div class="flex justify-center gap-3 mb-6" @paste="handlePaste">
            <input
              v-for="(input, index) in pinInputs"
              :key="index"
              type="text"
              maxlength="1"
              :class="[
                'w-12 h-14 text-center text-xl uppercase font-semibold rounded-lg focus:outline-none focus:ring-2 transition-all duration-300',
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-yellow-400 focus:border-yellow-400 hover:border-gray-500'
                  : 'bg-white border-gray-400 text-gray-900 focus:ring-yellow-500 focus:border-yellow-500 hover:border-gray-500',
                !pinInputs[index].value && formSubmitted
                  ? isDarkMode
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-red-400 bg-red-100'
                  : 'border',
              ]"
              v-model="pinInputs[index].value"
              @input="handleInput(index, $event)"
              @keydown="handleKeydown(index, $event)"
              ref="inputRefs"
            />
          </div>

          <!-- PIN Validation Error -->
          <div
            v-if="formSubmitted && pinInputs.some((input) => !input.value)"
            class="flex items-center mt-2 transition-colors duration-300"
            :class="isDarkMode ? 'text-red-400' : 'text-red-600'"
          >
            <i class="fas fa-exclamation-triangle mr-1 text-sm"></i>
            <span class="text-sm">Please fill in all PIN characters</span>
          </div>
        </div>

        <!-- Login Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold flex items-center justify-center"
          :class="
            isDarkMode
              ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 focus:ring-yellow-400 focus:ring-offset-gray-800'
              : 'bg-yellow-400 text-gray-900 hover:bg-yellow-500 focus:ring-yellow-500 focus:ring-offset-2'
          "
        >
          <span v-if="!isLoading">Sign In as Judge</span>
          <span v-else class="flex items-center justify-center">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            Verifying PIN...
          </span>
        </button>
      </form>

      <!-- Divider -->
      <div class="mt-8">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div
              class="w-full border-t transition-colors duration-300"
              :class="isDarkMode ? 'border-gray-600' : 'border-gray-400'"
            ></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span
              class="px-2 transition-colors duration-300"
              :class="
                isDarkMode
                  ? 'bg-gray-800 text-gray-400'
                  : 'bg-white text-gray-600'
              "
            >
              Other login options
            </span>
          </div>
        </div>
      </div>

      <!-- Alternative Login Options -->
      <div class="mt-6 space-y-3">
        <!-- Admin/Tabulator Login -->
        <button
          @click="redirectToAdminLogin"
          class="w-full flex items-center justify-center px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300"
          :class="
            isDarkMode
              ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600 focus:ring-green-400 focus:ring-offset-gray-800'
              : 'border-gray-400 bg-white text-gray-800 hover:bg-gray-100 focus:ring-green-600 focus:ring-offset-2'
          "
        >
          <i class="fas fa-users-cog mr-3 text-green-600"></i>
          <span class="font-medium">Sign in as Admin/Tabulator</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* PIN Input Focus Effects */
input:focus {
  transform: scale(1.05);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.3);
}

/* Error state for PIN inputs */
input.border-red-400,
input.border-red-500 {
  border-width: 2px !important;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.3) !important;
}

/* Dark mode error state */
.dark input.border-red-500 {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3) !important;
}

/* Button hover effects */
button:hover:not(:disabled) {
  transform: translateY(-1px);
}

button:active:not(:disabled) {
  transform: translateY(0);
}

/* Smooth transitions */
* {
  transition: background-color 0.3s ease, border-color 0.3s ease,
    color 0.3s ease;
}

/* Loading spinner animation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.fa-spin {
  animation: spin 1s linear infinite;
}
</style>

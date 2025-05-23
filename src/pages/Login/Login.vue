<script setup>
import { useRouter } from "vue-router";
import { ref, watch, onMounted } from "vue";
import { useUserStore } from "@/stores/user";
import { useRoleRouter } from "@/stores/role";
import axiosClient from "@/axios";

const router = useRouter();
const userStore = useUserStore();

const data = ref({
  username: "",
  password: "",
  remember: false,
});

const loginError = ref("");
const isSubmitting = ref(false);
const isCheckingAuth = ref(false);
const showCookieModal = ref(false);
const formSubmitted = ref(false);
const showPassword = ref(false);
const { redirectToDashboard } = useRoleRouter();

async function handleLogin(event) {
  event.preventDefault(); // Ensure form submission is fully controlled
  formSubmitted.value = true;

  // Client-side validation
  if (!data.value.username || !data.value.password) {
    loginError.value = "Please fill in both username and password.";
    // Prevent browser from autofocusing the first invalid field
    document.activeElement.blur();
    return; // Don't submit if fields are empty
  }

  loginError.value = "";
  isSubmitting.value = true;
  isCheckingAuth.value = true;

  try {
    await axiosClient.get("/api/csrf-cookie");

    const response = await axiosClient.post("/api/v1/login", {
      username: data.value.username,
      password: data.value.password,
      remember: data.value.remember,
    });

    const user = response?.data?.user;

    if (!user) {
      loginError.value = "Unexpected response format. Please try again.";
      return;
    }

    if (data.value.remember) {
      localStorage.setItem("remembered", data.value.username);
    } else {
      localStorage.removeItem("remembered");
    }

    userStore.setUser(user);

    if (user.role) {
      try {
        redirectToDashboard(user.role);
      } catch (err) {
        loginError.value = "Invalid user role. Please contact support.";
      }
    } else {
      loginError.value = "User role not found. Please contact support.";
    }
  } catch (error) {
    if (error.response?.status === 401) {
      loginError.value = "Invalid username or password.";
    } else if (error.response?.data?.message) {
      loginError.value = error.response.data.message;
    } else {
      loginError.value = "Login failed. Please try again.";
    }
    console.error("Login error:", error);
  } finally {
    isSubmitting.value = false;
    isCheckingAuth.value = false;
  }
}

function redirectToJudgeLogin() {
  router.push("/login/judge");
}

function handleGoogleLogin() {
  isCheckingAuth.value = true; // Show checking authentication for Google login
  window.location.href =
    axiosClient.defaults.baseURL + "/api/v1/auth/google/redirect";
}

function handleCookieIconClick() {
  showCookieModal.value = true;
}

function closeCookieModal() {
  showCookieModal.value = false;
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}

onMounted(async () => {
  // Check for remembered username first
  const remembered = localStorage.getItem("remembered");
  if (remembered) {
    data.value.username = remembered;
    data.value.remember = true;
  }

  // Check if user is already logged in (silent check, no loading state)
  try {
    const isLoggedIn = await userStore.fetchUser();
    if (isLoggedIn && userStore.user) {
      // Immediately redirect without showing the form
      if (userStore.user.role) {
        try {
          redirectToDashboard(userStore.user.role);
          return; // Exit early, don't continue with the rest
        } catch (err) {
          loginError.value = "Invalid user role. Please contact support.";
        }
      } else {
        loginError.value = "User role not found. Please contact support.";
      }
    }
  } catch (error) {
    console.info("User not authenticated");
  }

  // Check for URL error parameters
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");

  if (error === "only_vsu_emails") {
    loginError.value = "Only @vsu.edu.ph email addresses are allowed.";
  } else if (error === "google_auth_failed") {
    loginError.value = "Google authentication failed. Please try again.";
  }
});

watch(
  () => data.value.remember,
  (newVal) => {
    if (newVal && data.value.username) {
      localStorage.setItem("remembered", data.value.username);
    } else if (!newVal) {
      localStorage.removeItem("remembered");
    }
  }
);

// Watch username change to update remembered storage
watch(
  () => data.value.username,
  (newVal) => {
    if (data.value.remember && newVal) {
      localStorage.setItem("remembered", newVal);
    }
  }
);

// Reset form validation when user starts typing
watch([() => data.value.username, () => data.value.password], () => {
  if (formSubmitted.value && data.value.username && data.value.password) {
    formSubmitted.value = false;
  }
});
</script>

<template>
  <div
    class="min-h-screen bg-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-x-hidden overflow-y-auto"
  >
    <!-- Show checking authentication overlay after login attempts -->
    <div
      v-if="isCheckingAuth"
      class="fixed inset-0 backdrop-blur-md bg-opacity-50 flex justify-center items-center z-50"
    >
      <div class="bg-white rounded-lg p-8 flex flex-col items-center shadow-lg">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"
        ></div>
        <span class="mt-4 text-gray-700">Checking authentication...</span>
      </div>
    </div>

    <!-- Main login card -->
    <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
      <!-- Logo/Icon -->
      <div class="flex justify-center">
        <a href="/">
          <img
            class="h-20 w-auto"
            src="/PSV.png"
            alt="Visayas State University Logo"
          />
        </a>
      </div>

      <!-- Title -->
      <h2 class="text-2xl font-semibold text-black text-center mb-8">
        Sign in to your account
      </h2>

      <!-- Error Message -->
      <div
        v-if="loginError"
        class="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6"
        role="alert"
      >
        <div class="flex items-center">
          <i class="fas fa-exclamation-circle mr-2"></i>
          <span>{{ loginError }}</span>
        </div>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-6" autocomplete="off">
        <!-- Username Field -->
        <div>
          <label
            for="username"
            class="block text-sm font-medium text-gray-800 mb-2"
          >
            Username
          </label>
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <i class="fas fa-user text-gray-500"></i>
            </div>
            <input
              id="username"
              type="text"
              v-model="data.username"
              placeholder="Enter your username"
              required
              autocomplete="off"
              :class="[
                'w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all duration-300',
                !data.username && formSubmitted
                  ? 'border-red-400 bg-red-100'
                  : 'border-gray-400 hover:border-gray-500',
              ]"
            />
          </div>
          <div
            v-if="!data.username && formSubmitted"
            class="text-red-600 text-sm mt-1 flex items-center"
          >
            <i class="fas fa-exclamation-triangle mr-1"></i>
            Username is required
          </div>
        </div>

        <!-- Password Field -->
        <div>
          <label
            for="password"
            class="block text-sm font-medium text-gray-800 mb-2"
          >
            Password
          </label>
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <i class="fas fa-lock text-gray-500"></i>
            </div>
            <input
              id="password"
              :type="showPassword ? 'text' : 'password'"
              v-model="data.password"
              placeholder="Enter your password"
              required
              autocomplete="off"
              :class="[
                'w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all duration-300',
                !data.password && formSubmitted
                  ? 'border-red-400 bg-red-100'
                  : 'border-gray-400 hover:border-gray-500',
              ]"
            />
            <button
              type="button"
              @click="togglePasswordVisibility"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
          <div
            v-if="!data.password && formSubmitted"
            class="text-red-600 text-sm mt-1 flex items-center"
          >
            <i class="fas fa-exclamation-triangle mr-1"></i>
            Password is required
          </div>
        </div>

        <!-- Remember me and Forgot password -->
        <div class="flex items-center justify-between">
          <label class="flex items-center">
            <input
              id="remember-username"
              type="checkbox"
              v-model="data.remember"
              class="w-4 h-4 text-green-700 border-gray-300 rounded focus:ring-green-600"
            />
            <span class="ml-2 text-sm text-gray-700">Remember me</span>
          </label>
          <a
            href="/forgot"
            class="text-sm text-green-700 hover:text-green-800 hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <!-- Login Button -->
        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full bg-green-700 text-white py-3 px-4 rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center justify-center"
        >
          <span v-if="!isSubmitting">Sign in</span>
          <span v-else class="flex items-center justify-center">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            Signing in...
          </span>
        </button>
      </form>

      <!-- Divider -->
      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-400"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-600">Or continue with</span>
          </div>
        </div>
      </div>

      <!-- Google Login -->
      <button
        @click="handleGoogleLogin"
        class="mt-6 w-full flex items-center justify-center px-4 py-3 border border-gray-400 rounded-lg bg-white text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition-all duration-300"
      >
        <img class="h-5 w-5 mr-3" src="/google24bg.png" alt="Google Logo" />
        <span class="font-medium">Sign in with Google</span>
        <span class="ml-1 text-green-700">(@vsu.edu.ph)</span>
      </button>

      <!-- Judge Login -->
      <div class="mt-6 text-center">
        <span class="text-sm text-gray-700">Are you a judge?</span>
        <button
          @click="redirectToJudgeLogin"
          class="ml-2 text-sm text-green-700 hover:text-green-800 hover:underline font-medium"
        >
          Sign in as a judge
        </button>
      </div>

      <!-- Cookie Notice -->
      <div class="mt-8 pt-6 border-t border-gray-300">
        <div class="flex items-center justify-center text-sm text-gray-600">
          <i
            @click="handleCookieIconClick"
            class="fas fa-cookie-bite mr-2 text-green-700 cursor-pointer hover:text-green-800"
          ></i>
          <span>Cookies must be enabled in your browser</span>
        </div>
      </div>
    </div>

    <!-- Cookie Info Modal -->
    <div
      v-if="showCookieModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
      @click="closeCookieModal"
    >
      <div
        class="bg-white rounded-xl p-6 max-w-md mx-auto relative shadow-xl"
        @click.stop
      >
        <button
          @click="closeCookieModal"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <i class="fas fa-times text-lg"></i>
        </button>
        <div class="text-center mb-4">
          <i class="fas fa-cookie-bite text-green-700 text-3xl mb-3"></i>
          <h3 class="text-lg font-semibold text-black">About Cookies</h3>
        </div>
        <p class="text-gray-700 mb-4 text-sm leading-relaxed">
          This website uses cookies to ensure proper functionality and security.
          Cookies help us:
        </p>
        <ul class="list-disc list-inside text-gray-700 mb-6 space-y-1 text-sm">
          <li>Maintain your login session</li>
          <li>Remember your username (if selected)</li>
          <li>Protect against security threats</li>
          <li>Improve your user experience</li>
        </ul>
        <p class="text-gray-700 mb-6 text-sm leading-relaxed">
          Please ensure cookies are enabled in your browser settings to sign in
          successfully.
        </p>
        <button
          @click="closeCookieModal"
          class="w-full bg-green-700 text-white py-2 px-4 rounded-lg hover:bg-green-800 transition-colors font-medium"
        >
          Got it
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure validation styles are prominent */
input.border-red-400 {
  border-width: 2px !important;
  background-color: rgba(
    254,
    242,
    242,
    0.95
  ) !important; /* Increased opacity */
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.4) !important; /* Stronger glow */
  z-index: 10 !important; /* Ensure input is above autofill dropdown */
}

/* Override browser autofill styles */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 30px white inset !important;
  -webkit-text-fill-color: #1f2937 !important;
  border: 1px solid #9ca3af !important;
  transition: border-color 0.3s ease, background-color 0.3s ease;
  z-index: 10 !important;
}

/* When autofill is active and field is invalid */
input.border-red-400:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 30px rgba(254, 242, 242, 0.95) inset !important;
  border: 2px solid #f87171 !important;
  z-index: 10 !important;
}

/* Ensure focus state is clear */
input:focus {
  outline: none;
  border-color: #16a34a !important;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.3) !important;
  z-index: 10 !important;
}

/* Ensure error messages are visible above autofill dropdown */
.text-red-600 {
  position: relative;
  z-index: 20 !important; /* Above autofill dropdown */
}
</style>

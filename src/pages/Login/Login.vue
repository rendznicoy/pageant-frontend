<script setup>
import GuestLayout from "@/components/layout/GuestLayout.vue";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import axiosClient from "@/axios";

const router = useRouter();
const userStore = useUserStore();

const data = ref({
  username: "",
  password: "",
  remember: false,
});

const loginError = ref("");
const showCookieModal = ref(false);
const cookieIconPosition = ref({ top: 0, left: 0 });

function handleLogin() {
  loginError.value = ""; // Clear any previous error

  axiosClient
    .get("/api/csrf-cookie")
    .then(() => {
      axiosClient
        .post("/api/v1/login", {
          username: data.value.username,
          password: data.value.password,
          remember: data.value.remember,
        })
        .then((response) => {
          if (response && response.data && response.data.user) {
            // Handle remember me preference
            if (data.value.remember) {
              localStorage.setItem("remembered", data.value.username);
            } else {
              localStorage.removeItem("remembered");
            }

            const user = response.data.user;
            userStore.setUser(user);

            // Redirect based on role
            if (user.role === "admin") {
              router.push("/admin/dashboard");
            } else if (user.role === "tabulator") {
              router.push("/tabulator/dashboard");
            } else {
              loginError.value = "Invalid user role. Please contact support.";
            }
          } else {
            loginError.value = "Unexpected response format. Please try again.";
          }
        })
        .catch((error) => {
          if (error.response && error.response.status === 401) {
            loginError.value = "Invalid username or password.";
          } else if (
            error.response &&
            error.response.data &&
            error.response.data.message
          ) {
            loginError.value = error.response.data.message;
          } else {
            loginError.value = "Login failed. Please try again.";
          }
          console.error("Login error:", error);
        });
    })
    .catch((error) => {
      loginError.value =
        "Could not establish a secure connection. Please try again.";
      console.error("CSRF cookie error:", error);
    });
}

function redirectToJudgeLogin() {
  router.push("/login/judge");
}

function handleGoogleLogin() {
  window.location.href =
    axiosClient.defaults.baseURL + "/api/v1/auth/google/redirect";
}

onMounted(async () => {
  // Check for remembered username
  const remembered = localStorage.getItem("remembered");
  if (remembered) {
    data.value.username = remembered;
    data.value.remember = true;
  }

  // Check for URL error parameters
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");

  if (error === "only_vsu_emails") {
    loginError.value = "Only @vsu.edu.ph email addresses are allowed.";
  } else if (error === "google_auth_failed") {
    loginError.value = "Google authentication failed. Please try again.";
  }

  // Check if user is already logged in
  try {
    const isLoggedIn = await userStore.fetchUser();
    if (isLoggedIn && userStore.user) {
      if (userStore.user.role === "admin") {
        router.push("/admin/dashboard");
      } else if (userStore.user.role === "tabulator") {
        router.push("/tabulator/dashboard");
      } else {
        loginError.value = "Invalid user role. Please contact support.";
      }
    }
  } catch (error) {
    console.info("User not authenticated");
  }
});

watch(
  () => data.value.remember,
  (newVal) => {
    if (newVal && data.value.username) {
      localStorage.setItem("remembered", data.value.username);
    } else {
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
</script>

<template>
  <GuestLayout>
    <div
      v-if="loginError"
      class="bg-red-200 border border-red-500 text-red-800 px-4 py-3 rounded relative mt-4"
      role="alert"
    >
      <span class="block sm:inline">{{ loginError }}</span>
    </div>

    <form @submit.prevent="handleLogin" class="mt-8 space-y-8">
      <Input
        id="username"
        placeholder="Username"
        :modelValue="data.username"
        @update:modelValue="(val) => (data.username = val)"
        required
      />

      <Input
        id="password"
        type="password"
        placeholder="Password"
        :modelValue="data.password"
        @update:modelValue="(val) => (data.password = val)"
        required
      />

      <div class="flex items-center">
        <input
          id="remember-username"
          name="remember-username"
          type="checkbox"
          class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-400 rounded"
          v-model="data.remember"
        />
        <label for="remember-username" class="ml-1 text-sm text-gray-800">
          Remember username
        </label>
      </div>

      <Button type="submit" class="w-full">Log in</Button>
    </form>

    <div class="mt-3 text-center text-sm">
      <a
        href="/forgot"
        class="font-medium text-green-700 hover:text-orange-600 hover:underline"
      >
        Forgotten your username or password?
      </a>
    </div>

    <div class="mt-4 text-sm text-gray-700 text-center">
      <span class="inline-flex items-center">
        <svg
          @click="
            showCookieModal = true;
            cookieIconPosition = {
              top: $event.target.getBoundingClientRect().top + window.scrollY,
              left:
                $event.target.getBoundingClientRect().left +
                $event.target.getBoundingClientRect().width / 2,
            };
          "
          class="h-5 w-5 mr-2 text-green-600 cursor-pointer border border-gray-500 rounded"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        Cookies must be enabled in your browser
      </span>
    </div>

    <div class="mt-4 text-center text-sm text-gray-700">Are you a judge?</div>
    <div class="mt-4">
      <Button class="w-full" @click="redirectToJudgeLogin">
        Log in as a judge
      </Button>
    </div>

    <div class="mt-6 text-center text-sm text-gray-700">
      Log in using your account on:
    </div>
    <div class="mt-2">
      <Button class="w-full flex justify-center" @click="handleGoogleLogin">
        <img class="h-5 w-5 mr-2" src="/google24bg.png" alt="Google Logo" />
        @vsu.edu.ph
      </Button>
    </div>
  </GuestLayout>
</template>

<style scoped></style>

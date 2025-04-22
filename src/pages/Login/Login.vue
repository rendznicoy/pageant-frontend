<script setup>
import GuestLayout from "../../components/GuestLayout.vue";
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import axiosClient from "../../axios";

const router = useRouter();

const data = ref({
  username: "",
  password: "",
  remember: false,
});

function handleLogin() {
  axiosClient.get("/api/csrf-cookie").then((response) => {
    axiosClient
      .post("/api/v1/login", {
        username: data.value.username,
        password: data.value.password,
        remember: data.value.remember,
      })
      .then((response) => {
        if (data.value.remember) {
          localStorage.setItem("remembered", data.value.username);
        } else {
          localStorage.removeItem("remembered");
        }
        // Check if login was successful (adjust based on your API response structure)
        if (response.status === 200) {
          // Redirect to admin dashboard
          router.push("/admin/dashboard");
        }
      })
      .catch((error) => {
        console.error("Login error:", error);
        // Handle error (show message to user, etc.)
      });
  });
}

function redirectToJudgeLogin() {
  router.push("/login/judge");
}

onMounted(() => {
  const remembered = localStorage.getItem("remembered");
  if (remembered) {
    data.value.username = remembered;
    data.value.remember = true;
  }
});

watch(
  () => data.value.remember,
  (newVal) => {
    if (newVal) {
      localStorage.setItem("remembered", data.value.username);
    } else {
      localStorage.removeItem("remembered");
    }
  }
);
</script>
<template>
  <GuestLayout>
    <form @submit.prevent="handleLogin" class="mt-8 space-y-8">
      <div>
        <div class="mt-2">
          <input
            type="text"
            id="username"
            name="username"
            placeholder="Username"
            class="shadow-sm block w-full sm:text-sm border border-gray-400 rounded-sm h-8 focus:outline-green-400 pl-4 py-2 px-3"
            required
            v-model="data.username"
          />
        </div>
      </div>
      <div>
        <div class="mt-2">
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Password"
            class="shadow-sm block w-full sm:text-sm border border-gray-400 rounded-sm h-8 focus:outline-green-400 pl-4 px-3 py-2"
            required
            v-model="data.password"
          />
        </div>
      </div>
      <div class="flex items-center">
        <input
          id="remember-username"
          name="remember-username"
          type="checkbox"
          class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-400 rounded"
          v-model="data.remember"
        />
        <label for="remember-username" class="ml-1 block text-sm text-gray-800"
          >Remember username</label
        >
      </div>
      <div>
        <button
          type="submit"
          class="w-full flex justify-center py-2 px-8 border border-transparent rounded-sm shadow-sm text-sm font-bold text-gray-900 bg-yellow-300 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600"
        >
          Log in
        </button>
      </div>
    </form>
    <div class="mt-3 text-center text-sm">
      <a
        href="/forgot"
        class="font-medium text-green-700 hover:text-orange-600 hover:underline"
        >Forgotten your username or password?</a
      >
    </div>
    <div class="mt-4 text-sm text-gray-700 text-center relative">
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
      <button
        @click="redirectToJudgeLogin"
        class="w-full flex justify-center py-2 px-8 border border-transparent rounded-sm shadow-sm text-sm font-medium text-gray-900 bg-yellow-300 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600"
      >
        Log in as a judge
      </button>
    </div>
    <div class="mt-6 text-center text-sm text-gray-700">
      Log in using your account on:
    </div>
    <div class="mt-2">
      <button
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-yellow-300 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600"
      >
        <img class="h-5 w-5 mr-2" src="/google24bg.png" alt="Google Logo" />
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.657 7.53a1 1 0 011.686-1.069l2.832 2.832a1 1 0 01-1.414 1.414l-2.832-2.832a1 1 0 01-1.686 1.069V11a1 1 0 11-2 0V7.53a1 1 0 01.343-.73z"
          clip-rule="evenodd"
        />
        @vsu.edu.ph
      </button>
    </div>
  </GuestLayout>
</template>
<style scoped></style>

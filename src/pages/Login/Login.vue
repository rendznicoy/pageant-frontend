<script setup>
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

onMounted(() => {
  const remembered = localStorage.getItem("remembered");
  if (remembered) {
    data.value.username = remembered;
    data.value.remember = true;
  }
});
</script>
<template>
  <div
    class="flex min-h-screen bg-gray-100 py-3 flex-col justify-center sm:py-6"
  >
    <div class="relative sm:max-w-xl sm:mx-auto">
      <div
        class="absolute inset-0 bg-gradient-to-r from-green-400 to-yellow-400 shadow-lg transform -skew-y-12 sm:skew-y-0 sm:-rotate-12 sm:rounded-3xl"
      ></div>
      <div
        class="absolute inset-0 bg-gradient-to-r from-yellow-400 to-green-400 shadow-lg transform -skew-y-348 sm:skew-y-0 sm:-rotate-348 sm:rounded-3xl"
      ></div>
      <div class="relative bg-white px-2 py-5 shadow-lg sm:rounded-3xl sm:p-10">
        <div class="max-w-md mx-auto">
          <div class="flex items-center space-x-4">
            <a href="/">
              <img
                class="h-12 w-auto"
                src="/vsu.png"
                alt="Visayas State University Logo"
              />
            </a>
            <h1 class="text-2xl font-bold text-gray-900">
              VSU Pageant Scoring System
            </h1>
          </div>
          <div class="mt-12">
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
                <label
                  for="remember-username"
                  class="ml-1 block text-sm text-gray-800"
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
                href="#"
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
                      top:
                        $event.target.getBoundingClientRect().top +
                        window.scrollY,
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
            <div class="mt-4 text-center text-sm text-gray-700">
              Are you a judge?
            </div>
            <div class="mt-4">
              <button
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
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-grey-900 bg-yellow-300 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600"
              >
                <img
                  class="h-5 w-5 mr-2"
                  src="/google24bg.png"
                  alt="Google Logo"
                />
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.657 7.53a1 1 0 011.686-1.069l2.832 2.832a1 1 0 01-1.414 1.414l-2.832-2.832a1 1 0 01-1.686 1.069V11a1 1 0 11-2 0V7.53a1 1 0 01.343-.73z"
                  clip-rule="evenodd"
                />
                @vsu.edu.ph
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped></style>

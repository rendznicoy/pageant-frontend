<script setup>
import { ref } from "vue";
import axiosClient from "../axios";
import { useRouter } from "vue-router";

const router = useRouter();
const username = ref("");
const email = ref("");
const message = ref("");
const error = ref("");
const isSubmitting = ref(false);

function handleForgotByUsername() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  axiosClient.get("/api/csrf-cookie").then((response) => {
    message.value = "";
    error.value = "";
    axiosClient
      .post("/api/v1/password/forgot", { username: username.value })
      .then((res) => {
        // Store user email in session storage to display in confirmation page
        if (res.data.email) {
          sessionStorage.setItem("passwordResetEmail", res.data.email);
        }

        // Store data about submission in sessionStorage
        sessionStorage.setItem("passwordResetSubmitted", "true");
        sessionStorage.setItem("passwordResetMethod", "username");
        sessionStorage.setItem("passwordResetValue", username.value);

        // Navigate to confirmation page
        router.push({
          name: "Confirmation",
          query: { source: "forgot" },
        });
      })
      .catch((err) => {
        error.value = err.response.data.message || "An error occurred.";
        isSubmitting.value = false;
      });
  });
}

function handleForgotByEmail() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  axiosClient.get("/api/csrf-cookie").then((response) => {
    message.value = "";
    error.value = "";
    axiosClient
      .post("/api/v1/password/forgot", { email: email.value })
      .then((res) => {
        // Store user email in session storage
        if (res.data.email) {
          sessionStorage.setItem("passwordResetEmail", res.data.email);
        }

        // Store data about submission in sessionStorage
        sessionStorage.setItem("passwordResetSubmitted", "true");
        sessionStorage.setItem("passwordResetMethod", "email");
        sessionStorage.setItem("passwordResetValue", email.value);

        // Navigate to confirmation page
        router.push({
          name: "Confirmation",
          query: { source: "forgot" },
        });
      })
      .catch((err) => {
        error.value = err.response.data.message || "An error occurred.";
        isSubmitting.value = false;
      });
  });
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-20 px-8">
    <p class="text-gray-800 mb-12">
      To reset your password, submit your username or your email address below.
      If we can find you in the database, an email will be sent to your email
      address, with instructions how to get access again.
    </p>

    <div v-if="message" class="text-green-600 mb-4">{{ message }}</div>
    <div v-if="error" class="text-red-600 mb-4">{{ error }}</div>

    <div class="mb-16">
      <h2 class="text-gray-700 mb-4 font-medium">Search by username</h2>
      <label for="username" class="block mb-2 text-gray-700">Username</label>
      <input
        id="username"
        v-model="username"
        class="w-half border border-gray-400 px-3 py-2 mb-4 focus:outline-green-400"
        type="text"
        required
      />
      <div>
        <button
          @click="handleForgotByUsername"
          :disabled="isSubmitting"
          class="bg-yellow-300 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 text-gray-900 font-semibold px-4 py-2"
          :class="{ 'opacity-50 cursor-not-allowed': isSubmitting }"
        >
          {{ isSubmitting ? "Processing..." : "Search" }}
        </button>
      </div>
    </div>

    <hr class="my-12" />

    <div>
      <h2 class="text-gray-700 mb-4 font-medium">Search by email address</h2>
      <label for="email" class="block mb-2 text-gray-700">Email address</label>
      <input
        id="email"
        v-model="email"
        class="w-half border border-gray-400 px-3 py-2 mb-4 focus:outline-green-400"
        type="email"
        required
      />
      <div>
        <button
          @click="handleForgotByEmail"
          :disabled="isSubmitting"
          class="bg-yellow-300 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 text-gray-900 font-semibold px-4 py-2"
          :class="{ 'opacity-50 cursor-not-allowed': isSubmitting }"
        >
          {{ isSubmitting ? "Processing..." : "Search" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped></style>

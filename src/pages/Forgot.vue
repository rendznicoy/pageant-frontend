<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import axiosClient from "../axios";

import Input from "../components/ui/Input.vue";
import Button from "../components/ui/Button.vue";
import FormError from "../components/ui/FormError.vue";

const username = ref("");
const email = ref("");
const error = ref("");
const isSubmitting = ref(false);
const router = useRouter();

const handleSubmit = async (method) => {
  if (isSubmitting.value) return;

  error.value = "";
  isSubmitting.value = true;

  try {
    // Always get CSRF cookie FIRST
    await axiosClient.get("/api/csrf-cookie");

    // Validate input
    let payload = {};
    if (method === "username") {
      if (!username.value) {
        error.value = "Please enter your username.";
        return;
      }
      if (username.value.length < 3) {
        error.value = "Username must be at least 3 characters.";
        return;
      }
      payload = { username: username.value };
    } else if (method === "email") {
      if (!email.value) {
        error.value = "Please enter your email.";
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email.value)) {
        error.value = "Please enter a valid email address.";
        return;
      }
      payload = { email: email.value };
    }

    // Make the API call AFTER validation
    const res = await axiosClient.post("/api/v1/password/forgot", payload);

    // Store session info
    sessionStorage.setItem("passwordResetSubmitted", "true");
    sessionStorage.setItem("passwordResetMethod", method);
    sessionStorage.setItem("passwordResetValue", payload[method]);
    sessionStorage.setItem("passwordResetEmail", res.data.email || "");

    // Redirect
    router.push({ name: "Confirmation", query: { source: "forgot" } });
  } catch (err) {
    console.error("Forgot error:", err);
    error.value = err.response?.data?.message || "Something went wrong.";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="max-w-3xl mx-auto py-20 px-6">
    <p class="text-gray-800 mb-8 text-sm">
      To reset your password, submit your username or email address. If we can
      find it, you'll get a reset link.
    </p>

    <FormError :message="error" />

    <div class="space-y-6">
      <!-- Username reset -->
      <section>
        <h2 class="text-gray-700 mb-2 font-medium text-sm">
          Search by username
        </h2>
        <Input
          id="username"
          type="text"
          placeholder="Enter your username"
          :modelValue="username"
          @update:modelValue="(val) => (username = val)"
          :class="{ 'border-red-500': error.includes('username') }"
          @keyup.enter="handleSubmit('username')"
        />
        <div class="mt-3">
          <Button :disabled="isSubmitting" @click="handleSubmit('username')">
            {{ isSubmitting ? "Processing..." : "Search" }}
          </Button>
        </div>
      </section>

      <hr class="my-6" />

      <!-- Email reset -->
      <section>
        <h2 class="text-gray-700 mb-2 font-medium text-sm">Search by email</h2>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          :modelValue="email"
          @update:modelValue="(val) => (email = val)"
          :class="{ 'border-red-500': error.includes('email') }"
          @keyup.enter="handleSubmit('email')"
        />
        <div class="mt-3">
          <Button :disabled="isSubmitting" @click="handleSubmit('email')">
            {{ isSubmitting ? "Processing..." : "Search" }}
          </Button>
        </div>
      </section>
    </div>
  </div>
</template>

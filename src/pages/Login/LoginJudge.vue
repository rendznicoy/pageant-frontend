<script setup>
import { ref, nextTick } from "vue";
import { useRouter } from "vue-router";
import axiosClient from "../../axios";
import GuestLayout from "../../components/layout/GuestLayout.vue";

const router = useRouter();
const pinInputs = Array.from({ length: 6 }, () => ref(""));
const inputRefs = ref([]);
const error = ref("");

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

async function handleJudgeLogin() {
  const pin_code = pinInputs.map((r) => r.value).join("");
  error.value = "";
  try {
    await axiosClient.get("/api/csrf-cookie");
    const response = await axiosClient.post("/api/v1/login/judge", {
      pin_code,
    });
    if (response.status === 200) {
      localStorage.setItem("token", response.data.token);
      axiosClient.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${response.data.token}`;
      router.push("/judge/dashboard");
    }
  } catch (err) {
    error.value =
      err.response?.data?.message || "Invalid PIN. Please try again.";
    console.error("Judge login error:", err);
  }
}
</script>

<template>
  <GuestLayout>
    <div class="bg-white p-10 sm:p-12 rounded shadow-xl w-full max-w-md">
      <h2 class="text-lg font-semibold text-center mb-8 text-gray-800">
        Judge Login – Enter Your PIN
      </h2>

      <form @submit.prevent="handleJudgeLogin">
        <div class="flex justify-center gap-3 mb-6" @paste="handlePaste">
          <input
            v-for="(input, index) in pinInputs"
            :key="index"
            type="text"
            maxlength="1"
            class="w-10 h-12 text-center border border-gray-300 rounded text-lg uppercase focus:outline-none focus:ring-2 focus:ring-green-400"
            v-model="pinInputs[index].value"
            @input="handleInput(index, $event)"
            @keydown="handleKeydown(index, $event)"
            ref="inputRefs"
          />
        </div>

        <div v-if="error" class="text-red-600 text-sm text-center mb-4">
          {{ error }}
        </div>

        <button
          type="submit"
          class="w-full bg-yellow-300 text-gray-900 font-semibold py-2 rounded hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        >
          Log In
        </button>
      </form>

      <div class="mt-6 text-center text-sm">
        <a
          href="/login/admin"
          class="text-green-700 hover:text-orange-600 hover:underline"
        >
          Are you an Admin or Tabulator?
        </a>
      </div>
    </div>
  </GuestLayout>
</template>

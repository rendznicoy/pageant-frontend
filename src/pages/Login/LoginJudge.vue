<script setup>
import { ref, nextTick } from "vue";
import { useRouter } from "vue-router";
import axiosClient from "../../axios";
import GuestLayout from "../../components/GuestLayout.vue";

const router = useRouter();
const pinInputs = Array.from({ length: 6 }, () => ref(""));
const inputRefs = ref([]);

function handleInput(index, event) {
  const value = event.target.value.toUpperCase();
  pinInputs[index].value = value.slice(0, 1); // only allow 1 char, uppercase

  // Move to next box if filled
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
  const paste = event.clipboardData.getData("text").toUpperCase().slice(0, 6);
  [...paste].forEach((char, idx) => {
    pinInputs[idx].value = char;
  });

  nextTick(() => {
    const next = paste.length >= 6 ? 5 : paste.length;
    inputRefs.value[next]?.focus();
  });

  event.preventDefault();
}

function handleJudgeLogin() {
  const pin_code = pinInputs.map((ref) => ref.value).join("");

  axiosClient.get("/api/csrf-cookie").then(() => {
    axiosClient
      .post("/api/v1/login/judge", { pin_code })
      .then((response) => {
        if (response.status === 200) {
          router.push("/judge/dashboard");
        }
      })
      .catch((error) => {
        console.error("Judge Login error:", error);
      });
  });
}
</script>

<template>
  <GuestLayout>
    <div class="bg-white p-12 rounded shadow-lg w-full max-w-md">
      <h2 class="text-xl font-bold text-center mb-12">
        Judge Login – Enter Your PIN
      </h2>
      <form @submit.prevent="handleJudgeLogin">
        <div class="flex justify-between gap-4 mb-8" @paste="handlePaste">
          <input
            v-for="(input, index) in pinInputs"
            :key="index"
            type="text"
            maxlength="1"
            class="w-10 h-12 text-center border border-gray-400 rounded text-xl uppercase focus:outline-green-400"
            v-model="pinInputs[index].value"
            @input="handleInput(index, $event)"
            @keydown="handleKeydown(index, $event)"
            ref="inputRefs"
          />
        </div>
        <button
          type="submit"
          class="w-full bg-yellow-300 text-gray-900 font-bold py-2 rounded hover:bg-gray-400"
        >
          Log In
        </button>
      </form>
      <div class="mt-6 text-center text-sm">
        <a
          href="/login/admin"
          class="font-medium text-green-700 hover:text-orange-600 hover:underline"
        >
          Are you an Admin or Tabulator?
        </a>
      </div>
    </div>
  </GuestLayout>
</template>

<style scoped></style>

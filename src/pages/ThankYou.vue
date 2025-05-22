<script setup>
import { useRouter } from "vue-router";
import { ref, onMounted, onUnmounted } from "vue";
import { useToast } from "vue-toastification";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const toast = useToast();
const userStore = useUserStore();
const timeLeft = ref(60); // for testing

let timer = null;

onMounted(() => {
  timer = setInterval(() => {
    timeLeft.value -= 1;
    if (timeLeft.value <= 0) {
      clearInterval(timer);
      userStore.logout().then(() => {
        localStorage.removeItem("token");
        toast.info("Your session has ended. Please log in again.");
        router.push("/login/admin");
      });
    }
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center"
  >
    <div
      class="bg-white p-10 rounded-2xl shadow-2xl text-center animate-fade-in transition-opacity duration-700 ease-in"
    >
      <h1
        class="text-5xl font-extrabold text-gray-800 italic mb-6"
        style="font-family: 'Brush Script MT', cursive"
      >
        Thank You!
      </h1>
      <p class="text-gray-700 text-lg mb-4">
        The event is now complete. We truly appreciate your time and effort as a
        judge.
      </p>
      <p class="text-gray-500 text-sm">
        You'll be redirected to the login page in {{ timeLeft }} seconds.
      </p>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.8s ease-out forwards;
}

h1 {
  letter-spacing: 0.5px;
}
</style>

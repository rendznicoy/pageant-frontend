<script setup>
import { useRoute, useRouter } from "vue-router";
import { ref, onMounted, onBeforeUnmount } from "vue";

const route = useRoute();
const router = useRouter();
const submittedValue = ref(sessionStorage.getItem("passwordResetValue") || "");
const submittedMethod = ref(
  sessionStorage.getItem("passwordResetMethod") || ""
);

// Function to handle the continue button click
function handleContinue() {
  // Navigate to login or home page
  router.push({ name: "Login" });
}

// Function to show confirmation dialog on page refresh
function handleBeforeUnload(event) {
  // Only trigger if we came from forgot password flow
  if (
    route.query.source === "forgot" ||
    sessionStorage.getItem("passwordResetSubmitted") === "true"
  ) {
    // This message won't be shown to the user in modern browsers,
    // but the confirmation dialog will still appear
    event.preventDefault();
    event.returnValue = "";
    return "";
  }
}

onMounted(() => {
  // Add event listener for beforeunload
  window.addEventListener("beforeunload", handleBeforeUnload);

  // Create and submit hidden form to establish POST request state
  const form = document.getElementById("hiddenForm");
  if (form) {
    setTimeout(() => {
      form.submit();
    }, 100);
  }

  // Redirect if directly accessed without going through forgot password flow
  if (
    route.query.source !== "forgot" &&
    sessionStorage.getItem("passwordResetSubmitted") !== "true"
  ) {
    router.push({ name: "Forgot" });
  }
});

onBeforeUnmount(() => {
  // Remove event listener when component is destroyed
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<template>
  <div class="max-w-8xl mx-auto py-40 px-16 text-center">
    <div class="max-w-4xl mx-auto">
      <p class="text-gray-900 mb-8">
        If you supplied a correct username or unique email address then an email
        should have been sent to you.
      </p>
      <p class="text-gray-900 mb-16">
        It contains easy instructions to confirm and complete this password
        change. If you continue to have difficulty, please contact the site
        administrator.
      </p>

      <div class="flex justify-center">
        <button
          @click="handleContinue"
          class="bg-yellow-300 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600 text-gray-900 font-semibold px-16 py-2"
        >
          Continue
        </button>
      </div>
    </div>
    <!-- Hidden form to establish POST state and trigger resubmission dialog on refresh -->
    <form
      id="hiddenForm"
      method="post"
      action=""
      target="hiddenFrame"
      style="display: none"
    >
      <input type="hidden" name="resetRequested" value="true" />
      <input type="hidden" name="method" :value="submittedMethod" />
      <input type="hidden" name="value" :value="submittedValue" />
    </form>
    <iframe name="hiddenFrame" style="display: none"></iframe>
  </div>
</template>

<style lang="scss" scoped></style>

<script setup>
import { useRoute, useRouter } from "vue-router";
import { ref, onMounted, onBeforeUnmount } from "vue";
import Button from "../components/ui/Button.vue";

const route = useRoute();
const router = useRouter();
const submittedValue = ref(sessionStorage.getItem("passwordResetValue") || "");
const submittedMethod = ref(
  sessionStorage.getItem("passwordResetMethod") || ""
);

function handleContinue() {
  router.push({ name: "Login" });
}

function handleBeforeUnload(event) {
  if (
    route.query.source === "forgot" ||
    sessionStorage.getItem("passwordResetSubmitted") === "true"
  ) {
    event.preventDefault();
    event.returnValue = "";
    return "";
  }
}

onMounted(() => {
  window.addEventListener("beforeunload", handleBeforeUnload);

  const form = document.getElementById("hiddenForm");
  if (form) {
    setTimeout(() => form.submit(), 100);
  }

  if (
    route.query.source !== "forgot" &&
    sessionStorage.getItem("passwordResetSubmitted") !== "true"
  ) {
    router.push({ name: "Forgot" });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});
</script>

<template>
  <section class="max-w-4xl mx-auto px-6 py-32 text-center">
    <div class="space-y-6">
      <p class="text-base text-gray-800">
        If you supplied a correct username or unique email address then an email
        should have been sent to you.
      </p>
      <p class="text-base text-gray-800">
        It contains instructions to confirm and complete the password change. If
        you continue to have difficulty, please contact the site administrator.
      </p>

      <Button @click="handleContinue" class="px-12 py-2"> Continue </Button>
    </div>

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
    <iframe name="hiddenFrame" style="display: none" />
  </section>
</template>

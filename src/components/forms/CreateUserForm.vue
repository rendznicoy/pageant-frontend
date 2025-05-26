<script setup>
import { ref, computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";
import { useToast } from "vue-toastification";

const toast = useToast();

// Reactive dark mode - CRITICAL: This is what was missing
const isDarkMode = computed(() => darkModeStore.isDarkMode);

const props = defineProps({
  errors: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["submit", "cancel"]);

const newUser = ref({
  username: "",
  email: "",
  password: "",
  password_confirmation: "",
  first_name: "",
  last_name: "",
  role: "admin", // ← restored default
});

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const formErrors = ref({});
const darkModeStore = useDarkModeStore();

// Validation rules
const validateField = (field, value) => {
  switch (field) {
    case "username":
      if (!value) return "Username is required.";
      if (value.length < 3) return "Username must be at least 3 characters.";
      if (!/^[a-zA-Z0-9_-]+$/.test(value))
        return "Username can only contain letters, numbers, underscores, or dashes.";
      return "";
    case "email":
      if (!value) return "Email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return "Invalid email format.";
      return "";
    case "password":
      if (!value) return "Password is required.";
      if (value.length < 8) return "Password must be at least 8 characters.";
      if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value))
        return "Password must contain at least one letter and one number.";
      return "";
    case "password_confirmation":
      if (value !== newUser.value.password) return "Passwords do not match.";
      return "";
    case "first_name":
      if (!value) return "First name is required.";
      if (value.length < 2) return "First name must be at least 2 characters.";
      if (!/^[a-zA-Z\s]+$/.test(value))
        return "First name can only contain letters.";
      return "";
    case "last_name":
      if (!value) return "Last name is required.";
      if (value.length < 2) return "Last name must be at least 2 characters.";
      if (!/^[a-zA-Z\s]+$/.test(value))
        return "Last name can only contain letters.";
      return "";
    case "role":
      if (!value) return "Role is required.";
      if (!["admin", "tabulator"].includes(value))
        return "Invalid role selected.";
      return "";
    default:
      return "";
  }
};

// Check required fields
const checkRequiredFields = () => {
  const requiredFields = [
    "username",
    "email",
    "password",
    "password_confirmation",
    "first_name",
    "last_name",
  ];

  let missing = false;

  requiredFields.forEach((key) => {
    if (!newUser.value[key]) {
      formErrors.value[key] = `${key.replace(/_/g, " ")} is required.`;
      missing = true;
    } else {
      formErrors.value[key] = "";
    }
  });

  if (missing) {
    toast.error("Please fill in all required fields.");
    return false;
  }

  return true;
};

// Validate all fields
const validateForm = () => {
  formErrors.value = {
    username: validateField("username", newUser.value.username),
    email: validateField("email", newUser.value.email),
    password: validateField("password", newUser.value.password),
    password_confirmation: validateField(
      "password_confirmation",
      newUser.value.password_confirmation
    ),
    first_name: validateField("first_name", newUser.value.first_name),
    last_name: validateField("last_name", newUser.value.last_name),
    role: validateField("role", newUser.value.role),
  };
  return Object.values(formErrors.value).every((error) => !error);
};

// Handle input change
const handleInput = (field) => {
  formErrors.value[field] = validateField(field, newUser.value[field]);
};

// Toggle password visibility
const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const toggleConfirmPassword = () => {
  showConfirmPassword.value = !showConfirmPassword.value;
};

// Submit form
const submitForm = async () => {
  // Manually validate each required field first
  Object.keys(newUser.value).forEach((key) => {
    formErrors.value[key] = validateField(key, newUser.value[key]);
  });

  const hasErrors = Object.values(formErrors.value).some((msg) => !!msg);
  const anyMissing = Object.values(newUser.value).some((v) => !v);

  if (anyMissing || hasErrors) {
    toast.error("Please fill in all required fields.");
    return;
  }

  try {
    await emit("submit", { ...newUser.value });
  } catch (serverErrors) {
    if (typeof serverErrors === "object") {
      formErrors.value = serverErrors;
      toast.error("Validation failed.");
    } else {
      toast.error("Unexpected error.");
    }
  }
};

// Reset form
const resetForm = () => {
  newUser.value = {
    username: "",
    email: "",
    password: "",
    password_confirmation: "",
    first_name: "",
    last_name: "",
    role: "admin",
  };
  formErrors.value = {};
  showPassword.value = false;
  showConfirmPassword.value = false;
};

// Computed property to disable submit button
const isSubmitDisabled = computed(() => {
  const required = [
    "username",
    "email",
    "password",
    "password_confirmation",
    "first_name",
    "last_name",
    "role",
  ];
  return (
    required.some((key) => !newUser.value[key]) ||
    Object.values(formErrors.value).some((err) => !!err)
  );
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center"
    :class="isDarkMode ? 'bg-black/60' : 'bg-black/40'"
  >
    <div
      class="p-6 rounded-lg shadow-lg max-w-lg w-full relative max-h-[90vh] overflow-y-auto transition-colors duration-300"
      :class="isDarkMode ? 'bg-gray-800' : 'bg-white'"
    >
      <button
        @click="
          () => {
            emit('cancel');
            resetForm();
          }
        "
        class="absolute top-2 right-2 text-xl font-bold z-70 p-2 rounded-full transition-colors duration-200"
        :class="
          isDarkMode
            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        "
        aria-label="Close"
      >
        <i class="fas fa-times text-xl"></i>
      </button>

      <!-- Title -->
      <h2
        class="text-2xl font-bold mb-6 transition-colors duration-200"
        :class="isDarkMode ? 'text-green-300' : 'text-green-800'"
      >
        Create New User
      </h2>

      <!-- Form -->
      <form @submit.prevent="submitForm" class="space-y-5">
        <!-- Input Field Component -->
        <div
          v-for="(label, key) in {
            username: 'Username',
            email: 'Email',
            password: 'Password',
            password_confirmation: 'Confirm Password',
            first_name: 'First Name',
            last_name: 'Last Name',
          }"
          :key="key"
        >
          <label
            class="block text-sm font-medium mb-1 transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            {{ label }}
          </label>
          <div class="relative">
            <i
              class="fas absolute left-3 top-3 transition-colors duration-200"
              :class="[
                isDarkMode ? 'text-gray-500' : 'text-gray-400',
                {
                  'fa-user':
                    key === 'username' ||
                    key === 'first_name' ||
                    key === 'last_name',
                  'fa-envelope': key === 'email',
                  'fa-lock': key === 'password',
                  'fa-check': key === 'password_confirmation',
                },
              ]"
            ></i>
            <input
              :type="
                (key === 'password' && !showPassword) ||
                (key === 'password_confirmation' && !showConfirmPassword)
                  ? 'password'
                  : 'text'
              "
              v-model="newUser[key]"
              @input="handleInput(key)"
              class="block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:ring-2 focus:outline-none transition-colors duration-200"
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-green-400 placeholder-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-green-600 placeholder-gray-500'
              "
              :placeholder="label"
            />
            <!-- Toggle Visibility -->
            <button
              v-if="key === 'password' || key === 'password_confirmation'"
              type="button"
              class="absolute right-3 top-3 transition-colors duration-200"
              :class="
                isDarkMode
                  ? 'text-gray-500 hover:text-gray-300'
                  : 'text-gray-400 hover:text-gray-600'
              "
              @click="
                key === 'password' ? togglePassword() : toggleConfirmPassword()
              "
            >
              <i
                :class="
                  (key === 'password' ? showPassword : showConfirmPassword)
                    ? 'fas fa-eye-slash'
                    : 'fas fa-eye'
                "
              ></i>
            </button>
          </div>
          <p
            v-if="formErrors[key] || errors[key]"
            class="text-sm mt-1 transition-colors duration-200"
            :class="isDarkMode ? 'text-red-400' : 'text-red-600'"
          >
            {{ formErrors[key] || (errors[key] && errors[key][0]) }}
          </p>
        </div>

        <!-- Role Selection -->
        <div>
          <label
            class="block text-sm font-medium mb-1 transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Role
          </label>
          <div class="relative">
            <i
              class="fas fa-user-tag absolute left-3 top-3 transition-colors duration-200"
              :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
            ></i>
            <select
              v-model="newUser.role"
              @input="handleInput('role')"
              class="block w-full pl-10 pr-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:outline-none transition-colors duration-200"
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-green-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-green-600'
              "
            >
              <option
                disabled
                value=""
                :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
              >
                Select Role
              </option>
              <option
                value="admin"
                :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'"
              >
                Admin
              </option>
              <option
                value="tabulator"
                :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'"
              >
                Tabulator
              </option>
            </select>
          </div>
          <p
            v-if="formErrors.role || errors.role"
            class="text-sm mt-1 transition-colors duration-200"
            :class="isDarkMode ? 'text-red-400' : 'text-red-600'"
          >
            {{ formErrors.role || (errors.role && errors.role[0]) }}
          </p>
        </div>

        <!-- Submit -->
        <div class="flex justify-end">
          <button
            type="submit"
            class="px-5 py-2 text-white font-medium rounded-md shadow transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="
              isDarkMode
                ? 'bg-green-700 hover:bg-green-600'
                : 'bg-green-600 hover:bg-green-700'
            "
            :disabled="isSubmitDisabled"
          >
            Create User
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.relative {
  position: relative;
}
</style>

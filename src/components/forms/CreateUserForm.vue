<script setup>
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";

const toast = useToast();

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
  role: "admin",
});
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const formErrors = ref({});

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
      if (!["admin", "tabulator"].includes(value)) return "Invalid role.";
      return "";
    default:
      return "";
  }
};

// Check required fields
const checkRequiredFields = () => {
  const requiredFields = [
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "password", label: "Password" },
    { key: "first_name", label: "First Name" },
    { key: "last_name", label: "Last Name" },
  ];
  const missingFields = requiredFields.filter(
    (field) => !newUser.value[field.key]
  );
  missingFields.forEach((field) => {
    toast.error(`${field.label}: This field is required`);
  });
  return missingFields.length === 0;
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
  if (!checkRequiredFields()) {
    validateForm();
    return;
  }
  if (!validateForm()) {
    toast.error("Please fix form errors before submitting.");
    return;
  }
  try {
    await emit("submit", newUser.value);
    resetForm();
  } catch (errors) {
    formErrors.value = errors;
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
  return (
    Object.values(formErrors.value).some((error) => error) ||
    !newUser.value.username ||
    !newUser.value.email ||
    !newUser.value.password ||
    !newUser.value.first_name ||
    !newUser.value.last_name
  );
});
</script>

<template>
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full relative">
      <button
        @click="
          emit('cancel');
          resetForm();
        "
        class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
        aria-label="Close"
      >
        <i class="fas fa-times text-4xl mr-2"></i>
      </button>
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Create New User</h2>
      <form @submit.prevent="submitForm" class="space-y-4">
        <div class="relative">
          <label class="block text-sm font-medium text-gray-700"
            >Username</label
          >
          <div class="relative">
            <i class="fas fa-user absolute left-3 top-4 text-gray-500"></i>
            <input
              v-model="newUser.username"
              type="text"
              class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              required
              @input="handleInput('username')"
            />
          </div>
          <p
            v-if="formErrors.username || errors.username"
            class="mt-1 text-sm text-red-600"
          >
            {{ formErrors.username || (errors.username && errors.username[0]) }}
          </p>
        </div>
        <div class="relative">
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <div class="relative">
            <i class="fas fa-envelope absolute left-3 top-4 text-gray-500"></i>
            <input
              v-model="newUser.email"
              type="email"
              class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              required
              @input="handleInput('email')"
            />
          </div>
          <p
            v-if="formErrors.email || errors.email"
            class="mt-1 text-sm text-red-600"
          >
            {{ formErrors.email || (errors.email && errors.email[0]) }}
          </p>
        </div>
        <div class="relative">
          <label class="block text-sm font-medium text-gray-700"
            >Password</label
          >
          <div class="relative">
            <i class="fas fa-lock absolute left-3 top-4 text-gray-500"></i>
            <input
              v-model="newUser.password"
              :type="showPassword ? 'text' : 'password'"
              class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              required
              @input="handleInput('password')"
            />
            <button
              type="button"
              @click="togglePassword"
              class="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              aria-label="Toggle password visibility"
            >
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
          <p
            v-if="formErrors.password || errors.password"
            class="mt-1 text-sm text-red-600"
          >
            {{ formErrors.password || (errors.password && errors.password[0]) }}
          </p>
        </div>
        <div class="relative">
          <label class="block text-sm font-medium text-gray-700"
            >Confirm Password</label
          >
          <div class="relative">
            <i class="fas fa-check absolute left-3 top-4 text-gray-500"></i>
            <input
              v-model="newUser.password_confirmation"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              required
              @input="handleInput('password_confirmation')"
            />
            <button
              type="button"
              @click="toggleConfirmPassword"
              class="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              aria-label="Toggle confirm password visibility"
            >
              <i
                :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"
              ></i>
            </button>
          </div>
          <p
            v-if="
              formErrors.password_confirmation || errors.password_confirmation
            "
            class="mt-1 text-sm text-red-600"
          >
            {{
              formErrors.password_confirmation ||
              (errors.password_confirmation && errors.password_confirmation[0])
            }}
          </p>
        </div>
        <div class="relative">
          <label class="block text-sm font-medium text-gray-700"
            >First Name</label
          >
          <div class="relative">
            <i class="fas fa-user absolute left-3 top-4 text-gray-500"></i>
            <input
              v-model="newUser.first_name"
              type="text"
              class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              required
              @input="handleInput('first_name')"
            />
          </div>
          <p
            v-if="formErrors.first_name || errors.first_name"
            class="mt-1 text-sm text-red-600"
          >
            {{
              formErrors.first_name ||
              (errors.first_name && errors.first_name[0])
            }}
          </p>
        </div>
        <div class="relative">
          <label class="block text-sm font-medium text-gray-700"
            >Last Name</label
          >
          <div class="relative">
            <i class="fas fa-user absolute left-3 top-4 text-gray-500"></i>
            <input
              v-model="newUser.last_name"
              type="text"
              class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              required
              @input="handleInput('last_name')"
            />
          </div>
          <p
            v-if="formErrors.last_name || errors.last_name"
            class="mt-1 text-sm text-red-600"
          >
            {{
              formErrors.last_name || (errors.last_name && errors.last_name[0])
            }}
          </p>
        </div>
        <div class="relative">
          <label class="block text-sm font-medium text-gray-700">Role</label>
          <div class="relative">
            <i class="fas fa-user-tag absolute left-3 top-3 text-gray-500"></i>
            <select
              v-model="newUser.role"
              class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              @input="handleInput('role')"
            >
              <option value="admin">Admin</option>
              <option value="tabulator">Tabulator</option>
            </select>
          </div>
          <p
            v-if="formErrors.role || errors.role"
            class="mt-1 text-sm text-red-600"
          >
            {{ formErrors.role || (errors.role && errors.role[0]) }}
          </p>
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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

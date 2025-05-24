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
  role: "admin", // ← restored default
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
  >
    <div
      class="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full relative max-h-[90vh] overflow-y-auto"
    >
      <button
        @click="
          () => {
            emit('cancel');
            resetForm();
          }
        "
        class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold z-70"
        aria-label="Close"
      >
        <i class="fas fa-times text-4xl mr-2"></i>
      </button>

      <!-- Title -->
      <h2 class="text-2xl font-bold text-green-800 mb-6">Create New User</h2>

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
          <label class="block text-sm font-medium text-gray-700 mb-1">{{
            label
          }}</label>
          <div class="relative">
            <i
              class="fas absolute left-3 top-3 text-gray-400"
              :class="{
                'fa-user':
                  key === 'username' ||
                  key === 'first_name' ||
                  key === 'last_name',
                'fa-envelope': key === 'email',
                'fa-lock': key === 'password',
                'fa-check': key === 'password_confirmation',
              }"
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
              class="block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-green-600 focus:outline-none border-gray-300"
              :placeholder="label"
            />
            <!-- Toggle Visibility -->
            <button
              v-if="key === 'password' || key === 'password_confirmation'"
              type="button"
              class="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
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
            class="text-sm text-red-600 mt-1"
          >
            {{ formErrors[key] || (errors[key] && errors[key][0]) }}
          </p>
        </div>

        <!-- Role Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Role</label
          >
          <div class="relative">
            <i class="fas fa-user-tag absolute left-3 top-3 text-gray-400"></i>
            <select
              v-model="newUser.role"
              @input="handleInput('role')"
              class="block w-full pl-10 pr-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-green-600 focus:outline-none border-gray-300"
            >
              <option disabled value="">Select Role</option>
              <!-- ⬅️ Add this -->
              <option value="admin">Admin</option>
              <option value="tabulator">Tabulator</option>
            </select>
          </div>
          <p
            v-if="formErrors.role || errors.role"
            class="text-sm text-red-600 mt-1"
          >
            {{ formErrors.role || (errors.role && errors.role[0]) }}
          </p>
        </div>

        <!-- Submit -->
        <div class="flex justify-end">
          <button
            type="submit"
            class="px-5 py-2 bg-green-600 text-white font-medium rounded-md shadow hover:bg-green-700 transition"
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

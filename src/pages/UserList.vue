<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useDarkModeStore } from "@/stores/darkMode";
import { useToast } from "vue-toastification";
import axiosClient from "@/axios";
import { useWindowSize } from "@/composables/useWindowSize";
import CreateUserForm from "@/components/forms/CreateUserForm.vue";
import EditUserForm from "@/components/forms/EditUserForm.vue";
import DeleteUserModal from "@/components/forms/DeleteUserModal.vue";
import UserListSortDropdown from "@/components/ui/UserListSortDropdown.vue";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";

const router = useRouter();
const userStore = useUserStore();
const darkModeStore = useDarkModeStore();
const toast = useToast();
const searchTerm = ref("");

const users = ref([]);
const filterRole = ref("");
const sortField = ref("id");
const sortDirection = ref("asc");
const serverError = ref("");
const currentPage = ref(1);
const itemsPerPage = 8;
const dropdownVisible = ref(null);

// Create user modal
const showCreateModal = ref(false);
const showRoleConfirmModal = ref(false);
const roleChangeTarget = ref(null);
const pendingRole = ref(null);
const isLoading = ref(false);

const isDarkMode = computed(() => darkModeStore.isDarkMode);

// Edit user modal
const showEditModal = ref(false);

const editUser = ref({
  user_id: null,
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  role: "",
  password: "",
});

const breadcrumbItems = [
  { label: "Home", to: "/admin/dashboard" },
  { label: "Users", to: "#" },
];

// Delete confirmation
const showDeleteConfirm = ref(false);
const userToDelete = ref(null);

// Fetch users
const fetchUsers = async () => {
  isLoading.value = true;
  try {
    const params = filterRole.value ? { role: filterRole.value } : {};
    const response = await axiosClient.get("/api/v1/users", { params });
    users.value = response.data ?? response;
    if (users.value && users.value.data) {
      users.value = users.value.data;
    }
    console.log("Users fetched:", users.value);
  } catch (error) {
    console.error("Fetch users error:", error);
    if (error.response?.status === 422) {
      throw error.response.data.errors;
    } else {
      const fallbackMessage = error?.message || "Failed to fetch users.";
      serverError.value = error.response?.data?.message || fallbackMessage;
      toast.error(serverError.value);
    }
  } finally {
    isLoading.value = false;
  }
};

// Filtered and sorted users
const filteredUsers = computed(() => {
  if (!Array.isArray(users.value)) return [];

  let filtered = users.value.filter(
    (user) => user && user.user_id && user.role
  );

  // Exclude judges unless explicitly filtered
  if (filterRole.value === "") {
    filtered = filtered.filter((user) => user.role !== "judge");
  }

  if (filterRole.value) {
    filtered = filtered.filter((user) => user.role === filterRole.value);
  }

  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        (u.first_name || "").toLowerCase().includes(term) ||
        (u.last_name || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term)
    );
  }

  // Custom sorting: Admin > Tabulator
  filtered.sort((a, b) => {
    const rolePriority = { admin: 0, tabulator: 1, judge: 2 };
    const priorityA = rolePriority[a.role] ?? 99;
    const priorityB = rolePriority[b.role] ?? 99;

    if (priorityA !== priorityB) return priorityA - priorityB;

    // Secondary sort by name or ID
    if (sortField.value === "name") {
      const nameA = `${a.first_name || ""} ${a.last_name || ""}`.toLowerCase();
      const nameB = `${b.first_name || ""} ${b.last_name || ""}`.toLowerCase();
      return sortDirection.value === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    } else {
      const valueA = a.user_id || 0;
      const valueB = b.user_id || 0;
      return sortDirection.value === "asc" ? valueA - valueB : valueB - valueA;
    }
  });

  return filtered;
});

// Create user
const createUser = async (userData) => {
  serverError.value = "";
  isLoading.value = true;

  try {
    const response = await axiosClient.post("/api/v1/users", userData);
    console.log("User created response:", response);

    const newUser = response?.data?.data || response?.data;

    if (!newUser || !newUser.user_id) {
      console.error("Invalid user data received:", response);
      toast.error("User created but response format is invalid");
      await fetchUsers();
      showCreateModal.value = false;
      return { success: true };
    }

    toast.success(response.data?.message || "User created successfully.");
    users.value.push(newUser);
    showCreateModal.value = false;

    return { success: true };
  } catch (error) {
    console.error("Create user error:", error);
    if (error.response?.status === 422) {
      const errs = error.response.data.errors;
      const firstKey = Object.keys(errs)[0];
      toast.error(`${firstKey}: ${errs[firstKey][0]}`);
      return { success: false, errors: errs };
    } else {
      const fallback =
        error.response?.data?.message || "Failed to create user.";
      toast.error(fallback);
      return { success: false, message: fallback };
    }
  } finally {
    isLoading.value = false;
  }
};

// Open edit modal
const openEditModal = (user) => {
  editUser.value = {
    user_id: user.user_id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    password: "",
  };
  showEditModal.value = true;
};

// Update user
const updateUser = async (userData) => {
  serverError.value = "";
  try {
    const payload = { ...userData };
    if (!payload.password) delete payload.password;
    if (payload.role === "judge") delete payload.role;

    const response = await axiosClient.patch(
      `/api/v1/users/${userData.user_id}`,
      payload
    );

    if (!response || !response.user) {
      throw new Error("Invalid response from server");
    }

    toast.success(response.message || "User updated.");
    const index = users.value.findIndex((u) => u.user_id === userData.user_id);
    users.value[index] = response.user;
    showEditModal.value = false;
  } catch (error) {
    console.error("Update user error:", error);
    serverError.value =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to update user.";
    toast.error(serverError.value);
  }
};

// Confirm delete
const confirmDelete = (user) => {
  userToDelete.value = user;
  showDeleteConfirm.value = true;
};

// Delete user
const deleteUser = async () => {
  serverError.value = "";
  try {
    await axiosClient.delete(`/api/v1/users/${userToDelete.value.user_id}`);
    console.log("User deleted:", userToDelete.value.user_id);
    toast.success("User deleted successfully.");
    users.value = users.value.filter(
      (u) => u.user_id !== userToDelete.value.user_id
    );
    showDeleteConfirm.value = false;
    userToDelete.value = null;
  } catch (error) {
    console.error("Delete user error:", error);
    serverError.value =
      error.response?.data?.message || "Failed to delete user.";
    toast.error(serverError.value);
  }
};

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredUsers.value
    .slice(start, start + itemsPerPage)
    .filter((user) => user && user.user_id);
});

const totalPages = computed(() =>
  Math.ceil(filteredUsers.value.length / itemsPerPage)
);

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

function handleImageError(event) {
  event.target.src = "/user24.png";
}

function toggleRoleDropdown(userId) {
  dropdownVisible.value = dropdownVisible.value === userId ? null : userId;
}

function capitalizeRole(role) {
  if (!role) return "";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function confirmRoleChange(user, role) {
  dropdownVisible.value = null;
  roleChangeTarget.value = user;
  pendingRole.value = role;
  showRoleConfirmModal.value = true;
}

function handleClickOutside(event) {
  const dropdowns = document.querySelectorAll(".role-dropdown");

  const isInsideAnyDropdown = Array.from(dropdowns).some((dropdown) =>
    dropdown.contains(event.target)
  );

  if (!isInsideAnyDropdown) {
    dropdownVisible.value = null;
  }
}

async function updateUserRole() {
  if (!roleChangeTarget.value || !pendingRole.value) return;

  const updatedUser = {
    ...roleChangeTarget.value,
    role: pendingRole.value,
    password: "",
  };

  try {
    await updateUser(updatedUser);
    toast.success("User role updated.");

    dropdownVisible.value = null;
    showRoleConfirmModal.value = false;
    roleChangeTarget.value = null;
    pendingRole.value = null;
  } catch (error) {
    console.error("Role update failed:", error);
    toast.error("Failed to update user role.");
  }
}

// Check authentication
onMounted(async () => {
  if (!userStore.isAuthenticated) {
    try {
      await userStore.fetchUser();
      console.log("UserList: User fetched:", userStore.user);
    } catch (error) {
      console.error("UserList: Failed to fetch user:", error);
      serverError.value = "Authentication failed. Redirecting to login...";
      toast.error(serverError.value);
      setTimeout(() => router.push("/login"), 2000);
      return;
    }
  }
  await fetchUsers();
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div
    class="min-h-screen overflow-auto transition-colors duration-300"
    :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-100'"
  >
    <div class="transition-all duration-300">
      <!-- Breadcrumbs -->
      <div class="mt-4 mx-4 rounded-lg">
        <Breadcrumbs
          :items="[{ label: 'Home', to: 'auto' }, { label: 'Users' }]"
        />
      </div>

      <!-- Main Card -->
      <div
        class="rounded-lg shadow-md p-6 mt-4 mx-4 transition-colors duration-300"
        :class="isDarkMode ? 'bg-gray-800' : 'bg-white'"
      >
        <!-- Header -->
        <div class="flex justify-between items-center pt-2 pb-0 mb-4">
          <div class="flex items-center space-x-3">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center"
              :class="
                isDarkMode
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-green-100 text-green-600'
              "
            >
              <i class="fas fa-users text-lg"></i>
            </div>
            <div>
              <h1
                class="text-xl font-bold transition-colors duration-200"
                :class="isDarkMode ? 'text-white' : 'text-gray-800'"
              >
                User Management
              </h1>
              <p
                class="text-sm transition-colors duration-200"
                :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
              >
                Manage system users and roles
              </p>
            </div>
          </div>
          <!-- Simplified header - only Add User button -->
          <div class="flex space-x-3">
            <button
              @click="showCreateModal = true"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
              :class="
                isDarkMode
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              "
            >
              <i class="fas fa-plus mr-2"></i>
              Add User
            </button>
          </div>
        </div>

        <!-- Server Error -->
        <div
          v-if="serverError"
          class="border px-4 py-3 rounded-lg relative mb-4 transition-colors duration-300"
          :class="
            isDarkMode
              ? 'bg-red-900/30 border-red-400 text-red-300'
              : 'bg-red-50 border-red-200 text-red-800'
          "
          role="alert"
        >
          <div class="flex items-center">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span>{{ serverError }}</span>
          </div>
        </div>

        <!-- Filters and Search -->
        <div
          class="border rounded-xl p-6 mb-6 transition-colors duration-300"
          :class="
            isDarkMode
              ? 'bg-gray-700/50 border-gray-600'
              : 'bg-gray-50 border-gray-200'
          "
        >
          <div
            class="flex flex-col md:flex-row justify-between items-center gap-4"
          >
            <!-- Filters -->
            <div class="flex items-center space-x-3">
              <label
                class="text-sm font-medium transition-colors duration-200"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              >
                Filter by Role:
              </label>
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                >
                  <i
                    class="fas fa-filter text-sm transition-colors duration-200"
                    :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
                  ></i>
                </div>
                <select
                  v-model="filterRole"
                  @change="fetchUsers"
                  class="block appearance-none border rounded-lg pl-10 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all duration-200"
                  :class="
                    isDarkMode
                      ? 'border-gray-600 bg-gray-600 text-gray-200 focus:ring-green-400 focus:border-green-400'
                      : 'border-gray-300 bg-white text-gray-700 focus:ring-green-500 focus:border-green-500'
                  "
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="tabulator">Tabulator</option>
                  <option value="judge">Judge</option>
                </select>
                <div
                  class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                >
                  <i
                    class="fas fa-chevron-down text-sm transition-colors duration-200"
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                  ></i>
                </div>
              </div>
            </div>

            <!-- Search -->
            <div class="relative w-full md:w-80">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <i
                  class="fas fa-search transition-colors duration-200"
                  :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
                ></i>
              </div>
              <input
                v-model="searchTerm"
                type="search"
                placeholder="Search by name or email..."
                class="pl-10 pr-4 py-2.5 border rounded-lg w-full focus:outline-none focus:ring-2 text-sm transition-all duration-200"
                :class="
                  isDarkMode
                    ? 'border-gray-600 bg-gray-600 text-gray-100 focus:ring-green-400 focus:border-green-400 placeholder-gray-400'
                    : 'border-gray-300 bg-white text-gray-900 focus:ring-green-500 focus:border-green-500 placeholder-gray-500'
                "
              />
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center items-center py-12">
          <div class="text-center">
            <i
              class="fas fa-spinner fa-spin text-3xl mb-4"
              :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
            ></i>
            <p
              class="text-sm"
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
            >
              Loading users...
            </p>
          </div>
        </div>

        <!-- User List Card Grid -->
        <div v-else class="overflow-x-auto">
          <div
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            <div
              v-for="user in paginatedUsers"
              :key="user?.user_id"
              class="group rounded-xl border shadow-sm p-6 flex flex-col relative transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 hover:shadow-gray-900/20 hover:border-gray-500'
                  : 'bg-white border-gray-200 hover:shadow-gray-200/50 hover:border-gray-300'
              "
            >
              <!-- Delete Icon (Top Right) -->
              <div class="absolute top-3 right-3">
                <button
                  @click="confirmDelete(user)"
                  class="opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-all duration-200 transform hover:scale-110"
                  :class="
                    isDarkMode
                      ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300'
                      : 'hover:bg-red-50 text-red-500 hover:text-red-700'
                  "
                  title="Delete user"
                >
                  <i class="fas fa-trash text-sm"></i>
                </button>
              </div>

              <!-- Profile Image -->
              <div class="mb-4 flex justify-center">
                <div class="relative">
                  <img
                    :src="user.profile_photo || '/user24.png'"
                    alt="Profile"
                    class="w-20 h-20 rounded-full object-cover border-3 shadow-lg transition-all duration-300 group-hover:shadow-xl"
                    :class="
                      isDarkMode
                        ? 'border-green-400 group-hover:border-green-300'
                        : 'border-green-500 group-hover:border-green-400'
                    "
                    @error="handleImageError"
                  />
                  <!-- Online indicator -->
                  <div
                    class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    :class="
                      isDarkMode
                        ? 'bg-green-500 border-gray-700'
                        : 'bg-green-500 border-white'
                    "
                  >
                    <i class="fas fa-check text-white text-xs"></i>
                  </div>
                </div>
              </div>

              <!-- Name -->
              <h3
                class="text-lg font-semibold text-center mb-3 transition-colors duration-200"
                :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'"
              >
                {{ user.first_name }} {{ user.last_name }}
              </h3>

              <!-- User Details -->
              <div class="space-y-2 mb-4 flex-grow">
                <!-- Email -->
                <div
                  class="flex items-center text-sm transition-colors duration-200"
                  :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
                >
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
                    :class="
                      isDarkMode
                        ? 'bg-blue-900/30 text-blue-400'
                        : 'bg-blue-100 text-blue-600'
                    "
                  >
                    <i class="fas fa-envelope text-xs"></i>
                  </div>
                  <span class="truncate">{{ user.email }}</span>
                </div>

                <!-- Username -->
                <div
                  class="flex items-center text-sm transition-colors duration-200"
                  :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'"
                >
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
                    :class="
                      isDarkMode
                        ? 'bg-purple-900/30 text-purple-400'
                        : 'bg-purple-100 text-purple-600'
                    "
                  >
                    <i class="fas fa-user text-xs"></i>
                  </div>
                  <span class="truncate">{{ user.username }}</span>
                </div>
              </div>

              <!-- Role Dropdown -->
              <div class="relative role-dropdown">
                <button
                  class="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  :class="
                    user.role !== 'judge'
                      ? isDarkMode
                        ? 'bg-green-900/30 text-green-300 hover:bg-green-800/40 border border-green-700/50 focus:ring-green-400'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 focus:ring-green-500'
                      : isDarkMode
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-600'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'
                  "
                  :disabled="user.role === 'judge'"
                  @click="
                    user.role !== 'judge' && toggleRoleDropdown(user.user_id)
                  "
                >
                  <i
                    class="fas mr-2"
                    :class="{
                      'fa-user-shield': user.role === 'admin',
                      'fa-user-cog': user.role === 'tabulator',
                      'fa-user': user.role === 'judge',
                    }"
                  ></i>
                  {{ capitalizeRole(user.role) }}
                  <i
                    v-if="user.role !== 'judge'"
                    class="fas fa-chevron-down ml-2 text-xs transition-transform duration-200"
                    :class="{ 'rotate-180': dropdownVisible === user.user_id }"
                  ></i>
                </button>

                <!-- Role Options -->
                <div
                  v-if="dropdownVisible === user.user_id"
                  class="absolute top-full left-0 right-0 z-20 mt-2 border rounded-lg shadow-xl transition-all duration-200 transform origin-top animate-in fade-in slide-in-from-top-2"
                  :class="
                    isDarkMode
                      ? 'bg-gray-600 border-gray-500'
                      : 'bg-white border-gray-200'
                  "
                >
                  <div class="py-2">
                    <button
                      v-for="option in ['admin', 'tabulator']"
                      :key="option"
                      :disabled="user.role === option"
                      class="flex items-center w-full px-4 py-3 text-sm text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed first:rounded-t-lg last:rounded-b-lg"
                      :class="
                        user.role === option
                          ? isDarkMode
                            ? 'bg-green-900/20 text-green-300'
                            : 'bg-green-50 text-green-700'
                          : isDarkMode
                          ? 'text-gray-300 hover:bg-gray-500 hover:text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      "
                      @click.prevent="confirmRoleChange(user, option)"
                    >
                      <div
                        class="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                        :class="
                          option === 'admin'
                            ? isDarkMode
                              ? 'bg-blue-900/30 text-blue-400'
                              : 'bg-blue-100 text-blue-600'
                            : isDarkMode
                            ? 'bg-purple-900/30 text-purple-400'
                            : 'bg-purple-100 text-purple-600'
                        "
                      >
                        <i
                          class="fas text-xs"
                          :class="{
                            'fa-user-shield': option === 'admin',
                            'fa-user-cog': option === 'tabulator',
                          }"
                        ></i>
                      </div>
                      <div>
                        <div class="font-medium">
                          {{ capitalizeRole(option) }}
                        </div>
                        <div
                          class="text-xs opacity-75"
                          :class="
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          "
                        >
                          {{
                            option === "admin"
                              ? "Full system access"
                              : "Event management"
                          }}
                        </div>
                      </div>
                      <i
                        v-if="user.role === option"
                        class="fas fa-check ml-auto text-green-500"
                      ></i>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Edit Button -->
              <button
                @click="openEditModal(user)"
                class="mt-3 w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                :class="
                  isDarkMode
                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500 focus:ring-gray-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 focus:ring-gray-400'
                "
              >
                <i class="fas fa-edit mr-2"></i>
                Edit User
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="!paginatedUsers.length && !isLoading"
            class="text-center py-12"
          >
            <div
              class="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
              :class="
                isDarkMode
                  ? 'bg-gray-700 text-gray-500'
                  : 'bg-gray-100 text-gray-400'
              "
            >
              <i class="fas fa-users text-3xl"></i>
            </div>
            <h3
              class="text-lg font-medium mb-2"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              No users found
            </h3>
            <p
              class="text-sm mb-6"
              :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'"
            >
              Try adjusting your search or filter criteria
            </p>
            <button
              @click="showCreateModal = true"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-green-600 hover:bg-green-700'
              "
            >
              <i class="fas fa-plus mr-2"></i>
              Create First User
            </button>
          </div>
        </div>

        <!-- Pagination Controls -->
        <div
          v-if="paginatedUsers.length"
          class="border rounded-xl shadow-sm p-4 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors duration-300"
          :class="
            isDarkMode
              ? 'bg-gray-700/50 border-gray-600'
              : 'bg-gray-50 border-gray-200'
          "
        >
          <div
            class="text-sm transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
          >
            Showing
            <span class="font-medium">
              {{ (currentPage - 1) * itemsPerPage + 1 }}
            </span>
            to
            <span class="font-medium">
              {{
                Math.min(
                  (currentPage - 1) * itemsPerPage + paginatedUsers.length,
                  filteredUsers.length
                )
              }}
            </span>
            of
            <span class="font-medium">{{ filteredUsers.length }}</span>
            results
          </div>

          <div class="flex items-center space-x-2">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="p-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="
                isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
              "
            >
              <i class="fas fa-chevron-left"></i>
            </button>

            <div class="flex items-center space-x-1">
              <span
                v-for="page in Math.min(totalPages, 5)"
                :key="page"
                class="px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200"
                :class="
                  currentPage === page
                    ? isDarkMode
                      ? 'bg-green-600 text-white'
                      : 'bg-green-600 text-white'
                    : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-600'
                    : 'text-gray-600 hover:bg-gray-100'
                "
                @click="goToPage(page)"
              >
                {{ page }}
              </span>
            </div>

            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="p-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="
                isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
              "
            >
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- Role Change Confirmation Modal -->
        <div
          v-if="showRoleConfirmModal"
          class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-all duration-300"
          :class="isDarkMode ? 'bg-black/60' : 'bg-black/40'"
        >
          <div
            class="p-6 rounded-xl shadow-2xl w-full max-w-md mx-4 transition-all duration-300 transform"
            :class="
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            "
          >
            <div class="flex items-center mb-4">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                :class="
                  isDarkMode
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : 'bg-yellow-100 text-yellow-600'
                "
              >
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <h3
                class="text-lg font-bold transition-colors duration-200"
                :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'"
              >
                Confirm Role Change
              </h3>
            </div>

            <div
              class="p-4 rounded-lg mb-6"
              :class="
                isDarkMode
                  ? 'bg-gray-700/50 border border-gray-600'
                  : 'bg-gray-50 border border-gray-200'
              "
            >
              <p
                class="text-sm mb-3 transition-colors duration-200"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              >
                You are about to change the role of:
              </p>
              <div class="flex items-center space-x-3">
                <img
                  :src="roleChangeTarget?.profile_photo || '/user24.png'"
                  alt="Profile"
                  class="w-10 h-10 rounded-full object-cover"
                  @error="handleImageError"
                />
                <div>
                  <div
                    class="font-medium"
                    :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'"
                  >
                    {{ roleChangeTarget?.first_name }}
                    {{ roleChangeTarget?.last_name }}
                  </div>
                  <div
                    class="text-sm"
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
                  >
                    {{ roleChangeTarget?.email }}
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-center my-4">
                <i
                  class="fas fa-arrow-right text-2xl"
                  :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
                ></i>
              </div>

              <div class="text-center">
                <span
                  class="text-sm"
                  :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
                >
                  New role:
                </span>
                <div
                  class="inline-flex items-center px-3 py-1 mt-1 text-sm font-medium rounded-full"
                  :class="
                    isDarkMode
                      ? 'bg-green-900/30 text-green-300'
                      : 'bg-green-100 text-green-800'
                  "
                >
                  <i
                    class="fas mr-2"
                    :class="{
                      'fa-user-shield': pendingRole === 'admin',
                      'fa-user-cog': pendingRole === 'tabulator',
                    }"
                  ></i>
                  {{ capitalizeRole(pendingRole) }}
                </div>
              </div>
            </div>

            <div class="flex space-x-3">
              <button
                @click="showRoleConfirmModal = false"
                class="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                :class="
                  isDarkMode
                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500 focus:ring-gray-400'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400'
                "
              >
                Cancel
              </button>
              <button
                @click="updateUserRole"
                class="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                :class="
                  isDarkMode
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                "
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>

        <!-- Modals -->
        <CreateUserForm
          v-if="showCreateModal"
          @submit="createUser"
          @cancel="showCreateModal = false"
        />
        <EditUserForm
          v-if="showEditModal"
          :user="editUser"
          @submit="updateUser"
          @cancel="showEditModal = false"
        />
        <DeleteUserModal
          v-if="showDeleteConfirm"
          :user="userToDelete"
          @confirm="deleteUser"
          @cancel="showDeleteConfirm = false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animation classes for dropdown */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slide-in-from-top-2 {
  from {
    transform: translateY(-8px);
  }
  to {
    transform: translateY(0);
  }
}

.animate-in {
  animation: fade-in 0.2s ease-out, slide-in-from-top-2 0.2s ease-out;
}

.rotate-180 {
  transform: rotate(180deg);
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.7);
}
</style>

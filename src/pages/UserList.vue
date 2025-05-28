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
const sortField = ref("id"); // Default sort field: ID
const sortDirection = ref("asc"); // Default direction: ascending
const serverError = ref("");
const selectedUsers = ref([]); // Track selected user IDs
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

// Select All checkbox state
const allSelected = computed({
  get() {
    return (
      filteredUsers.value.length > 0 &&
      filteredUsers.value.every((user) =>
        selectedUsers.value.includes(user.user_id)
      )
    );
  },
  set(value) {
    if (value) {
      selectedUsers.value = filteredUsers.value.map((user) => user.user_id);
    } else {
      selectedUsers.value = [];
    }
  },
});

// Some users selected (for indeterminate state)
const someSelected = computed(
  () => selectedUsers.value.length > 0 && !allSelected.value
);

// Fetch users
const fetchUsers = async () => {
  isLoading.value = true;
  try {
    const params = filterRole.value ? { role: filterRole.value } : {};
    const response = await axiosClient.get("/api/v1/users", { params });
    users.value = response.data ?? response; // fallback
    if (users.value && users.value.data) {
      users.value = users.value.data;
    }
    console.log("Users fetched:", users.value);
    // Clear selections for users no longer in the list
    selectedUsers.value = selectedUsers.value.filter((id) =>
      users.value.some((user) => user.user_id === id)
    );
  } catch (error) {
    console.error("Fetch users error:", error);
    if (error.response?.status === 422) {
      throw error.response.data.errors;
    } else {
      const fallbackMessage = error?.message || "Failed to update user.";
      serverError.value = error.response?.data?.message || fallbackMessage;
      toast.error(serverError.value);
    }
  } finally {
    isLoading.value = false;
  }
};

// Filtered and sorted users
// Filtered and sorted users - FIXED
const filteredUsers = computed(() => {
  if (!Array.isArray(users.value)) return [];

  // Filter out any undefined/null users first
  let filtered = users.value.filter(
    (user) => user && user.user_id && user.role
  );

  // 🔁 Exclude judges unless explicitly filtered
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

  // 🔁 Custom sorting: Admin > Tabulator (Judges already excluded unless filtered)
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
    console.log("User created response:", response); // Debug log

    // Safely access the new user data
    const newUser = response?.data?.data || response?.data;

    if (!newUser || !newUser.user_id) {
      console.error("Invalid user data received:", response);
      toast.error("User created but response format is invalid");
      await fetchUsers(); // Refresh the list instead
      showCreateModal.value = false;
      return { success: true };
    }

    toast.success(response.data?.message || "User created successfully.");

    // Safely push the new user
    users.value.push(newUser);

    // Close the modal
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

    // Remove role if it's judge (to avoid validation error)
    if (payload.role === "judge") delete payload.role;

    const response = await axiosClient.patch(
      `/api/v1/users/${userData.user_id}`,
      payload
    );

    // Safely access response structure
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
    await axiosClient.get("/api/csrf-cookie");
    await axiosClient.delete(`/api/v1/users/${userToDelete.value.user_id}`);
    console.log("User deleted:", userToDelete.value.user_id);
    toast.success("User deleted successfully.");
    users.value = users.value.filter(
      (u) => u.user_id !== userToDelete.value.user_id
    );
    selectedUsers.value = selectedUsers.value.filter(
      (id) => id !== userToDelete.value.user_id
    );
    showDeleteConfirm.value = false;
    userToDelete.value = null;
  } catch (error) {
    console.error(
      "Delete user error:",
      JSON.stringify(error.response?.data, null, 2)
    );
    serverError.value =
      error.response?.data?.message || "Failed to delete user.";
    toast.error(serverError.value);
  }
};

// Delete selected users
const deleteSelected = async () => {
  serverError.value = "";
  const currentUserId = userStore.user?.user_id;
  const usersToDelete = selectedUsers.value.filter(
    (id) => id !== currentUserId
  );

  if (usersToDelete.length === 0) {
    toast.error("No valid users selected for deletion.");
    return;
  }

  try {
    await axiosClient.get("/api/csrf-cookie");
    const response = await axiosClient.post("/api/v1/users/bulk-delete", {
      user_ids: usersToDelete,
    });
    console.log("Bulk delete response:", response.data);

    users.value = users.value.filter(
      (u) => !response.data.success.includes(u.user_id)
    );
    selectedUsers.value = selectedUsers.value.filter(
      (id) => !response.data.success.includes(id)
    );

    if (response.data.failed.length === 0) {
      toast.success("Selected users deleted successfully.");
    } else {
      const errorMessage =
        response.data.failed.length === usersToDelete.length
          ? "Failed to delete all selected users."
          : `Failed to delete ${response.data.failed.length} of ${usersToDelete.length} users.`;
      serverError.value = errorMessage;
      toast.error(
        `${errorMessage} ${response.data.failed
          .map((f) => `User ${f.id}: ${f.message}`)
          .join("; ")}`
      );
    }
  } catch (error) {
    console.error(
      "Bulk delete error:",
      JSON.stringify(error.response?.data, null, 2)
    );
    serverError.value =
      error.response?.data?.message || "Failed to delete users.";
    toast.error(serverError.value);

    // Fallback to individual DELETEs
    const failedDeletions = [];
    console.log("Falling back to individual DELETEs:", usersToDelete);

    const results = await Promise.allSettled(
      usersToDelete.map(async (id) => {
        try {
          await axiosClient.get("/api/csrf-cookie");
          await axiosClient.delete(`/api/v1/users/${id}`);
          return { id, status: "fulfilled" };
        } catch (error) {
          console.error(
            `Failed to delete user ${id}:`,
            JSON.stringify(error.response?.data, null, 2)
          );
          throw { id, error };
        }
      })
    );

    results.forEach((result) => {
      if (result.status === "rejected") {
        failedDeletions.push({
          id: result.reason.id,
          message:
            result.reason.error.response?.data?.message ||
            "Failed to delete user.",
        });
      }
    });

    users.value = users.value.filter(
      (u) =>
        !usersToDelete.includes(u.user_id) ||
        failedDeletions.some((f) => f.id === u.user_id)
    );
    selectedUsers.value = selectedUsers.value.filter((id) =>
      failedDeletions.some((f) => f.id === id)
    );

    if (failedDeletions.length === 0 && usersToDelete.length > 0) {
      toast.success("Selected users deleted successfully (fallback).");
    } else if (failedDeletions.length > 0) {
      const errorMessage =
        failedDeletions.length === usersToDelete.length
          ? "Failed to delete all selected users (fallback)."
          : `Failed to delete ${failedDeletions.length} of ${usersToDelete.length} users (fallback).`;
      serverError.value = errorMessage;
      toast.error(
        `${errorMessage} ${failedDeletions
          .map((f) => `User ${f.id}: ${f.message}`)
          .join("; ")}`
      );
    }
  }
};

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredUsers.value
    .slice(start, start + itemsPerPage)
    .filter((user) => user && user.user_id); // Extra safety check
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
  dropdownVisible.value = null; // 🔁 Close dropdown first
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
    password: "", // optional
  };

  try {
    await updateUser(updatedUser);
    toast.success("User role updated.");

    // 🔁 Reset UI states
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
          <div class="flex items-center space-x-2">
            <i
              class="fas fa-users text-2xl mb-1 transition-colors duration-200"
              :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
            ></i>
            <h1
              class="text-lg font-bold transition-colors duration-200"
              :class="isDarkMode ? 'text-green-300' : 'text-green-800'"
            >
              User Management
            </h1>
          </div>
          <div class="flex space-x-2">
            <button
              v-if="selectedUsers.length"
              @click="deleteSelected"
              class="px-4 py-2 text-white rounded-md focus:outline-none transition-colors duration-200"
              :class="
                isDarkMode
                  ? 'bg-red-700 hover:bg-red-600'
                  : 'bg-red-600 hover:bg-red-700'
              "
            >
              <i class="fas fa-trash mr-2"></i>
              Delete Selected
            </button>
            <button
              @click="showCreateModal = true"
              class="px-4 py-2 text-white rounded-md focus:outline-none transition-colors duration-200"
              :class="
                isDarkMode
                  ? 'bg-green-700 hover:bg-green-600'
                  : 'bg-green-600 hover:bg-green-700'
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
          class="border px-4 py-3 rounded relative mb-4 transition-colors duration-300"
          :class="
            isDarkMode
              ? 'bg-red-900/30 border-red-400 text-red-300'
              : 'bg-red-200 border-red-500 text-red-800'
          "
          role="alert"
        >
          <span class="block sm:inline">{{ serverError }}</span>
        </div>

        <!-- Filters and Search -->
        <div
          class="border rounded-lg p-4 mb-6 transition-colors duration-300"
          :class="
            isDarkMode
              ? 'bg-gray-700 border-gray-600'
              : 'bg-white border-gray-200'
          "
        >
          <div
            class="flex flex-col md:flex-row justify-between items-center gap-4"
          >
            <!-- Filters -->
            <div class="flex items-center space-x-2 w-full md:w-40">
              <div
                class="relative w-full max-w-xs overflow-x-auto overflow-y-auto"
              >
                <!-- Left filter icon -->
                <div
                  class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                >
                  <i
                    class="fas fa-filter text-sm transition-colors duration-200"
                    :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
                  ></i>
                </div>

                <!-- Right chevron icon -->
                <div
                  class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                >
                  <i
                    class="fas fa-chevron-down text-sm transition-colors duration-200"
                    :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
                  ></i>
                </div>

                <!-- Dropdown select -->
                <select
                  v-model="filterRole"
                  @change="fetchUsers"
                  class="block w-full appearance-none border rounded-lg pl-10 pr-8 py-2 text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
                  :class="
                    isDarkMode
                      ? 'border-green-600 bg-gray-600 text-gray-300 focus:ring-green-400 hover:bg-gray-500'
                      : 'border-green-300 bg-white text-gray-700 focus:ring-green-600 hover:bg-green-50'
                  "
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="tabulator">Tabulator</option>
                  <option value="judge">Judge</option>
                </select>
              </div>
            </div>

            <!-- Search -->
            <div class="relative w-full md:w-300">
              <i
                class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200"
                :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
              ></i>
              <input
                v-model="searchTerm"
                type="search"
                placeholder="Search by name or email"
                class="pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 text-sm transition-colors duration-200"
                :class="
                  isDarkMode
                    ? 'border-gray-600 bg-gray-600 text-gray-100 focus:ring-green-400 placeholder-gray-400'
                    : 'border-gray-300 bg-white text-gray-900 focus:ring-green-600 placeholder-gray-500'
                "
              />
            </div>
          </div>
        </div>

        <!-- User List Card Grid -->
        <div class="overflow-x-auto">
          <div
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            <div
              v-for="user in paginatedUsers"
              :key="user?.user_id"
              class="rounded-lg border shadow-md p-4 flex flex-col relative transition-all duration-300"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 hover:shadow-gray-800/40'
                  : 'bg-white border-gray-200 hover:shadow-lg'
              "
              name="card"
            >
              <!-- delete icon -->
              <div class="absolute top-2 right-2">
                <button
                  @click="confirmDelete(user)"
                  class="p-1 rounded-full transition-colors duration-200"
                  :class="
                    isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                  "
                >
                  <i
                    class="fas fa-trash transition-colors duration-200"
                    :class="
                      isDarkMode
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-red-500 hover:text-red-700'
                    "
                  ></i>
                </button>
              </div>

              <!-- profile image -->
              <div class="mb-4 flex justify-center">
                <img
                  :src="user.profile_photo || '/user24.png'"
                  alt="Profile"
                  class="w-16 h-16 rounded-full object-cover border-2 shadow-sm transition-colors duration-200"
                  :class="isDarkMode ? 'border-green-400' : 'border-green-500'"
                  @error="handleImageError"
                />
              </div>

              <!-- Name -->
              <h3
                class="text-lg font-semibold text-center mb-2 transition-colors duration-200"
                :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'"
              >
                {{ user.first_name }} {{ user.last_name }}
              </h3>

              <!-- Email -->
              <div
                class="flex items-center justify-start text-sm mb-1 transition-colors duration-200"
                :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
              >
                <i
                  class="fas fa-envelope mr-2 transition-colors duration-200"
                  :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
                ></i>
                <span class="truncate">{{ user.email }}</span>
              </div>

              <!-- Username -->
              <div
                class="flex items-center justify-start text-xs mb-3 transition-colors duration-200"
                :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'"
              >
                <i
                  class="fas fa-user mr-2 transition-colors duration-200"
                  :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
                ></i>
                <span class="truncate">{{ user.username }}</span>
              </div>

              <!-- Centered Role dropdown -->
              <div
                class="relative mt-2 w-full flex justify-center role-dropdown"
              >
                <button
                  class="inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-full transition-colors duration-200"
                  :class="
                    user.role !== 'judge'
                      ? isDarkMode
                        ? 'bg-green-900/30 text-green-300 hover:bg-green-800/40'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                      : isDarkMode
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
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
                    class="fas fa-caret-down ml-2 text-xs"
                  ></i>
                </button>

                <!-- Role Options -->
                <div
                  v-if="dropdownVisible === user.user_id"
                  class="absolute z-10 mt-2 w-40 border rounded shadow-lg transition-colors duration-200"
                  :class="
                    isDarkMode
                      ? 'bg-gray-600 border-gray-500'
                      : 'bg-white border-gray-200'
                  "
                >
                  <button
                    v-for="option in ['admin', 'tabulator']"
                    :key="option"
                    :disabled="user.role === option"
                    class="flex items-center w-full px-4 py-2 text-sm text-left transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :class="
                      isDarkMode
                        ? 'text-gray-300 hover:bg-green-800/30'
                        : 'text-gray-700 hover:bg-green-100'
                    "
                    @click.prevent="confirmRoleChange(user, option)"
                  >
                    <i
                      class="fas mr-2"
                      :class="{
                        'fa-user-shield': option === 'admin',
                        'fa-user-cog': option === 'tabulator',
                      }"
                    ></i>
                    {{ capitalizeRole(option) }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination Controls -->
        <div
          class="border rounded-lg shadow-md p-4 mt-6 mx-4 flex justify-between items-center transition-colors duration-300"
          :class="
            isDarkMode
              ? 'bg-gray-700 border-gray-600'
              : 'bg-white border-gray-200'
          "
        >
          <span
            class="text-sm transition-colors duration-200"
            :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
          >
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
            {{
              Math.min(
                (currentPage - 1) * itemsPerPage + paginatedUsers.length,
                filteredUsers.length
              )
            }}
            of {{ filteredUsers.length }} results
          </span>

          <div
            class="flex items-center border rounded overflow-hidden shadow-sm"
          >
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="px-3 py-1 transition-colors duration-200 disabled:opacity-40"
              :class="
                isDarkMode
                  ? 'bg-gray-600 text-green-400 hover:bg-gray-500'
                  : 'bg-white text-green-600 hover:bg-gray-100'
              "
            >
              <i class="fas fa-chevron-left"></i>
            </button>

            <span
              class="px-4 py-1.5 text-white text-sm font-semibold select-none transition-colors duration-200"
              :class="isDarkMode ? 'bg-green-700' : 'bg-green-600'"
            >
              {{ currentPage }}
            </span>

            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="px-3 py-1 transition-colors duration-200 disabled:opacity-40"
              :class="
                isDarkMode
                  ? 'bg-gray-600 text-green-400 hover:bg-gray-500'
                  : 'bg-white text-green-600 hover:bg-gray-100'
              "
            >
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- Role Change Confirmation Modal -->
        <div
          v-if="showRoleConfirmModal"
          class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          :class="isDarkMode ? 'bg-black/60' : 'bg-black/40'"
        >
          <div
            class="p-6 rounded-lg shadow-md w-full max-w-md transition-colors duration-300"
            :class="isDarkMode ? 'bg-gray-800' : 'bg-white'"
          >
            <h3
              class="text-lg font-bold mb-4 transition-colors duration-200"
              :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'"
            >
              Confirm Role Change
            </h3>
            <p
              class="text-sm mb-6 transition-colors duration-200"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Are you sure you want to change the role of
              <strong
                >{{ roleChangeTarget?.first_name }}
                {{ roleChangeTarget?.last_name }}</strong
              >
              to <strong class="capitalize">{{ pendingRole }}</strong
              >?
            </p>
            <div class="flex justify-end gap-3">
              <button
                @click="showRoleConfirmModal = false"
                class="px-4 py-2 text-sm rounded transition-colors duration-200"
                :class="
                  isDarkMode
                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                "
              >
                Cancel
              </button>
              <button
                @click="updateUserRole"
                class="px-4 py-2 text-sm text-white rounded transition-colors duration-200"
                :class="
                  isDarkMode
                    ? 'bg-green-700 hover:bg-green-600'
                    : 'bg-green-600 hover:bg-green-700'
                "
              >
                Confirm
              </button>
            </div>
          </div>
        </div>

        <!-- Modals (no changes) -->
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
table {
  width: 100%;
}
th,
td {
  text-align: left;
}

.card-enter-active,
.card-leave-active {
  transition: all 0.3s ease;
}
.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

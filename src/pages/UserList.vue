<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useSidebarStore } from "@/sidebar";
import { useToast } from "vue-toastification";
import axiosClient from "@/axios";
import { useWindowSize } from "@/composables/useWindowSize";
import Navbar from "@/components/layout/Navbar.vue";
import Sidebar from "@/components/layout/Sidebar.vue";
import CreateUserForm from "@/components/forms/CreateUserForm.vue";
import EditUserForm from "@/components/forms/EditUserForm.vue";
import DeleteUserModal from "@/components/forms/DeleteUserModal.vue";
import UserListSortDropdown from "@/components/ui/UserListSortDropdown.vue";

const router = useRouter();
const userStore = useUserStore();
const sidebar = useSidebarStore();
const toast = useToast();
const { windowWidth } = useWindowSize();

const users = ref([]);
const filterRole = ref("");
const sortField = ref("id"); // Default sort field: ID
const sortDirection = ref("asc"); // Default direction: ascending
const serverError = ref("");
const selectedUsers = ref([]); // Track selected user IDs

// Create user modal
const showCreateModal = ref(false);

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

// Delete confirmation
const showDeleteConfirm = ref(false);
const userToDelete = ref(null);

// Dynamic layout shift
const layoutShift = computed(() =>
  sidebar.isOpen && windowWidth.value >= 1024 ? "ml-64" : "ml-0"
);

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
  try {
    const params = filterRole.value ? { role: filterRole.value } : {};
    const response = await axiosClient.get("/api/v1/users", { params });
    users.value = response.data;
    console.log("Users fetched:", users.value);
    // Clear selections for users no longer in the list
    selectedUsers.value = selectedUsers.value.filter((id) =>
      users.value.some((user) => user.user_id === id)
    );
  } catch (error) {
    console.error("Fetch users error:", error);
    serverError.value =
      error.response?.data?.message || "Failed to fetch users.";
    toast.error(serverError.value);
  }
};

// Filtered and sorted users
const filteredUsers = computed(() => {
  let filtered = [...users.value];

  // Apply role filter
  if (filterRole.value) {
    filtered = filtered.filter((user) => user.role === filterRole.value);
  }

  // Apply sorting
  console.log("Sorting by:", sortField.value, sortDirection.value);
  filtered.sort((a, b) => {
    let valueA, valueB;

    if (sortField.value === "id") {
      valueA = a.user_id;
      valueB = b.user_id;
    } else if (sortField.value === "name") {
      valueA = `${a.first_name} ${a.last_name}`.toLowerCase();
      valueB = `${b.first_name} ${b.last_name}`.toLowerCase();
    } else {
      valueA = a[sortField.value].toLowerCase();
      valueB = b[sortField.value].toLowerCase();
    }

    if (valueA < valueB) return sortDirection.value === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDirection.value === "asc" ? 1 : -1;
    return 0;
  });

  return filtered;
});

// Create user
const createUser = async (userData) => {
  serverError.value = "";
  try {
    const response = await axiosClient.post("/api/v1/users", userData);
    console.log("User created:", response.data);
    toast.success(response.data.message);
    users.value.push(response.data.data);
    showCreateModal.value = false;
  } catch (error) {
    console.error("Create user error:", error);
    if (error.response?.status === 422) {
      throw error.response.data.errors;
    } else {
      serverError.value =
        error.response?.data?.message || "Failed to create user.";
      toast.error(serverError.value);
    }
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
    const response = await axiosClient.patch(
      `/api/v1/users/${userData.user_id}`,
      payload
    );
    console.log("User updated:", response.data);
    toast.success(response.data.message);
    const index = users.value.findIndex((u) => u.user_id === userData.user_id);
    users.value[index] = response.data.user;
    showEditModal.value = false;
  } catch (error) {
    console.error("Update user error:", error);
    if (error.response?.status === 422) {
      throw error.response.data.errors;
    } else {
      serverError.value =
        error.response?.data?.message || "Failed to update user.";
      toast.error(serverError.value);
    }
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
});
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar />
    <Sidebar />
    <div class="transition-all duration-300" :class="layoutShift">
      <div class="p-6 max-w-7xl mx-auto">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-gray-800">User Management</h1>
          <div class="flex space-x-2">
            <button
              v-if="selectedUsers.length"
              @click="deleteSelected"
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none transition-colors"
            >
              <i class="fas fa-trash mr-2"></i>
              Delete Selected
            </button>
            <button
              @click="showCreateModal = true"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none transition-colors"
            >
              <i class="fas fa-plus mr-2"></i>
              Add User
            </button>
          </div>
        </div>

        <!-- Server Error -->
        <div
          v-if="serverError"
          class="bg-red-200 border border-red-500 text-red-800 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <span class="block sm:inline">{{ serverError }}</span>
        </div>

        <!-- User List -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <div class="flex justify-between items-center mb-4 space-x-4">
            <h2 class="text-xl font-semibold text-gray-800">Users</h2>
            <div class="flex items-center space-x-4">
              <UserListSortDropdown
                v-model="sortField"
                v-model:direction="sortDirection"
              />
              <div>
                <select
                  v-model="filterRole"
                  @change="fetchUsers"
                  class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Show All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="tabulator">Tabulator</option>
                </select>
              </div>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3">
                    <div class="flex justify-center items-center">
                      <input
                        type="checkbox"
                        v-model="allSelected"
                        :indeterminate="someSelected && !allSelected"
                        class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </div>
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ID
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Username
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-if="filteredUsers.length === 0">
                  <td
                    colspan="7"
                    class="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No users found.
                  </td>
                </tr>
                <tr v-else v-for="user in filteredUsers" :key="user.user_id">
                  <td class="px-6 py-4">
                    <div class="flex justify-center items-center">
                      <input
                        type="checkbox"
                        v-model="selectedUsers"
                        :value="user.user_id"
                        class="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ user.user_id }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ user.first_name }} {{ user.last_name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ user.email }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ user.username }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ user.role }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      @click="openEditModal(user)"
                      class="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      @click="confirmDelete(user)"
                      class="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Create User Modal -->
        <CreateUserForm
          v-if="showCreateModal"
          @submit="createUser"
          @cancel="showCreateModal = false"
        />

        <!-- Edit User Modal -->
        <EditUserForm
          v-if="showEditModal"
          :user="editUser"
          @submit="updateUser"
          @cancel="showEditModal = false"
        />

        <!-- Delete Confirmation Modal -->
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
</style>

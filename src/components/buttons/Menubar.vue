<script setup>
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/vue";
import { computed, ref } from "vue";
import axiosClient from "../../axios";
import { useRouter } from "vue-router";

const router = useRouter();
const props = defineProps({
  user: Object,
});

// Handle logout function using the same pattern as handleLogin
const handleLogout = (event) => {
  event.preventDefault(); // Prevent default link behavior

  axiosClient.get("/api/csrf-cookie").then(() => {
    axiosClient
      .post("/api/v1/logout")
      .then((response) => {
        // Check if logout was successful
        if (response.status === 200) {
          // Redirect to login page
          router.push("/login/admin");
        }
      })
      .catch((error) => {
        console.error("Logout error:", error);
        // Handle error (show message to user, etc.)
      });
  });
};
</script>

<template>
  <Menu as="div" class="relative">
    <MenuButton
      class="focus:outline-none rounded-full flex items-center space-x-4"
    >
      <span class="font-sans hidden md:block">
        {{ user.first_name }} {{ user.last_name }}
      </span>
      <img
        class="w-6 h-6 rounded-full object-cover"
        :src="user.profile_photo || '/user24.png'"
        alt="Profile Picture"
      />
      <i class="fas fa-caret-down ml-1"></i>
    </MenuButton>

    <transition
      enter-active-class="transition transform duration-200 ease-out"
      enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition transform duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-75"
    >
      <MenuItems
        class="origin-top-right absolute right-1 mt-2 w-44 bg-white rounded-sm shadow-lg border py-2 focus:outline-none"
      >
        <MenuItem v-slot="{ active }">
          <a
            href="#"
            onclick="window.location.reload(true)"
            :class="{ 'bg-gray-100': active }"
            class="menu-item"
          >
            <i class="fas fa-palette w-4"></i> Dashboard
          </a>
        </MenuItem>
        <MenuItem v-slot="{ active }">
          <a
            href="/profile"
            :class="{ 'bg-gray-100': active }"
            class="menu-item"
          >
            <i class="fas fa-user w-4"></i> Profile
          </a>
        </MenuItem>
        <MenuItem v-slot="{ active }">
          <a href="/logs" :class="{ 'bg-gray-100': active }" class="menu-item">
            <i class="fas fa-folder w-4"></i> Pageant Files
          </a>
        </MenuItem>
        <!-- Properly disabled Messages menu item -->
        <MenuItem v-slot="{ active }">
          <div
            title="Messages are under maintenance."
            class="menu-item-disabled"
          >
            <i class="fas fa-comments w-4"></i> Messages
          </div>
        </MenuItem>
        <MenuItem v-slot="{ active }">
          <a
            href="/preferences"
            :class="{ 'bg-gray-100': active }"
            class="menu-item"
          >
            <i class="fas fa-cogs w-4"></i> Preferences
          </a>
        </MenuItem>
        <MenuItem v-slot="{ active }">
          <a
            href="#"
            @click="handleLogout"
            :class="{ 'bg-gray-100': active }"
            class="menu-item"
          >
            <i class="fas fa-sign-out-alt w-4"></i> Log Out
          </a>
        </MenuItem>
      </MenuItems>
    </transition>
  </Menu>
</template>

<style scoped>
.menu-item {
  display: block;
  padding: 0.5rem 2rem;
  font-size: 0.875rem;
  color: #4b5563; /* text-gray-700 */
}

.menu-item-disabled {
  display: block;
  padding: 0.5rem 2rem;
  font-size: 0.875rem;
  color: #9ca3af; /* text-gray-400 */
  cursor: not-allowed;
}
</style>

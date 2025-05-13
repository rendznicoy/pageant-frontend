<script setup>
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/vue";
import { defineEmits, defineProps } from "vue";
import axiosClient from "../../axios";
import { useRouter } from "vue-router";

const router = useRouter();
const emit = defineEmits(["refresh-dashboard"]);
const props = defineProps({
  user: Object,
});

const handleLogout = (event) => {
  event.preventDefault();
  axiosClient.get("/api/csrf-cookie").then(() => {
    axiosClient
      .post("/api/v1/logout")
      .then((response) => {
        if (response.status === 200) {
          router.push("/login/admin");
        }
      })
      .catch((error) => {
        console.error("Logout error:", error);
      });
  });
};

const navigateToDashboard = () => {
  console.log(
    "Menubar navigateToDashboard called, current path:",
    router.currentRoute.value.path
  );
  if (router.currentRoute.value.path === "/admin/dashboard") {
    console.log("Menubar emitting refresh-dashboard");
    emit("refresh-dashboard");
  } else {
    console.log("Menubar redirecting to /admin/dashboard");
    router.push("/admin/dashboard");
  }
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
        class="origin-top-right absolute right-1 mt-2 w-44 bg-white rounded-sm shadow-lg border py-2 focus:outline-none z-100"
      >
        <MenuItem v-slot="{ active }">
          <a
            href="#"
            @click.prevent="navigateToDashboard"
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
          <a
            href="/reports"
            :class="{ 'bg-gray-100': active }"
            class="menu-item"
          >
            <i class="fas fa-folder w-4"></i> Pageant Files
          </a>
        </MenuItem>
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

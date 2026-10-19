<template>
  <div class="flex min-h-screen w-full bg-app overflow-x-hidden">
    <!-- Sidebar -->
    <Sidebar
      :is-open="sidebarOpen"
      @close="sidebarOpen = false"
      @collapse-change="isCollapsed = $event"
    />

    <!-- Main Content Wrapper -->
    <div
      :class="[
        'flex-1 flex flex-col min-w-0 w-full transition-all duration-200',
        isCollapsed ? 'md:pl-[72px]' : 'md:pl-52'
      ]"
    >
      <!-- Navbar -->
      <Navbar @toggle-sidebar="sidebarOpen = !sidebarOpen" />

      <!-- Page Content -->
      <main class="flex-1 p-3.5 sm:p-5 lg:p-6 w-full min-w-0 max-w-full">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from '../components/layout/Sidebar.vue'
import Navbar from '../components/layout/Navbar.vue'

const sidebarOpen = ref(false)
const isCollapsed = ref(false)
</script>

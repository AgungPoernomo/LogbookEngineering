<template>
  <div>
    <!-- Render Teknisi Dashboard -->
    <TeknisiDashboard v-if="authStore.isTeknisi" />
    <!-- Render Supervisor Dashboard -->
    <SupervisorDashboard v-else-if="authStore.isSupervisor" />
    <!-- Render Admin Dashboard -->
    <AdminDashboard v-else-if="authStore.isAdmin" />
  </div>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth'
import TeknisiDashboard from '../teknisi/TeknisiDashboard.vue'
import SupervisorDashboard from '../supervisor/SupervisorDashboard.vue'
import AdminDashboard from '../admin/AdminDashboard.vue'

const authStore = useAuthStore()
</script>

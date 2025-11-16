<!-- components/layout/ProfileMenu.vue -->
<template>
  <transition name="profile-menu">
    <div class="profile-menu-backdrop" @click.self="$emit('close')">
      <aside class="profile-menu">
        <div class="profile-menu__header">
          <span class="profile-menu__title">Профиль</span>

          <button
            type="button"
            class="profile-menu__close"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          class="profile-menu__item"
          @click="$emit('go-cover')"
        >
          Моя обложка
        </button>

        <button
          type="button"
          class="profile-menu__item"
          @click="$emit('go-settings')"
        >
          Настройки профиля
        </button>

        <button
          type="button"
          class="profile-menu__item profile-menu__item--danger"
          @click="$emit('logout')"
        >
          Выйти
        </button>
      </aside>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'close'): void
  (e: 'go-cover'): void
  (e: 'go-settings'): void
  (e: 'logout'): void
}>()
</script>

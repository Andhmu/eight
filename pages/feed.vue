<!-- pages/feed.vue -->
<template>
  <div class="feed-page">
    <!-- Блок с новыми пользователями -->
    <NewUsersCarousel />
  <!-- Новый блок "Прямой эфир" -->

    <LiveNowBlock />

    <!-- Основной список ленты (пока заглушка) -->
    <section class="feed-list">
      <article class="feed-card">
        <div class="feed-card__header">
          <h2 class="feed-card__title">Лента</h2>
        </div>

        <div class="feed-card__body">
          Здесь позже появятся записи ленты. Сейчас главное — работает
          карусель новых пользователей 😊
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import NewUsersCarousel from '~~/components/feed/NewUsersCarousel.vue'
import LiveNowBlock from '~~/components/feed/LiveNowBlock.vue'

definePageMeta({
  middleware: ['auth-only'], // если у тебя другое имя middlewares — поправь
})
</script>
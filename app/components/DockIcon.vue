<script setup lang="ts">
import { PhArrowSquareOut, PhArticle, PhBookOpen, PhBookmarkSimple, PhCards, PhChatsCircle, PhEnvelopeSimple, PhFeather, PhGearSix, PhHouse, PhIdentificationCard, PhImageSquare } from '@phosphor-icons/vue'
import type { Component } from 'vue'
import type { MenuType, Skin } from '~/utils/site'

/** Phosphor icon for a menu entry; the weight follows the theme. */
const props = defineProps<{ type: MenuType | 'admin', skin: Skin, size?: number }>()

const ICONS: Record<MenuType | 'admin', Component> = {
  home: PhHouse,
  about: PhIdentificationCard,
  gallery: PhImageSquare,
  pages: PhArticle,
  clips: PhCards,
  clip: PhBookmarkSimple,
  page: PhBookOpen,
  diary: PhFeather,
  guestbook: PhEnvelopeSimple,
  qna: PhChatsCircle,
  link: PhArrowSquareOut,
  admin: PhGearSix,
}
const WEIGHTS: Record<Skin, 'thin' | 'light' | 'regular' | 'bold' | 'duotone'> = {
  glass: 'light',
  paper: 'duotone',
  frame: 'thin',
  retro: 'bold',
}
</script>

<template>
  <component :is="ICONS[props.type]" :size="props.size ?? 22" :weight="WEIGHTS[props.skin]" aria-hidden="true" />
</template>

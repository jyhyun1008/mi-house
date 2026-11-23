<script setup lang="ts">
/** Left column of the 갠홈 layout: title and profile stay put while the right side changes. */
const { site, path } = useSite()
const config = computed(() => site.value!.config)
const owner = computed(() => site.value!.owner)
</script>

<template>
  <div class="gh-left">
    <section class="gh-w gh-clock"><GaenClock /></section>
    <section class="gh-w gh-title">
      <h1 class="gh-logo"><NuxtLink :to="path()"><MfmText :text="config.title" :emojis="owner.emojis" plain /></NuxtLink></h1>
      <p v-if="config.subtitle" class="gh-sub">{{ config.subtitle }}</p>
      <p v-if="config.since" class="gh-since">since {{ config.since }}</p>
      <GaenCounter />
    </section>

    <section class="gh-w gh-profile glass">
      <h2 class="gh-h minor">Profile</h2>
      <div class="who">
        <img v-if="owner.avatarUrl" class="av" :src="owner.avatarUrl" alt="">
        <div class="names">
          <NuxtLink :to="path('about')" class="name"><MfmText :text="owner.name ?? owner.username" :emojis="owner.emojis" plain /></NuxtLink>
          <span class="mh-muted">@{{ owner.username }}@{{ site!.host }}</span>
        </div>
        <SideClap v-if="config.guestbookNoteId || config.waveboxUrl" :note-id="config.guestbookNoteId" bare class="clap" />
      </div>
      <SideVisitor bare />
    </section>
  </div>
</template>

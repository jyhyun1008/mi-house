<script setup lang="ts">
const { site } = useSite()
const owner = computed(() => site.value!.owner)
const fields = computed(() => [
  ...(owner.value.fields ?? []).filter(f => f.name || f.value).map(f => ({ name: f.name, value: f.value, mfm: true })),
  ...(owner.value.location ? [{ name: 'Location', value: owner.value.location, mfm: false }] : []),
  ...(owner.value.birthday ? [{ name: 'Birthday', value: owner.value.birthday, mfm: false }] : []),
])
const stats = computed(() => [
  { label: 'Notes', value: owner.value.notesCount },
  { label: 'Following', value: owner.value.followingCount },
  { label: 'Followers', value: owner.value.followersCount },
])
</script>

<template>
  <article class="about">
    <div class="cover" :class="{ empty: !owner.bannerUrl }" :style="owner.bannerUrl ? { backgroundImage: `url(&quot;${owner.bannerUrl}&quot;)` } : undefined" />

    <header class="head">
      <img v-if="owner.avatarUrl" class="av" :src="owner.avatarUrl" alt="">
      <h1 class="name"><MfmText :text="owner.name ?? owner.username" :emojis="owner.emojis" plain /></h1>
      <p class="acct">@{{ owner.username }}@{{ site!.host }}</p>
    </header>

    <MfmText v-if="owner.description" class="bio" :text="owner.description" :emojis="owner.emojis" />

    <ul class="stats">
      <li v-for="s in stats" :key="s.label"><b>{{ s.value.toLocaleString() }}</b><span>{{ s.label }}</span></li>
    </ul>

    <dl v-if="fields.length" class="fields">
      <div v-for="(f, i) in fields" :key="i" class="field">
        <dt><MfmText :text="f.name" :emojis="owner.emojis" plain /></dt>
        <dd><MfmText v-if="f.mfm" :text="f.value" :emojis="owner.emojis" /><template v-else>{{ f.value }}</template></dd>
      </div>
    </dl>

    <footer class="foot">
      <span>Joined {{ formatDate(owner.createdAt) }}</span>
      <a :href="`https://${site!.host}/@${owner.username}`" target="_blank" rel="noopener noreferrer">미스키 프로필 ↗</a>
    </footer>
  </article>
</template>

<style scoped>
.about {
  max-width: 720px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-box);
}
.cover {
  height: 180px;
  background-size: cover;
  background-position: center;
}
.cover.empty {
  height: 110px;
  background:
    radial-gradient(ellipse 60% 80% at 20% 0%, color-mix(in srgb, var(--accent) 45%, transparent), transparent 70%),
    linear-gradient(120deg, color-mix(in srgb, var(--accent) 25%, var(--bg-box)), var(--bg-box));
}
.head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px;
  text-align: center;
}
.av {
  width: 108px;
  height: 108px;
  margin-top: -54px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg-box);
  border: 4px solid var(--bg-box);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 55%, transparent), 0 6px 18px rgb(0 0 0 / 0.12);
}
.name {
  margin: 12px 0 0;
  font-family: var(--title-font);
  font-size: 24px;
  line-height: 1.3;
  color: var(--fg-strong);
}
.acct {
  margin: 2px 0 0;
  font-size: 0.92em;
  color: var(--fg-muted);
  overflow-wrap: anywhere;
}
.bio {
  display: block;
  margin: 18px 32px 0;
  line-height: 1.8;
  text-align: center;
}
.stats {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 20px 24px 0;
  padding: 0;
  list-style: none;
}
.stats li {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 92px;
  padding: 8px 12px;
  border-radius: calc(var(--radius) * 0.7);
  background: color-mix(in srgb, var(--accent) 9%, transparent);
}
.stats b {
  font-size: 17px;
  color: var(--fg-strong);
}
.stats span {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
}
.fields {
  margin: 22px 32px 0;
  border-top: 1px solid var(--border);
}
.field {
  display: grid;
  grid-template-columns: minmax(90px, 30%) minmax(0, 1fr);
  gap: 16px;
  padding: 10px 4px;
  border-bottom: 1px dashed var(--border);
}
.field dt {
  font-weight: 700;
  color: color-mix(in srgb, var(--accent) 70%, var(--fg-strong));
}
.field dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-top: 22px;
  padding: 12px 32px 16px;
  font-family: var(--font-hand);
  font-size: 15px;
  color: var(--fg-muted);
}
@media (max-width: 560px) {
  .bio,
  .fields {
    margin-left: 16px;
    margin-right: 16px;
  }
  .stats li {
    min-width: 0;
    flex: 1;
  }
  .field {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }
  .foot {
    padding: 12px 16px 16px;
  }
}
</style>

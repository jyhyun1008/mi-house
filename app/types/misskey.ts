// Minimal subset of Misskey entities used by mi-house.

export interface UserLite {
  id: string
  name: string | null
  username: string
  host: string | null
  avatarUrl: string | null
  isCat?: boolean
  emojis?: Record<string, string>
}

export interface UserDetailed extends UserLite {
  description: string | null
  bannerUrl: string | null
  followersCount: number
  followingCount: number
  notesCount: number
  createdAt: string
  location?: string | null
  birthday?: string | null
  fields?: { name: string, value: string }[]
  pinnedPageId?: string | null
  /** the page pinned on the Misskey profile */
  pinnedPage?: Page | null
  pinnedNotes?: Note[]
  publicReactions?: boolean
}

export interface DriveFile {
  id: string
  createdAt?: string
  name: string
  type: string
  url: string
  thumbnailUrl: string | null
  size?: number
  isSensitive: boolean
  comment: string | null
  properties: { width?: number, height?: number }
}

export type Visibility = 'public' | 'home' | 'followers' | 'specified'

export interface Note {
  id: string
  createdAt: string
  userId: string
  user: UserLite
  text: string | null
  cw: string | null
  visibility: Visibility
  visibleUserIds?: string[]
  renoteCount: number
  repliesCount: number
  reactions: Record<string, number>
  reactionEmojis?: Record<string, string>
  emojis?: Record<string, string>
  myReaction?: string | null
  files: DriveFile[]
  tags?: string[]
  replyId: string | null
  renoteId: string | null
  renote?: Note | null
  uri?: string
  url?: string
}

export interface Clip {
  id: string
  createdAt: string
  lastClippedAt: string | null
  userId: string
  user: UserLite
  name: string
  description: string | null
  isPublic: boolean
  notesCount?: number
  favoritedCount?: number
  isFavorited?: boolean
}

export interface GalleryPost {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  user: UserLite
  title: string
  description: string | null
  fileIds: string[]
  files: DriveFile[]
  tags?: string[]
  isSensitive: boolean
  likedCount: number
  isLiked?: boolean
}

/** Misskey Page content block. Current servers emit text/section/image/note; older pages may hold others. */
export interface PageBlock {
  id: string
  type: string
  text?: string
  title?: string
  children?: PageBlock[]
  fileId?: string | null
  note?: string | null
  detailed?: boolean
  [key: string]: unknown
}

export interface Page {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  user: UserLite
  title: string
  name: string
  summary: string | null
  content: PageBlock[]
  variables: unknown[]
  script: string
  font: 'serif' | 'sans-serif'
  alignCenter: boolean
  hideTitleWhenPinned: boolean
  eyeCatchingImageId: string | null
  eyeCatchingImage: DriveFile | null
  attachedFiles: DriveFile[]
  likedCount: number
  isLiked?: boolean
}

export interface MetaLite {
  name: string | null
  iconUrl: string | null
}

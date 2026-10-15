<script setup>
import { ref, watch } from 'vue'
import { useBoardStore } from '../stores/board'
import { supabase } from '../lib/supabase'

const props = defineProps({
    card: { type: Object, required: true },
    listTitle: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const boardStore = useBoardStore()

const description = ref(props.card.description || '')
const savingDescription = ref(false)
const comments = ref([])
const newComment = ref('')
const postingComment = ref(false)
const currentUserId = ref(null)

watch(() => props.card.id, loadComments, { immediate: true })

supabase.auth.getUser().then(({ data }) => {
    currentUserId.value = data.user?.id || null
})

async function loadComments() {
    description.value = props.card.description || ''
    comments.value = await boardStore.fetchComments(props.card.id)
}

async function saveDescription() {
    savingDescription.value = true
    await boardStore.updateCardDescription(props.card.id, description.value)
    savingDescription.value = false
}

async function handleAddComment() {
    if (!newComment.value.trim()) return
    postingComment.value = true
    const comment = await boardStore.addComment(props.card.id, newComment.value.trim())
    postingComment.value = false
    if (comment) {
        comments.value.push(comment)
        newComment.value = ''
    }
}

function formatTime(ts) {
    return new Date(ts).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
}

function commentAuthorLabel(comment) {
    if (comment.user_id === currentUserId.value) return 'Kamu'
    return comment.email || 'Pengguna'
}
</script>

<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" @click.self="emit('close')">
        <div
            class="flex w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_20px_44px_rgba(28,33,41,0.18)]">
            <!-- Kolom kiri: detail card -->
            <div class="flex-1 overflow-y-auto p-6 border-r border-border">
                <p v-if="listTitle" class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    {{ listTitle }}
                </p>
                <h2 class="mb-5 font-display text-lg font-bold text-ink">{{ card.title }}</h2>

                <div class="mb-2 flex items-center justify-between">
                    <label class="text-sm font-semibold text-ink">Deskripsi</label>
                    <span v-if="savingDescription" class="text-xs text-ink-muted">Menyimpan...</span>
                </div>
                <textarea v-model="description" @blur="saveDescription" rows="6"
                    placeholder="Tambahkan deskripsi lebih detail..."
                    class="w-full resize-none rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/25" />
            </div>

            <!-- Kolom kanan: comments & activity -->
            <div class="flex w-80 flex-shrink-0 flex-col">
                <div class="flex items-center justify-between border-b border-border p-4">
                    <h3 class="text-sm font-semibold text-ink">Komentar</h3>
                    <button @click="emit('close')" class="text-ink-muted hover:text-ink" title="Tutup">✕</button>
                </div>

                <div class="flex-1 space-y-3 overflow-y-auto p-4">
                    <div v-if="comments.length === 0" class="text-sm text-ink-muted">Belum ada komentar.</div>
                    <div v-for="c in comments" :key="c.id" class="rounded-lg bg-surface-sunken p-2.5">
                        <div class="mb-1">
                            <p class="text-xs font-semibold text-ink truncate">{{ commentAuthorLabel(c) }}</p>
                            <p class="text-xs text-ink-muted">{{ formatTime(c.created_at) }}</p>
                        </div>
                        <p class="text-sm text-ink whitespace-pre-wrap">{{ c.content }}</p>
                    </div>
                </div>

                <form @submit.prevent="handleAddComment" class="border-t border-border p-3">
                    <textarea v-model="newComment" rows="2" placeholder="Tulis komentar..." :disabled="postingComment"
                        class="mb-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-50" />
                    <button type="submit" :disabled="postingComment"
                        class="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                        {{ postingComment ? 'Mengirim...' : 'Kirim Komentar' }}
                    </button>
                </form>
            </div>
        </div>
    </div>
</template>
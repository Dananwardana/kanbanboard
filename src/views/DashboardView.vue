<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useBoardsStore } from '../stores/boards'

const router = useRouter()
const boardsStore = useBoardsStore()

const newBoardTitle = ref('')
const showForm = ref(false)

const pendingInvites = ref([])

onMounted(async () => {
    boardsStore.fetchBoards()
    pendingInvites.value = await boardsStore.fetchPendingInvites()
})

async function handleRespond(inviteId, accept) {
    const success = await boardsStore.respondToInvite(inviteId, accept)
    if (success) {
        pendingInvites.value = pendingInvites.value.filter(i => i.id !== inviteId)
        if (accept) boardsStore.fetchBoards() // refresh biar board baru muncul di list
    }
}
async function handleCreateBoard() {
    if (!newBoardTitle.value.trim()) return

    const board = await boardsStore.createBoard(newBoardTitle.value)
    if (board) {
        newBoardTitle.value = ''
        showForm.value = false
        router.push(`/board/${board.id}`)
    }
}

async function handleDeleteBoard(boardId) {
    if (!confirm('Yakin mau hapus board ini? Semua list dan card di dalamnya juga akan terhapus.')) return
    await boardsStore.deleteBoard(boardId)
}

async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
}
</script>

<template>
    <div class="min-h-screen bg-canvas px-4 py-8 sm:px-8">
        <div class="mx-auto max-w-6xl">
            <div
                class="mb-8 flex flex-col gap-4 rounded-2xl border border-border bg-surface px-6 py-5 shadow-[0_6px_20px_rgba(28,33,41,0.06)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p class="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Dashboard</p>
                    <h1 class="font-display text-2xl font-bold text-ink">Board Kamu</h1>
                    <p class="mt-1 text-sm text-ink-muted">Kelola board pribadi dan kolaborasi tim dari satu tempat.</p>
                </div>
                <button @click="handleLogout"
                    class="rounded-lg border border-danger/25 bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger-hover">
                    Logout
                </button>
            </div>
        </div>

        <div class="mx-auto max-w-6xl">
            <!-- Undangan Pending -->
            <div v-if="pendingInvites.length > 0" class="mb-6 space-y-3">
                <h2 class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Undangan Board</h2>
                <div v-for="invite in pendingInvites" :key="invite.id"
                    class="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 shadow-[0_4px_14px_rgba(28,33,41,0.05)]">
                    <span class="text-sm text-ink">
                        Kamu diundang ke board <strong class="font-semibold">{{ invite.boards.title }}</strong>
                    </span>
                    <div class="flex gap-2">
                        <button @click="handleRespond(invite.id, true)"
                            class="rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-success-hover">
                            Terima
                        </button>
                        <button @click="handleRespond(invite.id, false)"
                            class="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-sunken">
                            Tolak
                        </button>
                    </div>
                </div>
            </div>

            <!-- Tombol / Form buat board baru -->
            <div class="mb-6">
                <button v-if="!showForm" @click="showForm = true"
                    class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
                    + Board Baru
                </button>

                <form v-else @submit.prevent="handleCreateBoard"
                    class="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center">
                    <input v-model="newBoardTitle" type="text" placeholder="Nama board..." autofocus
                        :disabled="boardsStore.actionLoading"
                        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-50" />
                    <button type="submit" :disabled="boardsStore.actionLoading"
                        class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">
                        {{ boardsStore.actionLoading ? 'Menyimpan...' : 'Simpan' }}
                    </button>
                    <button type="button" @click="showForm = false" :disabled="boardsStore.actionLoading"
                        class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken disabled:opacity-50">
                        Batal
                    </button>
                </form>
            </div>

            <!-- Daftar board -->
            <div v-if="boardsStore.loading" class="text-sm text-ink-muted">Loading...</div>

            <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div v-for="board in boardsStore.boards" :key="board.id"
                    class="group relative rounded-xl border border-border bg-surface p-5 shadow-[0_4px_14px_rgba(28,33,41,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(28,33,41,0.11)]">
                    <router-link :to="`/board/${board.id}`" class="block">
                        <h2 class="pr-6 font-display text-lg font-semibold text-ink">{{ board.title }}</h2>
                        <p class="mt-2 text-sm text-ink-muted">Klik untuk buka board dan lanjut kerja.</p>
                    </router-link>
                    <button @click.prevent.stop="handleDeleteBoard(board.id)" :disabled="boardsStore.actionLoading"
                        class="absolute right-4 top-4 text-ink-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                        title="Hapus board">
                        ✕
                    </button>
                </div>

                <p v-if="boardsStore.boards.length === 0" class="text-sm text-ink-muted">
                    Belum ada board. Yuk bikin yang pertama!
                </p>
            </div>
        </div>
    </div>
</template>
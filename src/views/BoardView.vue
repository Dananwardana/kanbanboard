<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import draggable from 'vuedraggable'
import { supabase } from '../lib/supabase'
import { useBoardStore } from '../stores/board'
import CardDetailModal from '../components/CardDetailModal.vue'

const route = useRoute()
const boardStore = useBoardStore()
const boardId = route.params.id

const boardTitle = ref('')
const newListTitle = ref('')
const showListForm = ref(false)
const newCardTitle = ref({}) // { [listId]: 'text' }
const showCardForm = ref({}) // { [listId]: boolean }
const showShareModal = ref(false)
const shareEmail = ref('')
const shareMessage = ref('')
const editingListId = ref(null)
const editListTitle = ref('')
const editingCardId = ref(null)
const editCardTitle = ref('')
const selectedCard = ref(null)
const selectedCardListTitle = ref('')

onMounted(async () => {
    const { data } = await supabase.from('boards').select('title').eq('id', boardId).single()
    boardTitle.value = data?.title || ''

    await boardStore.fetchBoardData(boardId)
    boardStore.subscribeToBoard(boardId)
})

onUnmounted(() => {
    boardStore.unsubscribe()
})

const listDotPalette = ['#5B5BD6', '#12A594', '#E59D12', '#E5484D', '#7C3AED', '#0EA5E9']

function listDotColor(index) {
    return listDotPalette[index % listDotPalette.length]
}

function startEditList(list) {
    editingListId.value = list.id
    editListTitle.value = list.title
}

function startEditCard(card) {
    editingCardId.value = card.id
    editCardTitle.value = card.title
}

function cancelEditCard() {
    editingCardId.value = null
}

function openCardDetail(card, listTitle) {
    selectedCard.value = card
    selectedCardListTitle.value = listTitle
}

function closeCardDetail() {
    selectedCard.value = null
}

async function handleCreateList() {
    if (!newListTitle.value.trim()) return
    await boardStore.createList(boardId, newListTitle.value)
    newListTitle.value = ''
    showListForm.value = false
}

async function handleDeleteList(listId) {
    if (!confirm('Yakin mau hapus list ini? Semua card di dalamnya juga akan terhapus.')) return
    await boardStore.deleteList(listId)
}

async function handleCreateCard(listId) {
    const title = newCardTitle.value[listId]
    if (!title?.trim()) return
    await boardStore.createCard(listId, title)
    newCardTitle.value[listId] = ''
    showCardForm.value[listId] = false
}

async function handleUpdateCard(cardId) {
    const title = editCardTitle.value.trim()
    editingCardId.value = null
    if (!title) return
    await boardStore.updateCardTitle(cardId, title)
}

async function handleDragChange(event, targetListId) {
    if (event.added) {
        const card = event.added.element
        const newIndex = event.added.newIndex
        const listCards = boardStore.cardsByList(targetListId)

        // Hitung posisi baru berdasarkan tetangga kiri/kanan
        const prevCard = listCards[newIndex - 1]
        const nextCard = listCards[newIndex]
        let newPosition
        if (!prevCard) newPosition = (nextCard?.position || 1) - 1
        else if (!nextCard) newPosition = prevCard.position + 1
        else newPosition = (prevCard.position + nextCard.position) / 2

        card.position = newPosition
        card.list_id = targetListId
        await boardStore.updateCardPosition(card.id, targetListId, newPosition)
    }
}

async function handleInvite() {
    if (!shareEmail.value.trim()) return
    const result = await boardStore.inviteMember(boardId, shareEmail.value.trim())
    shareMessage.value = result.message
    if (result.success) shareEmail.value = ''
}

function cancelEditList() {
    editingListId.value = null
}

async function handleUpdateList(listId) {
    const title = editListTitle.value.trim()
    editingListId.value = null // langsung balik ke tampilan normal, tanpa nunggu network
    if (!title) return
    await boardStore.updateListTitle(listId, title)
}
</script>

<template>
    <div class="min-h-screen bg-canvas px-4 py-6 sm:px-6">
        <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p class="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Board Workspace</p>
                <h1 class="font-display text-2xl font-bold text-ink">{{ boardTitle }}</h1>
            </div>
            <div class="flex items-center gap-3">
                <button @click="showShareModal = true; shareMessage = ''"
                    class="rounded-lg bg-success px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-success-hover">
                    Share
                </button>
                <router-link to="/"
                    class="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken">
                    &larr; Dashboard
                </router-link>
            </div>
        </div>

        <div v-if="boardStore.loading" class="text-sm text-ink-muted">Loading...</div>

        <div v-else class="flex gap-4 overflow-x-auto items-start pb-4">
            <!-- Kolom / List -->
            <div v-for="(list, index) in boardStore.lists" :key="list.id"
                class="w-[82vw] max-w-72 flex-shrink-0 rounded-xl border border-border bg-surface-sunken p-3">
                <div class="flex items-center justify-between mb-3 px-1 gap-2">
                    <!-- Mode edit: input inline -->
                    <form v-if="editingListId === list.id" @submit.prevent="handleUpdateList(list.id)"
                        class="flex-1 flex items-center gap-1">
                        <span class="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            :style="{ backgroundColor: listDotColor(index) }" />
                        <input v-model="editListTitle" type="text" autofocus @keyup.esc="cancelEditList"
                            class="flex-1 min-w-0 rounded-md border border-accent bg-surface px-2 py-1 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25" />
                        <button type="submit" class="text-sm text-success hover:text-success-hover flex-shrink-0"
                            title="Simpan">✓</button>
                        <button type="button" @click="cancelEditList"
                            class="text-sm text-ink-muted hover:text-danger flex-shrink-0" title="Batal">✕</button>
                    </form>

                    <!-- Mode normal: judul + tombol -->
                    <template v-else>
                        <h2
                            class="flex items-center gap-2 font-display text-sm font-semibold text-ink min-w-0 truncate">
                            <span class="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                :style="{ backgroundColor: listDotColor(index) }" />
                            <span class="truncate">{{ list.title }}</span>
                        </h2>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <button @click="startEditList(list)"
                                class="text-sm text-ink-muted transition-colors hover:text-accent" title="Edit list">
                                ✎
                            </button>
                            <button @click="handleDeleteList(list.id)"
                                class="text-sm text-ink-muted transition-colors hover:text-danger" title="Hapus list">
                                ✕
                            </button>
                        </div>
                    </template>
                </div>

                <draggable :model-value="boardStore.cardsByList(list.id)" group="cards" item-key="id"
                    ghost-class="kanban-ghost-card" chosen-class="kanban-chosen-card" drag-class="kanban-drag-card"
                    class="min-h-[20px] space-y-2" @change="handleDragChange($event, list.id)">
                    <template #item="{ element: card }">
                        <div
                            class="cursor-grab rounded-lg border border-border bg-surface p-3 shadow-[0_2px_10px_rgba(28,33,41,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(28,33,41,0.12)] active:cursor-grabbing">
                            <form v-if="editingCardId === card.id" @submit.prevent="handleUpdateCard(card.id)"
                                class="flex items-center gap-1">
                                <input v-model="editCardTitle" type="text" autofocus @keyup.esc="cancelEditCard"
                                    class="flex-1 min-w-0 rounded-md border border-accent bg-surface px-2 py-1 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25" />
                                <button type="submit"
                                    class="text-sm text-success hover:text-success-hover flex-shrink-0"
                                    title="Simpan">✓</button>
                                <button type="button" @click="cancelEditCard"
                                    class="text-sm text-ink-muted hover:text-danger flex-shrink-0"
                                    title="Batal">✕</button>
                            </form>
                            <template v-else>
                                <p @click="openCardDetail(card, list.title)"
                                    class="text-sm text-ink cursor-pointer hover:text-accent">
                                    {{ card.title }}
                                </p>
                                <div class="mt-1 flex items-center gap-3">
                                    <button @click="startEditCard(card)"
                                        class="text-xs font-medium text-ink-muted hover:text-accent">
                                        Edit
                                    </button>
                                    <button @click="boardStore.deleteCard(card.id)"
                                        class="text-xs font-medium text-danger hover:underline">
                                        Hapus
                                    </button>
                                </div>
                            </template>
                        </div>
                    </template>
                </draggable>

                <!-- Form tambah card -->
                <div class="mt-3">
                    <button v-if="!showCardForm[list.id]" @click="showCardForm[list.id] = true"
                        class="w-full rounded-md px-2 py-1 text-left text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink">
                        + Tambah card
                    </button>
                    <form v-else @submit.prevent="handleCreateCard(list.id)">
                        <input v-model="newCardTitle[list.id]" type="text" autofocus placeholder="Judul card..."
                            :disabled="boardStore.actionLoading"
                            class="mb-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-50" />
                        <div class="flex gap-1">
                            <button type="submit" :disabled="boardStore.actionLoading"
                                class="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                                {{ boardStore.actionLoading ? '...' : 'Simpan' }}
                            </button>
                            <button type="button" @click="showCardForm[list.id] = false"
                                class="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas">Batal</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Tambah List Baru -->
            <div class="w-72 flex-shrink-0">
                <button v-if="!showListForm" @click="showListForm = true"
                    class="w-full rounded-xl border border-dashed border-border bg-surface-sunken p-3 text-left text-sm font-medium text-ink-muted transition-colors hover:bg-surface">
                    + Tambah List
                </button>
                <form v-else @submit.prevent="handleCreateList"
                    class="rounded-xl border border-border bg-surface-sunken p-3">
                    <input v-model="newListTitle" type="text" autofocus placeholder="Nama list..."
                        :disabled="boardStore.actionLoading"
                        class="mb-2 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-50" />
                    <div class="flex gap-1">
                        <button type="submit" :disabled="boardStore.actionLoading"
                            class="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                            {{ boardStore.actionLoading ? '...' : 'Simpan' }}
                        </button>
                        <button type="button" @click="showListForm = false"
                            class="rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas">Batal</button>
                    </div>
                </form>
            </div>
        </div>
        <!-- Modal Share -->
        <div v-if="showShareModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            @click.self="showShareModal = false">
            <div
                class="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-[0_16px_36px_rgba(28,33,41,0.14)]">
                <h3 class="mb-3 font-display text-lg font-semibold text-ink">Share Board</h3>
                <p class="mb-4 text-sm text-ink-muted">
                    Masukkan email pengguna yang sudah punya akun untuk diundang.
                </p>

                <form @submit.prevent="handleInvite" class="flex gap-2 mb-3">
                    <input v-model="shareEmail" type="email" placeholder="email@contoh.com"
                        :disabled="boardStore.actionLoading"
                        class="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-50" />
                    <button type="submit" :disabled="boardStore.actionLoading"
                        class="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                        {{ boardStore.actionLoading ? '...' : 'Undang' }}
                    </button>
                </form>

                <p v-if="shareMessage" class="text-sm mb-3"
                    :class="shareMessage.includes('berhasil') ? 'text-success' : 'text-danger'">
                    {{ shareMessage }}
                </p>

                <button @click="showShareModal = false" class="text-sm font-medium text-ink-muted hover:underline">
                    Tutup
                </button>
            </div>
        </div>
        <CardDetailModal v-if="selectedCard" :card="selectedCard" :list-title="selectedCardListTitle"
            @close="closeCardDetail" />
    </div>
</template>

<style scoped>
:global(.kanban-ghost-card) {
    opacity: 0.55;
    transform: scale(0.99);
}

:global(.kanban-chosen-card),
:global(.kanban-drag-card) {
    border-color: #5B5BD6 !important;
    box-shadow: 0 14px 28px rgba(28, 33, 41, 0.18) !important;
}
</style>
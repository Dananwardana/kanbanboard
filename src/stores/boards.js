import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useBoardsStore = defineStore('boards', () => {
    const boards = ref([])
    const loading = ref(false)
    const actionLoading = ref(false)

    async function fetchBoards() {
        loading.value = true
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('board_members')
            .select('boards(*)')
            .eq('user_id', user.id)
            .eq('status', 'accepted')

        if (error) {
            console.error('Error fetching boards:', error)
        } else {
            boards.value = (data || []).map(row => row.boards).sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            )
        }

        loading.value = false
    }

    async function createBoard(title) {
        actionLoading.value = true
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('boards')
            .insert({ title, owner_id: user.id })
            .select()
            .single()

        actionLoading.value = false

        if (error) {
            console.error('Error creating board:', error)
            return null
        }

        boards.value.unshift(data)
        return data
    }

    async function deleteBoard(boardId) {
        actionLoading.value = true
        const { error } = await supabase.from('boards').delete().eq('id', boardId)
        actionLoading.value = false

        if (error) return console.error(error)
        boards.value = boards.value.filter(b => b.id !== boardId)
    }

    async function fetchPendingInvites() {
        const { data: { user } } = await supabase.auth.getUser()

        const { data, error } = await supabase
            .from('board_members')
            .select('id, board_id, boards(title)')
            .eq('user_id', user.id)
            .eq('status', 'pending')

        if (error) {
            console.error(error)
            return []
        }
        return data
    }

    async function respondToInvite(memberRowId, accept) {
        const { error } = await supabase
            .from('board_members')
            .update({ status: accept ? 'accepted' : 'rejected' })
            .eq('id', memberRowId)

        if (error) console.error(error)
        return !error
    }

    return { boards, loading, actionLoading, fetchBoards, createBoard, deleteBoard, fetchPendingInvites, respondToInvite }
})
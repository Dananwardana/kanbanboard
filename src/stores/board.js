import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useBoardStore = defineStore('board', () => {
  const lists = ref([])
  const cards = ref([])
  const loading = ref(false)
  const actionLoading = ref(false)
  let channel = null

  async function fetchBoardData(boardId) {
    loading.value = true

    const { data: listsData } = await supabase
      .from('lists')
      .select('*')
      .eq('board_id', boardId)
      .order('position')

    const { data: cardsData } = await supabase
      .from('cards')
      .select('*')
      .in('list_id', (listsData || []).map(l => l.id))
      .order('position')

    lists.value = listsData || []
    cards.value = cardsData || []
    loading.value = false
  }

  function cardsByList(listId) {
    return cards.value.filter(c => c.list_id === listId)
  }

  async function createList(boardId, title) {
    actionLoading.value = true
    const maxPos = Math.max(0, ...lists.value.map(l => l.position))
    const { data, error } = await supabase
      .from('lists')
      .insert({ board_id: boardId, title, position: maxPos + 1 })
      .select()
      .single()

    actionLoading.value = false
    if (error) return console.error(error)
    lists.value.push(data)
  }

  async function createCard(listId, title) {
    actionLoading.value = true
    const listCards = cardsByList(listId)
    const maxPos = Math.max(0, ...listCards.map(c => c.position))
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('cards')
      .insert({ list_id: listId, title, position: maxPos + 1, created_by: user.id })
      .select()
      .single()

    actionLoading.value = false
    if (error) return console.error(error)
    cards.value.push(data)
  }

  async function updateCardPosition(cardId, newListId, newPosition) {
    const { error } = await supabase
      .from('cards')
      .update({ list_id: newListId, position: newPosition })
      .eq('id', cardId)

    if (error) console.error(error)
  }

  async function deleteCard(cardId) {
    await supabase.from('cards').delete().eq('id', cardId)
    cards.value = cards.value.filter(c => c.id !== cardId)
  }

  async function deleteList(listId) {
  const { error } = await supabase.from('lists').delete().eq('id', listId)
  if (error) return console.error(error)

  // Hapus list dari state, sekalian hapus semua card yang ada di list itu
  lists.value = lists.value.filter(l => l.id !== listId)
  cards.value = cards.value.filter(c => c.list_id !== listId)
}

  async function updateListTitle(listId, newTitle) {
  const { error } = await supabase
    .from('lists')
    .update({ title: newTitle })
    .eq('id', listId)

  if (error) return console.error(error)

  const idx = lists.value.findIndex(l => l.id === listId)
  if (idx !== -1) lists.value[idx].title = newTitle
}

async function updateCardTitle(cardId, newTitle) {
  const { error } = await supabase
    .from('cards')
    .update({ title: newTitle })
    .eq('id', cardId)

  if (error) return console.error(error)

  const idx = cards.value.findIndex(c => c.id === cardId)
  if (idx !== -1) cards.value[idx].title = newTitle
}

async function updateCardDescription(cardId, description) {
  const { error } = await supabase
    .from('cards')
    .update({ description })
    .eq('id', cardId)

  if (error) return console.error(error)

  const idx = cards.value.findIndex(c => c.id === cardId)
  if (idx !== -1) cards.value[idx].description = description
}

async function fetchComments(cardId) {
  const { data: comments, error } = await supabase
    .from('card_comments')
    .select('id, content, created_at, user_id')
    .eq('card_id', cardId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(error)
    return []
  }

  const { data: authors } = await supabase.rpc('get_comment_authors', { target_card_id: cardId })
  const emailMap = new Map((authors || []).map(a => [a.user_id, a.email]))

  return (comments || []).map(c => ({
    ...c,
    email: emailMap.get(c.user_id) || null,
  }))
}

async function addComment(cardId, content) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('card_comments')
    .insert({ card_id: cardId, user_id: user.id, content })
    .select()
    .single()

  if (error) {
    console.error(error)
    return null
  }
  return data
}

async function inviteMember(boardId, email) {
  actionLoading.value = true
  const { data, error } = await supabase.rpc('invite_member_to_board', {
    target_board_id: boardId,
    member_email: email,
  })
  actionLoading.value = false

  if (error) {
    console.error(error)
    return { success: false, message: 'Terjadi kesalahan' }
  }
  return data
}

async function fetchMembers(boardId) {
  const { data, error } = await supabase
    .from('board_members')
    .select('id, role, user_id')
    .eq('board_id', boardId)

  if (error) {
    console.error(error)
    return []
  }
  return data
}

  // ===== REALTIME =====
  function subscribeToBoard(boardId) {
    channel = supabase
      .channel(`board-${boardId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, (payload) => {
        handleCardChange(payload)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `board_id=eq.${boardId}` }, (payload) => {
        handleListChange(payload)
      })
      .subscribe()
  }

  function handleCardChange(payload) {
    if (payload.eventType === 'INSERT') {
      if (!cards.value.find(c => c.id === payload.new.id)) {
        cards.value.push(payload.new)
      }
    } else if (payload.eventType === 'UPDATE') {
      const idx = cards.value.findIndex(c => c.id === payload.new.id)
      if (idx !== -1) cards.value[idx] = payload.new
    } else if (payload.eventType === 'DELETE') {
      cards.value = cards.value.filter(c => c.id !== payload.old.id)
    }
  }

  function handleListChange(payload) {
    if (payload.eventType === 'INSERT') {
      if (!lists.value.find(l => l.id === payload.new.id)) {
        lists.value.push(payload.new)
      }
    } else if (payload.eventType === 'UPDATE') {
      const idx = lists.value.findIndex(l => l.id === payload.new.id)
      if (idx !== -1) lists.value[idx] = payload.new
    } else if (payload.eventType === 'DELETE') {
      lists.value = lists.value.filter(l => l.id !== payload.old.id)
    }
  }

  function unsubscribe() {
    if (channel) supabase.removeChannel(channel)
  }

  return {
    lists, cards, loading, actionLoading,
    fetchBoardData, cardsByList,
    createList, createCard, updateCardPosition, deleteCard, deleteList, updateListTitle, updateCardTitle, updateCardDescription,
    fetchComments, addComment,
    inviteMember, fetchMembers,
    subscribeToBoard, unsubscribe,
  }
})
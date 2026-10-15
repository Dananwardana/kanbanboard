<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { assertSupabaseReady } from '../lib/supabase'
import loginIllustration from '../assets/login-illustration.png'

const router = useRouter()

const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const messageType = ref('error')

async function handleSubmit() {
  loading.value = true
  errorMsg.value = ''
  messageType.value = 'error'

  try {
    const supabase = assertSupabaseReady()

    if (isSignUp.value) {
      const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      })
      if (error) throw error
      errorMsg.value = 'Cek email kamu untuk konfirmasi akun!'
      messageType.value = 'success'
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      })
      if (error) throw error
      router.push('/')
    }
  } catch (err) {
    errorMsg.value = err?.message || 'Terjadi kesalahan saat login.'
  } finally {
    loading.value = false
  }
}
</script>
 
<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-surface">
    <!-- Kiri: Ilustrasi, dikecilkan dan diberi padding -->
    <div class="hidden lg:flex items-center justify-center bg-surface border-r border-border p-12 xl:p-16">
      <img
        :src="loginIllustration"
        alt="Kanban collaboration illustration"
        class="h-auto w-full max-w-10xl object-contain"
      />
    </div>
 
    <!-- Kanan: Form -->
    <div class="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-20">
      <div class="w-full max-w-sm">
        <div class="mb-8">
          <p class="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Kanban Workspace</p>
          <h1 class="font-display text-3xl font-bold text-ink">
            {{ isSignUp ? 'Buat Akun Baru' : 'Selamat Datang Kembali' }}
          </h1>
          <p class="mt-2 text-sm text-ink-muted">
            {{ isSignUp ? 'Daftar untuk mulai mengelola board timmu.' : 'Masuk untuk lanjut kerja di board kamu.' }}
          </p>
        </div>
 
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-ink">Email</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </div>
 
          <div>
            <label class="mb-1.5 block text-sm font-medium text-ink">Password</label>
            <input
              v-model="password"
              type="password"
              required
              minlength="6"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </div>
 
          <p v-if="errorMsg" class="text-sm" :class="messageType === 'success' ? 'text-success' : 'text-danger'">
            {{ errorMsg }}
          </p>
 
          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ loading ? 'Memproses...' : (isSignUp ? 'Daftar' : 'Login') }}
          </button>
        </form>
 
        <button
          @click="isSignUp = !isSignUp"
          class="mt-5 w-full text-sm font-medium text-accent hover:text-accent-hover"
        >
          {{ isSignUp ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar' }}
        </button>
      </div>
    </div>
  </div>
</template>
 
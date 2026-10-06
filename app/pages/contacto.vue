<script setup lang="ts">
useSeoMeta({
  title: 'Contacto',
  description: 'Escríbenos y te respondemos a la brevedad.',
})

const form = reactive({ name: '', email: '', message: '' })
const status = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')

async function submit() {
  status.value = 'sending'
  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    status.value = 'sent'
    Object.assign(form, { name: '', email: '', message: '' })
  }
  catch {
    status.value = 'error'
  }
}
</script>

<template>
  <div class="section container narrow">
    <h1>Contacto</h1>
    <p class="muted intro">¿Dudas sobre un curso, un pago o una factura? Escríbenos.</p>

    <div v-if="status === 'sent'" class="notice notice-success">
      Gracias, recibimos tu mensaje. Te responderemos por correo.
    </div>
    <div v-if="status === 'error'" class="notice notice-warning">
      No pudimos enviar tu mensaje. Revisa los datos e inténtalo de nuevo.
    </div>

    <form class="card form" @submit.prevent="submit">
      <div>
        <label for="name">Nombre</label>
        <input id="name" v-model="form.name" required maxlength="120" autocomplete="name">
      </div>
      <div>
        <label for="email">Correo electrónico</label>
        <input id="email" v-model="form.email" type="email" required maxlength="200" autocomplete="email">
      </div>
      <div>
        <label for="message">Mensaje</label>
        <textarea id="message" v-model="form.message" required rows="6" maxlength="4000" />
      </div>
      <button class="btn btn-primary" :disabled="status === 'sending'">
        {{ status === 'sending' ? 'Enviando…' : 'Enviar mensaje' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.narrow {
  max-width: 680px;
}

h1 {
  margin: 0 0 4px;
  font-size: 2.2rem;
}

.intro {
  margin: 0 0 32px;
}

.form {
  display: grid;
  gap: 20px;
  padding: 28px;
}

.form .btn {
  justify-self: start;
}
</style>

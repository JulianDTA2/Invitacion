import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export const useEventStore = defineStore('event', () => {
  const config = reactive({
    id: '001', 
    name: 'Prueba Torneo',
    address: 'Matriz Valle, Quito',
    date: '15 de Diciembre, 2025',
    time: '10:00 AM',
    welcomeMsg: 'Mensaje detalle del evento. ¡Nos vemos allá!',
    assistanceMsg: 'Presenta este código QR en la entrada.'
  })

  const lastSequence = ref(parseInt(localStorage.getItem('qr_last_sequence')) || 0)

  function incrementSequence(quantity) {
    lastSequence.value += quantity
    localStorage.setItem('qr_last_sequence', lastSequence.value)
  }

  function resetSequence() {
    lastSequence.value = 0
    localStorage.setItem('qr_last_sequence', 0)
  }

  return { config, lastSequence, incrementSequence, resetSequence }
})
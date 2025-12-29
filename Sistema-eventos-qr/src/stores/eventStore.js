import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export const useEventStore = defineStore('event', () => {
  const config = reactive({
    id: '001', 
    name: 'VIII TORNEO NACIONAL DE ROBÓTICA',
    address: 'https://surl.li/olougg',
    date: '23 y 24 de Enero, 2026',
    time: '07:00 AM',
    welcomeMsg: 'Te esperamos para vivir una experiencia de aprendizaje, creatividad y desafío.',
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
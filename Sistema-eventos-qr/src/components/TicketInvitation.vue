<script setup>
import { computed } from 'vue';
import { useEventStore } from '@/stores/eventStore';

const props = defineProps({
  guest: Object
});

const eventStore = useEventStore();

const headerColor = computed(() => {
  const typeStr = String(props.guest.ticketType || '').trim().toUpperCase();

  switch(typeStr) {
    case 'VIP': return 'bg-yellow-500';
    case 'REGULAR +': return 'bg-purple-600';
    case 'REGULAR': return 'bg-blue-600';
    default: return 'bg-gray-400';
  }
});
</script>
<template>
  <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 font-sans mx-auto transform transition hover:scale-105 duration-300 max-w-sm w-full">
    <div :class="[headerColor, 'h-4 w-full']"></div>
    
    <div class="p-6 text-center">
      <h2 class="text-2xl font-bold text-gray-800 mb-1 capitalize">
        {{ guest.firstName }} {{ guest.lastName }}
      </h2>
      
      <span class="inline-block px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-500 mb-4 tracking-wide border border-gray-200">
        {{ guest.ticketType }} TICKET
      </span>

      <p class="text-gray-600 mb-4 font-medium text-sm leading-relaxed">
        {{ eventStore.config.welcomeMsg }}
      </p>
      
      <div class="bg-slate-50 p-4 rounded-lg my-4 text-left text-sm border border-slate-100">
        <p class="font-bold text-slate-800 text-lg mb-1">{{ eventStore.config.name }}</p>
        <p class="text-slate-600 flex items-center gap-2 mt-1">
          {{ eventStore.config.date }}
        </p>
        <p class="text-slate-600 flex items-center gap-2">
          {{ eventStore.config.address }}
        </p>
      </div>

      <p class="text-xs text-gray-400 mb-4 italic">{{ eventStore.config.assistanceMsg }}</p>

      <div class="border-t border-dashed border-gray-300 pt-4 flex flex-col items-center">
        <img :src="guest.qrImage" alt="QR Acceso" class="w-32 h-32 mb-2 mix-blend-multiply" />
        
        <p class="font-mono text-sm tracking-widest text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded">
          {{ guest.uniqueCode }}
        </p>
      </div>
    </div>
  </div>
</template>
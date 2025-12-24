<script setup>
import { ref } from 'vue';
import Papa from 'papaparse';
import QRCode from 'qrcode';
import { useEventStore } from '@/stores/eventStore';
import { generateTicketCode } from '@/utils/codeGenerator';
import TicketInvitation from '@/components/TicketInvitation.vue';

const eventStore = useEventStore();
const guests = ref([]);
const isProcessing = ref(false);
const isSending = ref(false);
const totalEnviadosExito = ref(0);

// --- FUNCIONES DE UTILIDAD ---

const handleResetEmailCounter = () => {
  if (confirm('¿Quieres poner el contador de ENVÍOS EXITOSOS a cero?')) {
    totalEnviadosExito.value = 0;
  }
}

const handleReset = () => {
  if (confirm('¿Estás seguro de reiniciar el contador de la SECUENCIA DE TICKETS a 00000?')) {
    eventStore.resetSequence();
    guests.value = [];
    alert('Secuencia reiniciada correctamente.');
  }
}

// --- LÓGICA PRINCIPAL ---

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  isProcessing.value = true;
  guests.value = [];

  let currentCounter = eventStore.lastSequence;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
    complete: async (results) => {
      const processed = await Promise.all(results.data.map(async (row, index) => {
        const nombre = row['nombre']?.trim() || 'Invitado';
        const apellido = row['apellido']?.trim() || '';
        const email = row['email']?.trim() || 'Sin email';
        const tipoRaw = row['tipo']?.trim() || 'Desconocido';
        const sequenceNumber = currentCounter + index + 1;
        
        const code = generateTicketCode(eventStore.config.id, tipoRaw, sequenceNumber);
        
        const qrDataUrl = await QRCode.toDataURL(code, {
          width: 300,
          margin: 2,
          color: { dark: '#334155', light: '#ffffff' }
        });

        return {
          id: index,
          firstName: nombre,
          lastName: apellido,
          email: email,
          ticketType: tipoRaw,
          uniqueCode: code,
          qrImage: qrDataUrl
        };
      }));

      guests.value = processed;
      isProcessing.value = false;
      eventStore.incrementSequence(results.data.length);
      event.target.value = '';
    }
  });
};

const sendEmails = async () => {
  if (guests.value.length === 0) return;

  if (!confirm(`¿Estás listo para enviar ${guests.value.length} correos electrónicos ahora?`)) {
    return;
  }

  isSending.value = true;

  try {
    const response = await fetch('http://localhost:3000/send-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guests: guests.value,
        eventConfig: eventStore.config 
      })
    });

    const result = await response.json();

    if (response.ok) {
      if (result.stats && result.stats.success) {
        totalEnviadosExito.value += result.stats.success;
      }
      alert(`¡Envíos completados!\nExitosos en esta tanda: ${result.stats.success}\nErrores: ${result.stats.errors}`);
    } else {
      alert('Hubo un error en el servidor.');
    }

  } catch (error) {
    console.error(error);
    alert('Error de conexión: Asegúrate de que el servidor Backend esté corriendo en el puerto 3000.');
  } finally {
    isSending.value = false;
  }
};

const previewEmail = async () => {
  if (guests.value.length === 0) return alert("Carga un archivo primero.");

  // Tomamos el primer invitado como ejemplo
  const primerInvitado = guests.value[0];

  try {
    const response = await fetch('http://localhost:3000/preview-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest: primerInvitado,
        eventConfig: eventStore.config
      })
    });

    if (!response.ok) throw new Error("Error en el servidor");

    const htmlContent = await response.text();

    const newWindow = window.open('', '_blank');
    if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
    } else {
        alert("Permite las ventanas emergentes (pop-ups) para ver la vista previa.");
    }

  } catch (error) {
    alert("Error al generar la vista previa");
    console.error(error);
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-100 p-8 font-sans">
    
    <header class="max-w-7xl mx-auto mb-10 flex flex-col xl:flex-row justify-between items-center gap-6">
      
      <div class="text-center md:text-left">
        <h1 class="text-3xl font-extrabold text-slate-800 tracking-tight">Gestor de Accesos</h1>
        <p class="text-slate-500">Generación secuencial e inteligente</p>
      </div>

      <div class="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
        
        <div class="bg-white px-5 py-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-6 text-sm w-full md:w-auto justify-between">
          <div>
            <span class="block text-xs text-slate-400 uppercase font-bold">Último Ticket</span>
            <span class="font-mono font-bold text-indigo-600 text-2xl">
              #{{ String(eventStore.lastSequence).padStart(5, '0') }}
            </span>
          </div>
          <div class="h-10 w-px bg-slate-200"></div>
          <button @click="handleReset" class="text-slate-400 hover:text-red-500 font-bold text-xs flex flex-col items-center gap-1 transition-colors" title="Reiniciar secuencia">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <button @click="sendEmails" :disabled="isSending" class="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white px-6 py-4 rounded-lg font-bold shadow transition flex items-center gap-2 h-full w-full md:w-auto justify-center">
          <span v-if="!isSending"></span>
          <svg v-else class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSending ? 'Enviando...' : 'Enviar Correos' }}
        </button>

        <button @click="previewEmail" class="bg-blue-500 hover:bg-blue-600 text-white px-5 py-4 rounded-lg font-bold shadow transition h-full w-full md:w-auto">
          Ver Ejemplo
        </button>
      </div>
    </header>

    <div class="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm mb-12 text-center border-2 border-dashed border-indigo-100 hover:border-indigo-400 transition-colors group">
      <label class="cursor-pointer flex flex-col items-center justify-center w-full h-full">
        <div class="bg-indigo-50 p-4 rounded-full mb-4 group-hover:bg-indigo-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <span class="text-xl font-bold text-slate-700">Cargar archivo (.csv)</span>
        <span class="text-sm text-slate-400 mt-2">Columnas: nombre, apellido, email, tipo</span>
        <input type="file" @change="handleFileUpload" accept=".csv" class="hidden" />
        <div class="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition transform hover:-translate-y-0.5">
          Seleccionar Archivo
        </div>
      </label>
      <p v-if="isProcessing" class="mt-4 text-indigo-600 font-bold animate-pulse">Procesando...</p>
    </div>

    <div v-if="guests.length > 0" class="max-w-7xl mx-auto">
      <div class="flex justify-between items-end mb-8 border-b border-slate-200 pb-4">
        <h2 class="text-2xl font-bold text-slate-800">Vista Previa ({{ guests.length }})</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <TicketInvitation v-for="guest in guests" :key="guest.id" :guest="guest" />
      </div>
    </div>
  </div>
</template>
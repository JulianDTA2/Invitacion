const TICKET_TYPES = {
  'Regular': '001',
  'Regular +': '002',
  'VIP': '003'
};

const pad = (num, size) => {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

export const generateTicketCode = (eventId, typeName, index) => {
  // Si el tipo no existe en el mapa, usamos '000' por seguridad
  const typeCode = TICKET_TYPES[typeName] || '000'; 
  
  // Generamos el consecutivo de 5 dígitos
  const incrementalCode = pad(index, 5);
  
  return `${eventId}-${typeCode}-${incrementalCode}`;
};
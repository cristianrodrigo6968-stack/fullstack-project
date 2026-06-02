import { generarReciboPDF } from './pdfGenerator';
import fs from 'fs';

const datosPrueba = {
  cliente: {
    nombreCompleto: 'Juan Pérez',
    ci: '1234567',
    celular: '71234567',
    email: 'juan@example.com',
  },
  pedido: {
    id: 999,
    montoTotal: 1500,
    montoPagado: 500,
    saldoPendiente: 1000,
    fecha: new Date(),
  },
  items: [
    { titulo: 'Libro de prueba', tipo: 'producto', precioUnitario: 1500 },
  ],
};

generarReciboPDF(datosPrueba)
  .then((buffer: Buffer) => {
    fs.writeFileSync('./recibo-prueba.pdf', buffer);
    console.log('✅ PDF guardado como recibo-prueba.pdf');
  })
  .catch((err: any) => console.error('Error generando PDF:', err));

  
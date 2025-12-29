require('dotenv').config();
const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');
// Nota: Ya no necesitamos 'qrcode' ni 'fs'

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

const resend = new Resend(process.env.RESEND_API_KEY || '');

// ==========================================
// 1. TU GENERADOR DE CÓDIGOS
// ==========================================
const TICKET_TYPES = {
    'Regular': '001',
    'REGULAR': '001',
    'Regular +': '002',
    'REGULAR +': '002',
    'VIP': '003',
    'PLUS': '002' 
};

const pad = (num, size) => {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

const generateTicketCode = (eventId, typeName, index) => {
    const typeKey = Object.keys(TICKET_TYPES).find(k => k.toUpperCase() === (typeName || '').toUpperCase());
    const typeCode = TICKET_TYPES[typeKey] || '000';
    const incrementalCode = pad(index, 5);
    return `${eventId}-${typeCode}-${incrementalCode}`;
};

// ==========================================
// 2. RUTA PARA ENVIAR CORREOS
// ==========================================
app.post('/send-emails', async (req, res) => {
    const { guests, eventConfig } = req.body;
    let successCount = 0;
    let errorCount = 0;
    const eventId = eventConfig.id || 'EVT'; 

    console.log(`Iniciando envío a ${guests.length} invitados...`);

    for (const [index, guest] of guests.entries()) {
        try {
            const ticketType = (guest.ticketType || 'VIP').toUpperCase();
            
            // Colores
            let ribbonColor = '#FF3D81';
            if (ticketType === 'VIP') ribbonColor = '#FFE45E';
            if (ticketType === 'PLUS' || ticketType === 'REGULAR +') ribbonColor = '#00D3FF';

            // 1. Generar ID Único
            const uniqueCode = guest.uniqueCode || generateTicketCode(eventId, guest.ticketType, index + 1);

            // 2. Generar URL del QR (Sin adjuntos, carga directa)
            // Usamos QuickChart: es HTTPS (seguro para Gmail) y genera la imagen al vuelo.
            const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(uniqueCode)}&size=300&margin=2&dark=000000&light=ffffff`;

            await resend.emails.send({
                from: 'WoowTek Eventos <noreply@woowtek.com>',
                to: [guest.email],
                subject: `Tu Ticket para ${eventConfig.name}`,
                html: getHtmlTemplate(
                    { ...guest, uniqueCode }, 
                    eventConfig, 
                    ribbonColor, 
                    ticketType, 
                    'https://roboticminds.com.ec/registro/wp-content/uploads/2024/12/Sin-titulo-5-scaled-1024x377.png', 
                    qrUrl // <--- Pasamos la URL web directa, no un CID
                )
                // Nota: Eliminamos la sección 'attachments' completamente
            });

            console.log(`Enviado a: ${guest.email} (ID: ${uniqueCode})`);
            successCount++;
            
            // Pequeña pausa para respetar límites de API
            if (index < guests.length - 1) await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`Error con ${guest.email}:`, error);
            errorCount++;
        }
    }

    res.json({ message: 'Finalizado', stats: { success: successCount, errors: errorCount } });
});

// ==========================================
// 3. RUTA PREVIEW
// ==========================================
app.post('/preview-email', async (req, res) => {
    const { guest, eventConfig } = req.body;
    try {
        const eventId = eventConfig.id || 'PREVIEW';
        const ticketType = (guest.ticketType || 'VIP').toUpperCase();
        
        let ribbonColor = '#FF3D81';
        if (ticketType === 'VIP') ribbonColor = '#FFE45E';
        if (ticketType === 'PLUS' || ticketType === 'REGULAR +') ribbonColor = '#00D3FF';

        const logoUrl = 'https://roboticminds.com.ec/registro/wp-content/uploads/2024/12/Sin-titulo-5-scaled-1024x377.png';
        const uniqueCode = guest.uniqueCode || generateTicketCode(eventId, guest.ticketType, 1);
        
        // Mismo generador para el preview
        const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(uniqueCode)}&size=300&margin=2&dark=000000&light=ffffff`;

        const html = getHtmlTemplate({ ...guest, uniqueCode }, eventConfig, ribbonColor, ticketType, logoUrl, qrUrl, true);
        res.send(html);
    } catch (error) {
        res.status(500).send("Error: " + error.message);
    }
});

// ==========================================
// 4. TEMPLATE HTML (Sin cambios)
// ==========================================
function getHtmlTemplate(guest, eventConfig, ribbonColor, ticketType, logoSrc, qrSrc, isPreview = false) {
    const previewHeader = isPreview ? `<div style="background:#eee;padding:10px;text-align:center;margin-bottom:20px;">PREVISUALIZACIÓN</div>` : '';

    return `
    <!DOCTYPE html>
    <html lang="es">
    <div style="border:3px solid #121217; border-radius:10px; padding:5px; background:#fff; display:none; box-shadow:4px 4px 0 #121217;">
                                                                        <img src="${qrSrc}" width="140" alt="QR" style="display:block; width:100%; max-width:140px; height:auto;">
                                                                    </div>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Ticket</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        @media screen and (max-width: 620px) {
            .container { width: 100% !important; max-width: 100% !important; }
            .mobile-p-15 { padding: 15px !important; }
            .stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
            .rightCol { border-left: none !important; border-top: 4px solid #121217 !important; margin-top: 15px !important; padding-top: 15px !important; }
            .logo-cell { display: inline-block !important; width: 48% !important; box-sizing: border-box !important; }
            .title-text { font-size: 24px !important; }
        }
    </style>
</head>
<body style="margin:0; padding:15px; background-color:transparent; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    ${previewHeader}
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        Tu entrada para ${eventConfig.name}. ID: ${guest.uniqueCode}
    </div>
    <center>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:transparent;">
            <tr>
                <td align="center" valign="top">
                    <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; width:100%;">
                        <tr>
                            <td style="padding:15px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f7f7fb; border:4px solid #121217; border-radius:18px; overflow:hidden; border-collapse: separate;">
                                    <tr>
                                        <td style="padding:0;">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                <tr>
                                                    <td class="stack mobile-p-15" valign="top" style="width:60%; padding:15px;">
                                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                            <tr>
                                                                <td valign="top">
                                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                                        <tr>
                                                                            <td class="logo-cell" style="padding-right:5px; width:50%;">
                                                                                <div style="border:3px dashed rgba(18,18,23,.35); border-radius:10px; background:#fff; padding:8px; text-align:center;">
                                                                                    <img src="${logoSrc}" alt="Logo" style="display:block; max-height:30px; margin:0 auto; width:auto; max-width:100%;">
                                                                                </div>
                                                                            </td>
                                                                            <td class="logo-cell" style="padding-left:5px; width:50%;">
                                                                                <div style="border:3px dashed rgba(18,18,23,.35); border-radius:10px; background:#fff; padding:8px; text-align:center;">
                                                                                    <div style="font-weight:900; color:#ccc; font-size:10px; line-height:30px;">EVENTOS</div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                            <tr><td height="15" style="font-size:15px; line-height:15px;">&nbsp;</td></tr>
                                                            <tr>
                                                                <td align="left">
                                                                    <span style="background:${ribbonColor}; border:3px solid #121217; border-radius:50px; padding:6px 12px; font-weight:900; text-transform:uppercase; font-size:11px; letter-spacing:1px; display:inline-block; box-shadow:4px 4px 0 #121217;">
                                                                        ${ticketType}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                        <div style="height:15px; line-height:15px; font-size:15px;">&nbsp;</div>
                                                        <div class="title-text" style="font-weight:900; font-size:28px; line-height:1.1; letter-spacing:-0.5px; text-transform:uppercase; color:#121217;">
                                                            ${eventConfig.name}
                                                        </div>
                                                        <div style="height:10px; line-height:10px; font-size:10px;">&nbsp;</div>
                                                        <div>
                                                            <span style="display:inline-block; border:3px solid #121217; border-radius:50px; padding:6px 10px; background:${ribbonColor}; box-shadow:4px 4px 0 #121217; font-weight:900; font-size:12px; letter-spacing:.8px; text-transform:uppercase; color:#121217;">
                                                                Entrada: ${ticketType}
                                                            </span>
                                                        </div>
                                                        <div style="height:15px; line-height:15px; font-size:15px;">&nbsp;</div>
                                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff; border:3px solid rgba(18,18,23,.15); border-radius:12px; box-shadow: 4px 4px 0 rgba(0,0,0,0.1); border-collapse: separate;">
                                                            <tr>
                                                                <td style="padding:15px;">
                                                                    <div style="font-weight:900; font-size:16px; margin-bottom:5px; color:#121217;">¡Bienvenido al Octavo Torneo Nacional de Robótica!</div>
                                                                    <div style="font-size:13px; font-weight:600; color:#3a3a46; line-height:1.4;">
                                                                        ${eventConfig.welcomeMsg || 'Presenta este ticket en el acceso. ¡Nos vemos!'}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                        <div style="height:15px; line-height:15px; font-size:15px;">&nbsp;</div>
                                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                                            <tr>
                                                                <td style="width:50%; padding-right:7px;">
                                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff; border:3px solid #121217; border-radius:12px; box-shadow:4px 4px 0 #121217; border-collapse: separate;">
                                                                        <tr>
                                                                            <td style="padding:10px;">
                                                                                <div style="font-size:10px; text-transform:uppercase; font-weight:900; color:#3a3a46;">Fecha</div>
                                                                                <div style="font-size:14px; font-weight:900; color:#121217;">${eventConfig.date}</div>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                                <td style="width:50%; padding-left:7px;">
                                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff; border:3px solid #121217; border-radius:12px; box-shadow:4px 4px 0 #121217; border-collapse: separate;">
                                                                        <tr>
                                                                            <td style="padding:10px;">
                                                                                <div style="font-size:10px; text-transform:uppercase; font-weight:900; color:#3a3a46;">Hora</div>
                                                                                <div style="font-size:14px; font-weight:900; color:#121217;">${eventConfig.time}</div>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                            <tr><td colspan="2" height="10" style="font-size:10px; line-height:10px;">&nbsp;</td></tr>
                                                            <tr>
                                                                <td colspan="2">
                                                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff; border:3px solid #121217; border-radius:12px; box-shadow:4px 4px 0 #121217; border-collapse: separate;">
                                                                        <tr>
                                                                            <td style="padding:10px;">
                                                                                <div style="font-size:10px; text-transform:uppercase; font-weight:900; color:#3a3a46;">Ubicación</div>
                                                                                <div style="font-size:14px; font-weight:900; color:#121217;">${eventConfig.address}</div>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                        <div style="height:15px; line-height:15px; font-size:15px;">&nbsp;</div>
                                                        <div style="border-top:3px dashed rgba(18,18,23,.25); height:0;"></div>
                                                        <div style="height:15px; line-height:15px; font-size:15px;">&nbsp;</div>
                                                        <div style="font-size:11px; color:#3a3a46; font-weight:700;">
                                                            <span style="margin-right:10px; white-space:nowrap;"><b style="color:#121217;">ID:</b> ${guest.uniqueCode}</span>
                                                            <span style="white-space:nowrap;"><b style="color:#121217;">Soporte:</b> atencionalcliente@woowtek.com</span>
                                                        </div>
                                                    </td>
                                                    <td class="stack rightCol mobile-p-15" valign="top" style="width:40%; padding:15px; border-left:4px solid #121217; background-color:#ffffff;">
                                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:4px solid #121217; border-radius:14px; background:#fff; box-shadow:6px 6px 0 #121217; border-collapse: separate;">
                                                            <tr>
                                                                <td align="center" style="padding:15px;">
                                                                    <div style="font-weight:900; font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; color:#121217;">
                                                                        Escanea para validar
                                                                    </div>
                                                                    <div style="border:3px solid #121217; border-radius:10px; padding:5px; background:#fff; display:inline-block; box-shadow:4px 4px 0 #121217;">
                                                                        <img src="${qrSrc}" width="140" alt="QR" style="display:block; width:100%; max-width:140px; height:auto;">
                                                                    </div>
                                                                    <div style="height:10px; line-height:10px;">&nbsp;</div>
                                                                    <div style="background:${ribbonColor}; border:3px solid #121217; border-radius:8px; padding:8px; font-weight:900; font-size:14px; color:#121217; box-shadow:3px 3px 0 #121217;">
                                                                        ${guest.uniqueCode}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                        <div style="height:15px; line-height:15px; font-size:15px;">&nbsp;</div>
                                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff; border:3px solid rgba(18,18,23,.15); border-radius:12px; box-shadow: 4px 4px 0 rgba(0,0,0,0.1); border-collapse: separate;">
                                                            <tr>
                                                                <td style="padding:12px; font-size:11px; line-height:1.4; color:#3a3a46; font-weight:600;">
                                                                    <b style="color:#121217; display:block; margin-bottom:4px;">Reglas rápidas:</b>
                                                                    • QR de uso personal.<br>
                                                                    • Check-in obligatorio.<br>
                                                                    • Muestra tu QR para ingresar.
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                <div style="height:15px; line-height:15px; font-size:15px;">&nbsp;</div>
                                <div style="text-align:center; font-weight:700; font-size:12px; color:#5c5c68;">
                                    Robotic Minds • Edtech Company
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>
`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
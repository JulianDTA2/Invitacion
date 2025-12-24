require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '50mb' })); 
app.use(cors());

// Función de espera (Anti-bloqueo Zoho)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Ruta al logo local
const logoPath = path.join(__dirname, 'assets', 'logo.png');

// --- 1. RUTA PARA ENVIAR CORREOS (Usa CIDs para adjuntos) ---
app.post('/send-emails', async (req, res) => {
    const { guests, eventConfig } = req.body;
    let successCount = 0;
    let errorCount = 0;

    console.log(`Iniciando envío a ${guests.length} invitados...`);

    for (const guest of guests) {
        try {
            const ticketType = (guest.ticketType || 'VIP').toUpperCase();
            
            // Colores dinámicos
            let ribbonColor = '#FF3D81'; 
            if (ticketType === 'VIP') ribbonColor = '#FFE45E'; 
            if (ticketType === 'PLUS' || ticketType === 'REGULARPLUS') ribbonColor = '#00D3FF'; 

            const mailOptions = {
                from: `"WoowTek Eventos" <${process.env.EMAIL_USER}>`,
                to: guest.email,
                subject: `Tu Ticket para ${eventConfig.name}`,
                html: getHtmlTemplate(guest, eventConfig, ribbonColor, ticketType, 'cid:logo-event', 'cid:unique-qr-code'),
                attachments: [
                    {
                        filename: 'logo.png',
                        path: logoPath,
                        cid: 'logo-event'
                    },
                    {
                        filename: 'ticket-qr.png',
                        content: guest.qrImage.split("base64,")[1],
                        encoding: 'base64',
                        cid: 'unique-qr-code'
                    }
                ]
            };

            await transporter.sendMail(mailOptions);
            console.log(`Enviado a: ${guest.email}`);
            successCount++;

            console.log("Esperando 4 segundos...");
            await sleep(4000);

        } catch (error) {
            console.error(`Error con ${guest.email}:`, error.message);
            errorCount++;
            if(error.response && error.response.includes('5.4.6')) {
                console.log("BLOQUEO DETECTADO. Parando.");
                break; 
            }
        }
    }

    res.json({
        message: 'Proceso finalizado',
        stats: { success: successCount, errors: errorCount }
    });
});

// --- 2. RUTA PARA PREVISUALIZAR (Usa Base64 para navegador) ---
app.post('/preview-email', (req, res) => {
    const { guest, eventConfig } = req.body;

    try {
        const ticketType = (guest.ticketType || 'VIP').toUpperCase();
        let ribbonColor = '#FF3D81'; 
        if (ticketType === 'VIP') ribbonColor = '#FFE45E'; 
        if (ticketType === 'PLUS' || ticketType === 'REGULARPLUS') ribbonColor = '#00D3FF';

        // Convertir Logo local a Base64
        const logoBitmap = fs.readFileSync(logoPath);
        const logoBase64 = `data:image/png;base64,${logoBitmap.toString('base64')}`;
        
        // Asegurar formato del QR
        const qrBase64 = guest.qrImage.startsWith('data:') ? guest.qrImage : `data:image/png;base64,${guest.qrImage}`;

        // Generamos el HTML pasando los Base64 como fuentes
        const html = getHtmlTemplate(guest, eventConfig, ribbonColor, ticketType, logoBase64, qrBase64, true);

        res.send(html);

    } catch (error) {
        console.error("Error generando preview:", error);
        res.status(500).send("Error: " + error.message);
    }
});

// --- FUNCIÓN HELPER PARA NO REPETIR EL HTML ---
function getHtmlTemplate(guest, eventConfig, ribbonColor, ticketType, logoSrc, qrSrc, isPreview = false) {
    const previewHeader = isPreview ? 
        `<div style="background:transparent;padding:10px;text-align:center;font-family:sans-serif;margin-bottom:20px;border-radius:8px;"><b>MODO PREVISUALIZACIÓN</b></div>` : '';

    return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ticket</title>
  <style>
    /* Reset básico */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

    /* MEDIA QUERIES PARA MÓVIL */
    @media screen and (max-width: 620px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .mobile-p-15 { padding: 15px !important; }
      .stack { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .rightCol {
        border-left: none !important;
        border-top: 4px solid #121217 !important;
        margin-top: 15px !important;
        padding-top: 15px !important;
      }
      .logo-group { width: 100% !important; display: block !important; margin-bottom: 10px !important; }
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

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" 
                       style="background-color:#f7f7fb; border:4px solid #121217; border-radius:18px; overflow:hidden;">
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

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff; border:3px solid rgba(18,18,23,.15); border-radius:12px; box-shadow: 4px 4px 0 rgba(0,0,0,0.1);">
                              <tr>
                                <td style="padding:15px;">
                                  <div style="font-weight:900; font-size:16px; margin-bottom:5px; color:#121217;">¡Bienvenido! Estamos felices de tenerte aquí.</div>
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
                                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff; border:3px solid #121217; border-radius:12px; box-shadow:4px 4px 0 #121217;">
                                    <tr>
                                      <td style="padding:10px;">
                                        <div style="font-size:10px; text-transform:uppercase; font-weight:900; color:#3a3a46;">Fecha</div>
                                        <div style="font-size:14px; font-weight:900; color:#121217;">${eventConfig.date}</div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                                <td style="width:50%; padding-left:7px;">
                                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff; border:3px solid #121217; border-radius:12px; box-shadow:4px 4px 0 #121217;">
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
                                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff; border:3px solid #121217; border-radius:12px; box-shadow:4px 4px 0 #121217;">
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
                            
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" 
                                   style="border:4px solid #121217; border-radius:14px; background:#fff; box-shadow:6px 6px 0 #121217;">
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

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff; border:3px solid rgba(18,18,23,.15); border-radius:12px; box-shadow: 4px 4px 0 rgba(0,0,0,0.1);">
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
import { NextRequest, NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracle";
import oracledb from "oracledb";
import { getSession } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "El correo es requerido" }, { status: 400 });
    }

    connection = await getOracleConnection();

    // Fetch details of the solved incident
    const result = await connection.execute(
      `SELECT L.ID,
              L.ID_ALERTA,
              A.DESCRIPCION_ALERTA,
              L.LOG,
              L.FECHA,
              L.SOLUCIONADO,
              L.FECHA_SOLUCION,
              L.COMENTARIOS_SOLUCION
         FROM TKR_LOG_ALERTAS L, TKR_ALERTAS A
        WHERE L.ID_ALERTA = A.ID
          AND L.ID = :p_id_log`,
      { p_id_log: Number(id) }
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ error: "Log no encontrado" }, { status: 404 });
    }

    const log = result.rows[0] as any;

    const fechaSolucionStr = log.FECHA_SOLUCION 
      ? new Date(log.FECHA_SOLUCION).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) 
      : 'N/A';
    const fechaOcurrenciaStr = log.FECHA 
      ? new Date(log.FECHA).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) 
      : 'N/A';

    const commentsHtml = log.COMENTARIOS_SOLUCION
      ? `<pre style="font-family: sans-serif; font-size: 13px; background: #f8f9fa; border: 1px solid #dee2e6; padding: 12px; border-radius: 6px; white-space: pre-wrap; color: #333; font-style: italic;">${log.COMENTARIOS_SOLUCION}</pre>`
      : '<p style="color: #666; font-style: italic;">No hay comentarios registrados.</p>';

    const logOriginalHtml = log.LOG
      ? `<pre style="font-family: monospace; font-size: 11px; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; white-space: pre-wrap; color: #0f172a; max-height: 250px; overflow-y: auto;">${log.LOG}</pre>`
      : '<p style="color: #666;">Sin detalles de log.</p>';

    const subject = `Reporte de Solución: Alerta #${log.ID_ALERTA} (Log #${log.ID})`;

    const emailBody = `
Reporte de Incidente Solucionado
=================================
ID Log: ${log.ID}
Alerta: ${log.DESCRIPCION_ALERTA} (#${log.ID_ALERTA})
Fecha Ocurrencia: ${fechaOcurrenciaStr}
Fecha Solución: ${fechaSolucionStr}
Solucionado por: ${log.SOLUCIONADO || 'N/A'}

Comentarios de Solución:
${log.COMENTARIOS_SOLUCION || 'Sin comentarios'}
    `;

    const emailBodyHtml = `
<div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
  <div style="background-color: #0b101e; padding: 24px; border-bottom: 2px solid #ff5a1f;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; display: flex; align-items: center;">
      <span style="color: #ff5a1f; margin-right: 8px;">✓</span> Reporte de Solución de Incidente
    </h1>
    <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Sistema de Alertas Teker</p>
  </div>
  <div style="padding: 24px; background-color: #ffffff;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; color: #64748b; width: 140px;">ID Registro:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a; font-weight: 700;">#${log.ID}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; color: #64748b;">Alerta Relacionada:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #06b6d4; font-weight: 700;">#AL-${log.ID_ALERTA} - ${log.DESCRIPCION_ALERTA}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; color: #64748b;">Fecha Ocurrencia:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; font-family: monospace;">${fechaOcurrenciaStr}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; color: #64748b;">Fecha Solución:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #10b981; font-family: monospace; font-weight: 700;">${fechaSolucionStr}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; color: #64748b;">Solucionado Por:</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; font-weight: 600;">${log.SOLUCIONADO || 'N/A'}</td>
      </tr>
    </table>

    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Detalles de la Solución Aplicada</h3>
      ${commentsHtml}
    </div>

    <div style="margin-bottom: 8px;">
      <h3 style="font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Log de Error / Excepción Original</h3>
      ${logOriginalHtml}
    </div>
  </div>
  <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
    <p style="margin: 0; font-size: 11px; color: #94a3b8;">Este es un reporte oficial de cierre de incidentes generado por Alertas App.</p>
  </div>
</div>
    `;

    // Invoke APEX_MAIL
    await connection.execute(
      `BEGIN
         apex_mail.send(
           p_to        => :p_to,
           p_from      => 'soporte@teker.co',
           p_body      => :p_body,
           p_body_html => :p_body_html,
           p_subj      => :p_subj
         );
         apex_mail.push_queue;
       END;`,
      {
        p_to: email,
        p_body: emailBody,
        p_body_html: emailBodyHtml,
        p_subj: subject
      },
      { autoCommit: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error POST /api/logs/[id]/email:", error);
    return NextResponse.json(
      { error: "Error enviando reporte por correo", details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
}

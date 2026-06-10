CREATE OR REPLACE PACKAGE pkgln_alertas AS

  -- TYPE REF CURSOR para devolver result sets
  TYPE cur_type IS REF CURSOR;

  -- Variables globales genéricas para paso de parámetros dinámicos a funciones/procedimientos
  g_num1 NUMBER;
  g_num2 NUMBER;
  g_num3 NUMBER;
  g_num4 NUMBER;

  g_str1 VARCHAR2(4000);
  g_str2 VARCHAR2(4000);
  g_str3 VARCHAR2(4000);
  g_str4 VARCHAR2(4000);

  g_date1 DATE;
  g_date2 DATE;
  g_date3 DATE;
  g_date4 DATE;

  g_clob1 CLOB;
  g_clob2 CLOB;
  g_clob3 CLOB;

  -- ==========================================
  -- PROCEDURES Y FUNCIONES PARA TKR_ALERTAS
  -- ==========================================

  -- Obtiene todas las alertas, opcionalmente filtradas
  PROCEDURE p_get_alertas (
    p_id        IN  NUMBER DEFAULT NULL,
    p_estado    IN  VARCHAR2 DEFAULT NULL,
    p_resultado OUT cur_type
  );

  -- Crea o actualiza una alerta
  PROCEDURE p_save_alerta (
    p_id                 IN  NUMBER DEFAULT NULL,
    p_descripcion_alerta IN  VARCHAR2,
    p_tipo_proceso       IN  VARCHAR2,
    p_proceso            IN  VARCHAR2,
    p_frecuencia         IN  VARCHAR2,
    p_estado             IN  VARCHAR2,
    p_pasos_a_seguir     IN  CLOB,
    p_correo             IN  VARCHAR2,
    p_telefono           IN  VARCHAR2,
    p_prioridad          IN  VARCHAR2,
    p_usuario            IN  VARCHAR2,
    p_new_id             OUT NUMBER
  );

  -- Elimina una alerta logicamente (o cambia estado a 'I')
  PROCEDURE p_del_alerta (
    p_id      IN  NUMBER,
    p_usuario IN  VARCHAR2
  );

  -- ==========================================
  -- PROCEDURES Y FUNCIONES PARA TKR_LOG_ALERTAS
  -- ==========================================
  
  -- Obtiene el log de una alerta en particular
  PROCEDURE p_get_logs_alerta (
    p_id_alerta IN  NUMBER,
    p_resultado OUT cur_type
  );

  -- Actualiza el estado y solucion de un log (resolucion de incidente)
  -- MODIFICADO: reemplaza p_asignado (texto) por p_id_persona_asignada (NUMBER)
  PROCEDURE p_save_log_solucion (
    p_id_log               IN NUMBER,
    p_estado               IN VARCHAR2,
    p_id_persona_asignada  IN NUMBER,
    p_solucionado          IN VARCHAR2,
    p_comentarios_solucion IN CLOB
  );

  -- Obtiene todos los logs con filtros (ID de alerta, estado, fechas)
  -- MODIFICADO: retorna ID_PERSONA_ASIGNADA y NOMBRE_ASIGNADO
  PROCEDURE p_get_all_logs (
    p_id_alerta IN NUMBER DEFAULT NULL,
    p_estado    IN VARCHAR2 DEFAULT NULL,
    p_fecha_ini IN DATE DEFAULT NULL,
    p_fecha_fin IN DATE DEFAULT NULL,
    p_resultado OUT cur_type
  );

  -- Obtiene usuarios asignables (rol 13)
  PROCEDURE p_get_usuarios_asignables (
    p_resultado OUT cur_type
  );

  -- Guarda programacion de Alerta en Scheduler
  PROCEDURE p_save_programacion (
    p_id_alerta       IN NUMBER,
    p_tipo_frecuencia IN VARCHAR2,
    p_hora_ejecucion  IN VARCHAR2,
    p_repetir_cada    IN NUMBER,
    p_dias_operacion  IN VARCHAR2,
    p_fecha_inicio    IN DATE,
    p_fecha_fin       IN DATE
  );

  -- Procedimiento que realmente ejecuta el job por detras
  PROCEDURE p_ejecutar_job (
    p_id_alerta IN VARCHAR2
  );

  -- Elimina Job del scheduler y el registro de la programacion
  PROCEDURE p_del_programacion (
    p_id_job IN NUMBER
  );

  -- Activa o desactiva todos los jobs de una alerta
  PROCEDURE p_toggle_jobs_alerta (
    p_id_alerta IN NUMBER,
    p_estado    IN VARCHAR2
  );

  -- Ejecuta el proceso de una alerta (si es tipo SQL 'S'), guarda log en HTML y envía correo
  PROCEDURE p_procesar_proceso (
    p_id_alerta IN NUMBER
  );

END pkgln_alertas;
/

CREATE OR REPLACE PACKAGE BODY pkgln_alertas AS

  -- ==========================================
  -- GET ALERTAS
  -- ==========================================
  PROCEDURE p_get_alertas (
    p_id        IN  NUMBER DEFAULT NULL,
    p_estado    IN  VARCHAR2 DEFAULT NULL,
    p_resultado OUT cur_type
  ) IS
  BEGIN
    OPEN p_resultado FOR
      SELECT 
        ID, DESCRIPCION_ALERTA, TIPO_PROCESO, PROCESO, FRECUENCIA,
        ESTADO, PASOS_A_SEGUIR, CORREO, TELEFONO, PRIORIDAD,
        FECHA_ULTIMA_EJECUCION, ULTIMO_ESTADO_EJECUCION,
        FECHA_CREACION, CREADO_POR, FECHA_MODIFICACION, MODIFICADO_POR
      FROM TKR_ALERTAS
      WHERE (p_id IS NULL OR ID = p_id)
        AND (p_estado IS NULL OR ESTADO = p_estado)
      ORDER BY ID DESC;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE_APPLICATION_ERROR(-20001, 'Error en p_get_alertas: ' || SQLERRM);
  END p_get_alertas;

  -- ==========================================
  -- SAVE ALERTA
  -- ==========================================
  PROCEDURE p_save_alerta (
    p_id                 IN  NUMBER DEFAULT NULL,
    p_descripcion_alerta IN  VARCHAR2,
    p_tipo_proceso       IN  VARCHAR2,
    p_proceso            IN  VARCHAR2,
    p_frecuencia         IN  VARCHAR2,
    p_estado             IN  VARCHAR2,
    p_pasos_a_seguir     IN  CLOB,
    p_correo             IN  VARCHAR2,
    p_telefono           IN  VARCHAR2,
    p_prioridad          IN  VARCHAR2,
    p_usuario            IN  VARCHAR2,
    p_new_id             OUT NUMBER
  ) IS
    v_id NUMBER;
  BEGIN
    IF p_id IS NULL THEN
      SELECT NVL(MAX(ID), 0) + 1 INTO v_id FROM TKR_ALERTAS;
      
      INSERT INTO TKR_ALERTAS (
        ID, DESCRIPCION_ALERTA, TIPO_PROCESO, PROCESO, FRECUENCIA, 
        ESTADO, PASOS_A_SEGUIR, CORREO, TELEFONO, PRIORIDAD,
        FECHA_CREACION, CREADO_POR
      ) VALUES (
        v_id, p_descripcion_alerta, p_tipo_proceso, p_proceso, p_frecuencia, 
        p_estado, p_pasos_a_seguir, p_correo, p_telefono, p_prioridad,
        f_fecha_actual, p_usuario
      );
      
      p_new_id := v_id;
    ELSE
      UPDATE TKR_ALERTAS
      SET 
        DESCRIPCION_ALERTA = p_descripcion_alerta,
        TIPO_PROCESO       = p_tipo_proceso,
        PROCESO            = p_proceso,
        FRECUENCIA         = p_frecuencia,
        ESTADO             = p_estado,
        PASOS_A_SEGUIR     = p_pasos_a_seguir,
        CORREO             = p_correo,
        TELEFONO           = p_telefono,
        PRIORIDAD          = p_prioridad,
        FECHA_MODIFICACION = f_fecha_actual,
        MODIFICADO_POR     = p_usuario
      WHERE ID = p_id;
      
      p_new_id := p_id;
    END IF;
    
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE_APPLICATION_ERROR(-20002, 'Error en p_save_alerta: ' || SQLERRM);
  END p_save_alerta;

  -- ==========================================
  -- DELETE (Deactivate) ALERTA
  -- ==========================================
  PROCEDURE p_del_alerta (
    p_id      IN  NUMBER,
    p_usuario IN  VARCHAR2
  ) IS
  BEGIN
    UPDATE TKR_ALERTAS
    SET ESTADO = 'I',
        FECHA_MODIFICACION = f_fecha_actual,
        MODIFICADO_POR = p_usuario
    WHERE ID = p_id;
    
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE_APPLICATION_ERROR(-20003, 'Error en p_del_alerta: ' || SQLERRM);
  END p_del_alerta;

  -- ==========================================
  -- GET LOGS ALERTA
  -- ==========================================
  PROCEDURE p_get_logs_alerta (
    p_id_alerta IN  NUMBER,
    p_resultado OUT cur_type
  ) IS
  BEGIN
    OPEN p_resultado FOR
      SELECT 
        ID, ID_ALERTA, LOG, FECHA, ESTADO, ASIGNADO, 
        SOLUCIONADO, FECHA_SOLUCION, COMENTARIOS_SOLUCION
      FROM TKR_LOG_ALERTAS
      WHERE ID_ALERTA = p_id_alerta
      ORDER BY FECHA DESC;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE_APPLICATION_ERROR(-20004, 'Error en p_get_logs_alerta: ' || SQLERRM);
  END p_get_logs_alerta;

  -- ==========================================
  -- SAVE LOG SOLUCION
  -- MODIFICADO: usa ID_PERSONA_ASIGNADA en lugar de ASIGNADO (texto libre)
  --             registra auditoría en COMENTARIOS_SOLUCION al cambiar estado/asignado
  --             envía correo al asignado cuando estado = 'A'
  -- ==========================================
  PROCEDURE p_save_log_solucion (
    p_id_log               IN NUMBER,
    p_estado               IN VARCHAR2,
    p_id_persona_asignada  IN NUMBER,
    p_solucionado          IN VARCHAR2,
    p_comentarios_solucion IN CLOB
  ) IS
    v_nombre_asignado    VARCHAR2(500);
    v_correo_asignado    VARCHAR2(500);
    v_auditoria          VARCHAR2(2000);
    v_log_estado_prev    VARCHAR2(4000);
    v_log_estado_nuevo   VARCHAR2(4000);
    v_comentarios_prev   CLOB;
    v_comentarios_nuevo  CLOB;
    v_descripcion_alerta VARCHAR2(4000);
    v_id_alerta          NUMBER;
    v_p_body             CLOB;
    v_p_body_html        CLOB;
  BEGIN
    -- Obtener datos del log, la alerta, LOG_ESTADO previo y COMENTARIOS_SOLUCION previo
    SELECT L.ID_ALERTA, A.DESCRIPCION_ALERTA, L.LOG_ESTADO, L.COMENTARIOS_SOLUCION
      INTO v_id_alerta, v_descripcion_alerta, v_log_estado_prev, v_comentarios_prev
      FROM TKR_LOG_ALERTAS L, TKR_ALERTAS A
     WHERE L.ID = p_id_log
       AND A.ID = L.ID_ALERTA;

    -- Si se indica persona asignada, obtener nombre y correo
    IF p_id_persona_asignada IS NOT NULL THEN
      BEGIN
        SELECT nombres || ' ' || apellidos, correo_electronico
          INTO v_nombre_asignado, v_correo_asignado
          FROM tkr_usuarios
         WHERE id = p_id_persona_asignada;
      EXCEPTION
        WHEN NO_DATA_FOUND THEN
          v_nombre_asignado := 'Usuario ' || p_id_persona_asignada;
          v_correo_asignado := NULL;
      END;
    END IF;

    -- Construir nueva entrada de auditoría para LOG_ESTADO
    IF p_estado = 'A' AND p_id_persona_asignada IS NOT NULL THEN
      v_auditoria := '[' || TO_CHAR(f_fecha_actual, 'DD/MM/YYYY HH24:MI') || '] '
                  || 'Asignado a: ' || v_nombre_asignado
                  || ' | Por: ' || p_solucionado;
    ELSIF p_estado = 'S' THEN
      v_auditoria := '[' || TO_CHAR(f_fecha_actual, 'DD/MM/YYYY HH24:MI') || '] '
                  || 'Solucionado por: ' || p_solucionado;
    ELSIF p_estado = 'P' THEN
      v_auditoria := '[' || TO_CHAR(f_fecha_actual, 'DD/MM/YYYY HH24:MI') || '] '
                  || 'Regresado a Pendiente por: ' || p_solucionado;
    END IF;

    -- Acumular entradas de auditoría en LOG_ESTADO (VARCHAR2 4000)
    IF v_auditoria IS NOT NULL THEN
      IF v_log_estado_prev IS NOT NULL AND LENGTH(v_log_estado_prev) > 0 THEN
        v_log_estado_nuevo := SUBSTR(v_log_estado_prev || CHR(10) || v_auditoria, 1, 4000);
      ELSE
        v_log_estado_nuevo := v_auditoria;
      END IF;
    ELSE
      v_log_estado_nuevo := v_log_estado_prev;
    END IF;

    -- Construir COMENTARIOS_SOLUCION: siempre acumulativo, nunca sobreescribir
    -- Si ya hay contenido previo de otro usuario, se adiciona el nuevo texto al final
    IF p_comentarios_solucion IS NOT NULL AND DBMS_LOB.GETLENGTH(p_comentarios_solucion) > 0 THEN
      IF v_comentarios_prev IS NOT NULL AND DBMS_LOB.GETLENGTH(v_comentarios_prev) > 0 THEN
        -- Ya existe texto: adicionar separador + nuevo texto
        v_comentarios_nuevo := v_comentarios_prev
                            || CHR(10) || '---' || CHR(10)
                            || p_comentarios_solucion;
      ELSE
        -- No había texto previo: usar el nuevo directamente
        v_comentarios_nuevo := p_comentarios_solucion;
      END IF;
    ELSE
      -- No se envió texto nuevo: conservar el existente sin cambios
      v_comentarios_nuevo := v_comentarios_prev;
    END IF;

    -- Actualizar el log
    -- COMENTARIOS_SOLUCION: acumulativo (append), nunca sobreescribe texto previo
    -- LOG_ESTADO: auditoría de cambios de estado/asignación
    UPDATE TKR_LOG_ALERTAS
    SET 
      ESTADO                = p_estado,
      ID_PERSONA_ASIGNADA   = p_id_persona_asignada,
      SOLUCIONADO           = CASE WHEN p_estado = 'S' THEN p_solucionado ELSE NULL END,
      FECHA_SOLUCION        = CASE WHEN p_estado = 'S' THEN f_fecha_actual ELSE NULL END,
      COMENTARIOS_SOLUCION  = v_comentarios_nuevo,
      LOG_ESTADO            = v_log_estado_nuevo
    WHERE ID = p_id_log;

    COMMIT;

    -- Enviar correo al asignado si estado = 'A' y tiene correo
    IF p_estado = 'A' AND v_correo_asignado IS NOT NULL THEN
      v_p_body := 'Estimado/a ' || v_nombre_asignado || ','
               || CHR(10) || CHR(10)
               || 'Se le ha asignado la atención del siguiente incidente en el sistema de Alertas:'
               || CHR(10)
               || 'Alerta: ' || v_descripcion_alerta
               || CHR(10)
               || 'Log ID: ' || p_id_log
               || CHR(10)
               || 'Fecha de asignación: ' || TO_CHAR(f_fecha_actual, 'DD/MM/YYYY HH24:MI:SS')
               || CHR(10) || CHR(10)
               || 'Por favor ingrese al sistema para atender este incidente.'
               || CHR(10) || CHR(10)
               || 'Este correo fue generado automáticamente por el Sistema de Alertas Teker.';

      v_p_body_html := '<div style="font-family: sans-serif; font-size: 14px; color: #333; max-width: 600px;">'
        || '<div style="background-color: #0b101e; padding: 20px; border-radius: 8px 8px 0 0;">'
        || '<h1 style="color: #ff5a1f; margin: 0; font-size: 20px;">&#9888; Incidente Asignado</h1>'
        || '</div>'
        || '<div style="background-color: #f8f9fa; padding: 24px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 8px 8px;">'
        || '<p>Estimado/a <strong>' || v_nombre_asignado || '</strong>,</p>'
        || '<p>Se le ha asignado la atención del siguiente incidente:</p>'
        || '<table style="width:100%; border-collapse: collapse; margin: 16px 0;">'
        || '<tr><td style="padding: 8px; background:#e9ecef; font-weight:bold; width:140px;">Alerta:</td>'
        || '<td style="padding: 8px; border: 1px solid #dee2e6;">' || v_descripcion_alerta || '</td></tr>'
        || '<tr><td style="padding: 8px; background:#e9ecef; font-weight:bold;">Log ID:</td>'
        || '<td style="padding: 8px; border: 1px solid #dee2e6;">' || p_id_log || '</td></tr>'
        || '<tr><td style="padding: 8px; background:#e9ecef; font-weight:bold;">Asignado por:</td>'
        || '<td style="padding: 8px; border: 1px solid #dee2e6;">' || p_solucionado || '</td></tr>'
        || '<tr><td style="padding: 8px; background:#e9ecef; font-weight:bold;">Fecha:</td>'
        || '<td style="padding: 8px; border: 1px solid #dee2e6;">' || TO_CHAR(f_fecha_actual, 'DD/MM/YYYY HH24:MI:SS') || '</td></tr>'
        || '</table>'
        || '<p style="color: #666; font-size: 12px; margin-top: 24px; border-top: 1px solid #dee2e6; padding-top: 12px;">'
        || 'Este correo fue generado automáticamente por el Sistema de Alertas Teker.</p>'
        || '</div></div>';

      apex_mail.send(
        p_to        => v_correo_asignado,
        p_from      => 'soporte@teker.co',
        p_body      => v_p_body,
        p_body_html => v_p_body_html,
        p_subj      => 'Incidente Asignado: ' || v_descripcion_alerta || ' [Log #' || p_id_log || ']'
      );
      apex_mail.push_queue;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE_APPLICATION_ERROR(-20005, 'Error en p_save_log_solucion: ' || SQLERRM);
  END p_save_log_solucion;

  -- ==========================================
  -- GET ALL LOGS
  -- MODIFICADO: retorna ID_PERSONA_ASIGNADA y NOMBRE_ASIGNADO (sintaxis clásica Oracle)
  -- ==========================================
  PROCEDURE p_get_all_logs (
    p_id_alerta IN NUMBER DEFAULT NULL,
    p_estado    IN VARCHAR2 DEFAULT NULL,
    p_fecha_ini IN DATE DEFAULT NULL,
    p_fecha_fin IN DATE DEFAULT NULL,
    p_resultado OUT cur_type
  ) IS
  BEGIN
    OPEN p_resultado FOR
      SELECT 
        L.ID,
        L.ID_ALERTA,
        A.DESCRIPCION_ALERTA,
        L.LOG,
        L.FECHA,
        L.ESTADO,
        L.ID_PERSONA_ASIGNADA,
        (SELECT U.NOMBRES || ' ' || U.APELLIDOS
           FROM TKR_USUARIOS U
          WHERE U.ID = L.ID_PERSONA_ASIGNADA) AS NOMBRE_ASIGNADO,
        L.SOLUCIONADO,
        L.FECHA_SOLUCION,
        L.COMENTARIOS_SOLUCION,
        L.LOG_ESTADO,
        A.PASOS_A_SEGUIR
      FROM TKR_LOG_ALERTAS L,
           TKR_ALERTAS A
      WHERE L.ID_ALERTA = A.ID
        AND (p_id_alerta IS NULL OR L.ID_ALERTA = p_id_alerta)
        AND (p_estado IS NULL OR L.ESTADO = p_estado)
        AND (p_fecha_ini IS NULL OR L.FECHA >= p_fecha_ini)
        AND (p_fecha_fin IS NULL OR L.FECHA <= p_fecha_fin + 1)
      ORDER BY L.FECHA DESC;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE_APPLICATION_ERROR(-20006, 'Error en p_get_all_logs: ' || SQLERRM);
  END p_get_all_logs;

  -- ==========================================
  -- GET USUARIOS ASIGNABLES (rol 13)
  -- ==========================================
  PROCEDURE p_get_usuarios_asignables (
    p_resultado OUT cur_type
  ) IS
  BEGIN
    OPEN p_resultado FOR
      SELECT U.ID, U.NOMBRES || ' ' || U.APELLIDOS NOMBRE_COMPLETO
        FROM TKR_USUARIOS U
       WHERE EXISTS (
               SELECT 1
                 FROM TKR_ROLES_USUARIO RU
                WHERE U.ID = RU.ID_USUARIO
                  AND RU.ID_ROL = 13
             )
       ORDER BY 2;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE_APPLICATION_ERROR(-20007, 'Error en p_get_usuarios_asignables: ' || SQLERRM);
  END p_get_usuarios_asignables;

  -- ==========================================
  -- SAVE PROGRAMACION (SCHEDULER ENGINE)
  -- ==========================================
  PROCEDURE p_save_programacion (
      p_id_alerta       IN NUMBER,
      p_tipo_frecuencia IN VARCHAR2,
      p_hora_ejecucion  IN VARCHAR2,
      p_repetir_cada    IN NUMBER,
      p_dias_operacion  IN VARCHAR2,
      p_fecha_inicio    IN DATE,
      p_fecha_fin       IN DATE
  ) IS
      v_job_name     VARCHAR2(100);
      v_job_count    NUMBER;
      v_new_id       NUMBER;
      v_repeat_eval  VARCHAR2(1000);
      v_tipo_proceso VARCHAR2(100);
      v_proceso      VARCHAR2(4000);
      v_block_action VARCHAR2(4000);
      v_codigo_scheduler CLOB;
      v_hour            VARCHAR2(10);
      v_min             VARCHAR2(10);
      v_time_suffix     VARCHAR2(100) := '';
      v_days_eng        VARCHAR2(1000);
      v_start_ts        TIMESTAMP;
      v_start_tz        TIMESTAMP WITH TIME ZONE;
      v_end_tz          TIMESTAMP WITH TIME ZONE := NULL;
      v_exec_time       VARCHAR2(20);
  BEGIN
      SELECT TIPO_PROCESO, DBMS_LOB.SUBSTR(PROCESO, 4000, 1) INTO v_tipo_proceso, v_proceso 
      FROM TKR_ALERTAS 
      WHERE ID = p_id_alerta;
      
      SELECT COUNT(*) INTO v_job_count 
      FROM TKR_PROGRAMACION_ALERTAS 
      WHERE ID_ALERTA = p_id_alerta;
      
      v_job_name := 'scheduler_' || p_id_alerta || '_' || TO_CHAR(f_fecha_actual, 'YYMMDDHH24MISS');

      v_exec_time := NVL(p_hora_ejecucion, '00:00');
      IF INSTR(v_exec_time, ':') > 0 THEN
          v_hour := LPAD(TRIM(SUBSTR(v_exec_time, 1, INSTR(v_exec_time, ':') - 1)), 2, '0');
          v_min  := LPAD(TRIM(SUBSTR(v_exec_time, INSTR(v_exec_time, ':') + 1)), 2, '0');
      ELSE
          v_hour := '00';
          v_min  := '00';
      END IF;
      IF NOT (REGEXP_LIKE(v_hour, '^[0-9]+$') AND REGEXP_LIKE(v_min, '^[0-9]+$')) THEN
          v_hour := '00';
          v_min  := '00';
      END IF;
      v_time_suffix := ';BYHOUR=' || TO_NUMBER(v_hour) || ';BYMINUTE=' || TO_NUMBER(v_min) || ';BYSECOND=0';

      IF UPPER(p_tipo_frecuencia) = 'DIARIO' THEN
          v_repeat_eval := 'FREQ=DAILY; INTERVAL=' || p_repetir_cada || v_time_suffix;
      ELSIF UPPER(p_tipo_frecuencia) = 'MINUTOS' THEN
          v_repeat_eval := 'FREQ=MINUTELY; INTERVAL=' || p_repetir_cada;
      ELSIF UPPER(p_tipo_frecuencia) = 'SEMANAL' THEN
          v_days_eng := REPLACE(UPPER(p_dias_operacion), 'LUN', 'MON');
          v_days_eng := REPLACE(v_days_eng, 'MAR', 'TUE');
          v_days_eng := REPLACE(v_days_eng, 'MIE', 'WED');
          v_days_eng := REPLACE(v_days_eng, 'JUE', 'THU');
          v_days_eng := REPLACE(v_days_eng, 'VIE', 'FRI');
          v_days_eng := REPLACE(v_days_eng, 'SAB', 'SAT');
          v_days_eng := REPLACE(v_days_eng, 'DOM', 'SUN');
          v_repeat_eval := 'FREQ=WEEKLY; BYDAY=' || v_days_eng || '; INTERVAL=' || p_repetir_cada || v_time_suffix;
      ELSIF UPPER(p_tipo_frecuencia) = 'MENSUAL' THEN
          v_repeat_eval := 'FREQ=MONTHLY; INTERVAL=' || p_repetir_cada || v_time_suffix;
      ELSE
          v_repeat_eval := 'FREQ=DAILY' || v_time_suffix; 
      END IF;

      v_start_ts := TO_TIMESTAMP(TO_CHAR(p_fecha_inicio, 'YYYY-MM-DD') || ' ' || v_hour || ':' || v_min || ':00', 'YYYY-MM-DD HH24:MI:SS');
      v_start_tz := FROM_TZ(v_start_ts, 'America/Bogota');
      IF p_fecha_fin IS NOT NULL THEN
          v_end_tz := FROM_TZ(TO_TIMESTAMP(TO_CHAR(p_fecha_fin, 'YYYY-MM-DD') || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS'), 'America/Bogota');
      END IF;

      DBMS_SCHEDULER.CREATE_JOB (
          job_name        => v_job_name,
          job_type        => 'STORED_PROCEDURE',
          job_action      => 'pkgln_alertas.p_ejecutar_job',
          number_of_arguments => 1,
          start_date      => v_start_tz,
          repeat_interval => v_repeat_eval,
          end_date        => v_end_tz,
          enabled         => FALSE,
          comments        => 'Job programado para alerta ID ' || p_id_alerta
      );
      
      DBMS_SCHEDULER.SET_JOB_ARGUMENT_VALUE (
          job_name          => v_job_name,
          argument_position => 1,
          argument_value    => TO_CHAR(p_id_alerta)
      );
      
      v_codigo_scheduler := 'BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    job_name => ''' || v_job_name || ''',
    job_type => ''STORED_PROCEDURE'',
    job_action => ''pkgln_alertas.p_ejecutar_job'',
    number_of_arguments => 1,
    start_date => FROM_TZ(TIMESTAMP ''' || TO_CHAR(p_fecha_inicio, 'YYYY-MM-DD') || ' ' || v_hour || ':' || v_min || ':00'', ''America/Bogota''),
    repeat_interval => ''' || v_repeat_eval || ''','
    || CASE WHEN v_end_tz IS NOT NULL THEN '
    end_date => FROM_TZ(TIMESTAMP ''' || TO_CHAR(p_fecha_fin, 'YYYY-MM-DD') || ' 23:59:59'', ''America/Bogota''),' ELSE '' END
    || '
    enabled => TRUE
  );
  DBMS_SCHEDULER.SET_JOB_ARGUMENT_VALUE(''' || v_job_name || ''', 1, ''' || TO_CHAR(p_id_alerta) || ''');
END;';
      
      DBMS_SCHEDULER.ENABLE(v_job_name);

      SELECT NVL(MAX(ID), 0) + 1 INTO v_new_id FROM TKR_PROGRAMACION_ALERTAS;
      
      INSERT INTO TKR_PROGRAMACION_ALERTAS (
          ID, ID_ALERTA, NOMBRE_JOB, TIPO_FRECUENCIA, HORA_EJECUCION, 
          REPETIR_CADA, DIAS_OPERACION, FECHA_INICIO, FECHA_FIN, ESTADO, CODIGO_SCHEDULER
      ) VALUES (
          v_new_id, p_id_alerta, v_job_name, p_tipo_frecuencia, p_hora_ejecucion, 
          p_repetir_cada, p_dias_operacion, p_fecha_inicio, p_fecha_fin, 'ACTIVO', v_codigo_scheduler
      );
      
      COMMIT;
  EXCEPTION
      WHEN OTHERS THEN
         ROLLBACK;
         RAISE_APPLICATION_ERROR(-20005, 'Error creando Schedule Job: ' || SQLERRM);
  END p_save_programacion;

  -- ==========================================
  -- EJECUCION REAL DEL JOB
  -- ==========================================
  PROCEDURE p_ejecutar_job (
    p_id_alerta IN VARCHAR2
  ) IS
  BEGIN
    p_procesar_proceso(TO_NUMBER(p_id_alerta));
  END p_ejecutar_job;

  -- ==========================================
  -- DEL PROGRAMACION (Borrado Físico y Job)
  -- ==========================================
  PROCEDURE p_del_programacion (
    p_id_job IN NUMBER
  ) IS
    v_job_name VARCHAR2(100);
  BEGIN
    SELECT NOMBRE_JOB INTO v_job_name FROM TKR_PROGRAMACION_ALERTAS WHERE ID = p_id_job;
    
    BEGIN
      DBMS_SCHEDULER.DROP_JOB(job_name => v_job_name, force => TRUE);
    EXCEPTION
      WHEN OTHERS THEN
         NULL;
    END;

    DELETE FROM TKR_PROGRAMACION_ALERTAS WHERE ID = p_id_job;
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
       ROLLBACK;
       RAISE_APPLICATION_ERROR(-20006, 'Error eliminando Job ' || SQLERRM);
  END p_del_programacion;

  -- ==========================================
  -- TOGGLE JOBS ALERTA
  -- ==========================================
  PROCEDURE p_toggle_jobs_alerta (
    p_id_alerta IN NUMBER,
    p_estado    IN VARCHAR2
  ) IS
    CURSOR c_jobs IS 
      SELECT NOMBRE_JOB FROM TKR_PROGRAMACION_ALERTAS WHERE ID_ALERTA = p_id_alerta;
  BEGIN
    FOR r IN c_jobs LOOP
      BEGIN
        IF p_estado = 'A' THEN
          DBMS_SCHEDULER.ENABLE(name => r.NOMBRE_JOB);
          UPDATE TKR_PROGRAMACION_ALERTAS SET ESTADO = 'ACTIVO' WHERE NOMBRE_JOB = r.NOMBRE_JOB;
        ELSE
          DBMS_SCHEDULER.DISABLE(name => r.NOMBRE_JOB, force => TRUE);
          UPDATE TKR_PROGRAMACION_ALERTAS SET ESTADO = 'INACTIVO' WHERE NOMBRE_JOB = r.NOMBRE_JOB;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END;
    END LOOP;
    COMMIT;
  END p_toggle_jobs_alerta;

  -- Helper function to generate an HTML table from a JSON_ARRAY_T of objects
  FUNCTION f_json_arr_to_html_table(p_arr IN JSON_ARRAY_T) RETURN CLOB IS
    v_html CLOB := '';
    v_keys JSON_KEY_LIST;
    v_obj  JSON_OBJECT_T;
    v_elem JSON_ELEMENT_T;
    v_val  VARCHAR2(4000);
  BEGIN
    IF p_arr IS NULL OR p_arr.get_size = 0 THEN
      RETURN '<p style="font-family: sans-serif;">No hay datos disponibles.</p>';
    END IF;

    v_elem := p_arr.get(0);
    IF NOT v_elem.is_object THEN
      v_html := '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px; font-family: sans-serif; font-size: 14px;">';
      v_html := v_html || '<tr style="background-color: #f2f2f2;"><th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Valor</th></tr>';
      FOR i IN 0..p_arr.get_size - 1 LOOP
        v_html := v_html || '<tr><td style="padding: 8px; border: 1px solid #ddd;">' || p_arr.get(i).to_string || '</td></tr>';
      END LOOP;
      v_html := v_html || '</table>';
      RETURN v_html;
    END IF;

    v_obj := TREAT(v_elem AS JSON_OBJECT_T);
    v_keys := v_obj.get_keys;

    v_html := '<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px; font-family: sans-serif; font-size: 14px;">';
    v_html := v_html || '<tr style="background-color: #f2f2f2;">';
    FOR i IN 1..v_keys.COUNT LOOP
      v_html := v_html || '<th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">' || v_keys(i) || '</th>';
    END LOOP;
    v_html := v_html || '</tr>';

    FOR i IN 0..p_arr.get_size - 1 LOOP
      v_elem := p_arr.get(i);
      IF v_elem.is_object THEN
        v_obj := TREAT(v_elem AS JSON_OBJECT_T);
        v_html := v_html || '<tr>';
        FOR j IN 1..v_keys.COUNT LOOP
          v_elem := v_obj.get(v_keys(j));
          IF v_elem IS NULL OR v_elem.is_null THEN
            v_val := '&nbsp;';
          ELSIF v_elem.is_scalar THEN
            v_val := v_obj.get_string(v_keys(j));
            IF v_val IS NULL THEN
               v_val := v_obj.get_number(v_keys(j));
            END IF;
            IF v_val IS NULL THEN
               v_val := CASE WHEN v_obj.get_boolean(v_keys(j)) THEN 'True' WHEN NOT v_obj.get_boolean(v_keys(j)) THEN 'False' ELSE '' END;
            END IF;
            v_val := NVL(v_val, '&nbsp;');
          ELSE
            v_val := v_elem.to_string;
          END IF;
          v_html := v_html || '<td style="padding: 8px; border: 1px solid #ddd;">' || v_val || '</td>';
        END LOOP;
        v_html := v_html || '</tr>';
      END IF;
    END LOOP;
    v_html := v_html || '</table>';
    RETURN v_html;
  END f_json_arr_to_html_table;

  -- Helper function to parse JSON CLOB and convert to HTML supporting up to 3 levels
  FUNCTION f_json_to_html(p_json_clob IN CLOB) RETURN CLOB IS
    v_root_elem JSON_ELEMENT_T;
    v_root_obj  JSON_OBJECT_T;
    v_root_arr  JSON_ARRAY_T;
    v_keys_l1   JSON_KEY_LIST;
    v_keys_l2   JSON_KEY_LIST;
    v_elem_l1   JSON_ELEMENT_T;
    v_elem_l2   JSON_ELEMENT_T;
    v_obj_l1    JSON_OBJECT_T;
    v_html      CLOB := '';
  BEGIN
    IF p_json_clob IS NULL OR DBMS_LOB.GETLENGTH(p_json_clob) = 0 THEN
      RETURN '<p style="font-family: sans-serif;">Sin datos (JSON vacío).</p>';
    END IF;

    v_root_elem := JSON_ELEMENT_T.parse(p_json_clob);
    
    IF v_root_elem.is_array THEN
      v_root_arr := TREAT(v_root_elem AS JSON_ARRAY_T);
      RETURN f_json_arr_to_html_table(v_root_arr);
    END IF;

    IF v_root_elem.is_object THEN
      v_root_obj := TREAT(v_root_elem AS JSON_OBJECT_T);
      v_keys_l1 := v_root_obj.get_keys;
      
      FOR i IN 1..v_keys_l1.COUNT LOOP
        v_elem_l1 := v_root_obj.get(v_keys_l1(i));
        
        v_html := v_html || '<h2 style="color: #333; border-bottom: 2px solid #06b6d4; padding-bottom: 5px; margin-top: 25px; font-family: sans-serif;">' || v_keys_l1(i) || '</h2>';
        
        IF v_elem_l1.is_array THEN
          v_html := v_html || f_json_arr_to_html_table(TREAT(v_elem_l1 AS JSON_ARRAY_T));
        ELSIF v_elem_l1.is_object THEN
          v_obj_l1 := TREAT(v_elem_l1 AS JSON_OBJECT_T);
          v_keys_l2 := v_obj_l1.get_keys;
          
          FOR j IN 1..v_keys_l2.COUNT LOOP
            v_elem_l2 := v_obj_l1.get(v_keys_l2(j));
            
            v_html := v_html || '<h3 style="color: #666; margin-top: 15px; margin-bottom: 5px; font-family: sans-serif;">' || v_keys_l2(j) || '</h3>';
            
            IF v_elem_l2.is_array THEN
              v_html := v_html || f_json_arr_to_html_table(TREAT(v_elem_l2 AS JSON_ARRAY_T));
            ELSIF v_elem_l2.is_object THEN
              v_html := v_html || '<p style="font-family: sans-serif;">' || v_elem_l2.to_string || '</p>';
            ELSE
              v_html := v_html || '<p style="font-family: sans-serif;">' || v_obj_l1.get_string(v_keys_l2(j)) || '</p>';
            END IF;
          END LOOP;
        ELSE
          v_html := v_html || '<p style="font-family: sans-serif;">' || v_root_obj.get_string(v_keys_l1(i)) || '</p>';
        END IF;
      END LOOP;
    END IF;

    RETURN v_html;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN '<p style="color: red; font-family: sans-serif;">Error al procesar JSON: ' || SQLERRM || '</p><pre>' || DBMS_LOB.SUBSTR(p_json_clob, 4000, 1) || '</pre>';
  END f_json_to_html;

  -- ==========================================
  -- PROCESAR PROCESO (SQL Dinámico + Log + Email)
  -- ==========================================
  PROCEDURE p_procesar_proceso (
    p_id_alerta IN NUMBER
  ) IS
    v_tipo_proceso       VARCHAR2(100);
    v_descripcion_alerta VARCHAR2(4000);
    v_proceso            VARCHAR2(4000);
    v_correo             VARCHAR2(1000);
    v_cursor             INTEGER;
    v_row_count          INTEGER := 0;
    v_col_count          INTEGER;
    v_desc_tab           DBMS_SQL.DESC_TAB;
    v_val                VARCHAR2(4000);
    v_log_html           CLOB := '';
    v_has_rows           BOOLEAN := FALSE;
    v_p_body             CLOB;
    v_p_body_html        CLOB;
  BEGIN
    SELECT tipo_proceso, proceso, correo, descripcion_alerta 
      INTO v_tipo_proceso, v_proceso, v_correo, v_descripcion_alerta
    FROM tkr_alertas 
    WHERE id = p_id_alerta;

    IF v_tipo_proceso = 'S' THEN
      v_log_html := '<table border="1" style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 14px;">';
      v_cursor := DBMS_SQL.OPEN_CURSOR;
      
      BEGIN
        DBMS_SQL.PARSE(v_cursor, v_proceso, DBMS_SQL.NATIVE);
        DBMS_SQL.DESCRIBE_COLUMNS(v_cursor, v_col_count, v_desc_tab);

        FOR i IN 1..v_col_count LOOP
           DBMS_SQL.DEFINE_COLUMN(v_cursor, i, v_val, 4000);
        END LOOP;

        v_log_html := v_log_html || '<tr style="background-color: #f2f2f2;">';
        FOR i IN 1..v_col_count LOOP
          v_log_html := v_log_html || '<th style="padding: 8px; border: 1px solid #ddd; text-align: left; font-weight: bold;">' || v_desc_tab(i).col_name || '</th>';
        END LOOP;
        v_log_html := v_log_html || '</tr>';

        IF DBMS_SQL.EXECUTE(v_cursor) > -1 THEN
          WHILE DBMS_SQL.FETCH_ROWS(v_cursor) > 0 LOOP
            v_has_rows := TRUE;
            v_log_html := v_log_html || '<tr>';
            FOR i IN 1..v_col_count LOOP
              DBMS_SQL.COLUMN_VALUE(v_cursor, i, v_val);
              v_log_html := v_log_html || '<td style="padding: 8px; border: 1px solid #ddd;">' || NVL(v_val, '&nbsp;') || '</td>';
            END LOOP;
            v_log_html := v_log_html || '</tr>';
          END LOOP;
        END IF;
        
        v_log_html := v_log_html || '</table>';
        DBMS_SQL.CLOSE_CURSOR(v_cursor);

      EXCEPTION
        WHEN OTHERS THEN
          IF DBMS_SQL.IS_OPEN(v_cursor) THEN
            DBMS_SQL.CLOSE_CURSOR(v_cursor);
          END IF;
          RAISE;
      END;

      IF v_has_rows THEN
        INSERT INTO tkr_log_alertas (
          id, id_alerta, log, fecha, estado
        ) VALUES (
          tkr_log_alertas_seq.nextval, 
          p_id_alerta, 
          v_log_html, 
          f_fecha_actual, 
          'P'
        );

        IF v_correo IS NOT NULL THEN
          v_p_body := 'Se ha detectado una alerta (ID: ' || p_id_alerta || ' - ' || v_descripcion_alerta || '). Por favor revise el log adjunto en el sistema.';
          v_p_body_html := '<h2>Alerta Detectada</h2>' || 
                           '<p>Se ha ejecutado el proceso de la alerta <b>' || p_id_alerta || ' - ' || v_descripcion_alerta || '</b> y se han encontrado los siguientes resultados:</p>' || 
                           v_log_html;

          apex_mail.send(
            p_to       => v_correo,
            p_from     => 'soporte@teker.co', 
            p_body     => v_p_body,
            p_body_html => v_p_body_html,
            p_subj     => 'ALERTA: ' || p_id_alerta || ' - ' || SUBSTR(v_descripcion_alerta, 1, 50)
          );
          apex_mail.push_queue;
        END IF;
      END IF;

    ELSIF v_tipo_proceso = 'P' OR v_tipo_proceso = 'PROCEDIMIENTO' THEN
      DECLARE
        v_json_salida CLOB;
        v_sql         VARCHAR2(32767) := v_proceso;
      BEGIN
        IF INSTR(v_sql, ':') = 0 THEN
          v_sql := RTRIM(v_sql, ';');
          v_sql := 'BEGIN ' || v_sql || '(p_json_salida => :p_json_salida); END;';
        END IF;

        EXECUTE IMMEDIATE v_sql USING OUT v_json_salida;

        v_log_html := f_json_to_html(v_json_salida);

        IF v_json_salida IS NOT NULL AND DBMS_LOB.GETLENGTH(v_json_salida) > 0 THEN
          INSERT INTO tkr_log_alertas (
            id, id_alerta, log, fecha, estado
          ) VALUES (
            tkr_log_alertas_seq.nextval, 
            p_id_alerta, 
            v_log_html, 
            f_fecha_actual, 
            'P'
          );

          IF v_correo IS NOT NULL THEN
            v_p_body := 'Se ha detectado una alerta de procedimiento (ID: ' || p_id_alerta || ' - ' || v_descripcion_alerta || '). Por favor revise el log adjunto en el sistema.';
            v_p_body_html := '<h2>Alerta de Procedimiento Detectada</h2>' || 
                             '<p>Se ha ejecutado el procedimiento de la alerta <b>' || p_id_alerta || ' - ' || v_descripcion_alerta || '</b> y se han obtenido los siguientes resultados:</p>' || 
                             v_log_html;

            apex_mail.send(
              p_to       => v_correo,
              p_from     => 'soporte@teker.co', 
              p_body     => v_p_body,
              p_body_html => v_p_body_html,
              p_subj     => 'ALERTA: ' || p_id_alerta || ' - ' || SUBSTR(v_descripcion_alerta, 1, 50)
            );
            apex_mail.push_queue;
          END IF;
        END IF;
      END;

    ELSIF v_tipo_proceso = 'F' OR v_tipo_proceso = 'FUNCION' OR v_tipo_proceso = 'FUNCIÓN' THEN
      DECLARE
        v_json_salida CLOB;
        v_sql         VARCHAR2(32767) := v_proceso;
      BEGIN
        IF INSTR(v_sql, ':') = 0 AND INSTR(UPPER(v_sql), 'SELECT') = 0 AND INSTR(UPPER(v_sql), 'BEGIN') = 0 THEN
          v_sql := RTRIM(v_sql, ';');
          v_sql := 'BEGIN :v_json_salida := ' || v_sql || '; END;';
        END IF;

        IF INSTR(UPPER(v_sql), 'SELECT') > 0 AND INSTR(v_sql, ':') = 0 THEN
          v_sql := 'BEGIN EXECUTE IMMEDIATE ''' || REPLACE(v_sql, '''', '''''') || ''' INTO :v_json_salida; END;';
        END IF;

        EXECUTE IMMEDIATE v_sql USING OUT v_json_salida;

        v_log_html := f_json_to_html(v_json_salida);

        IF v_json_salida IS NOT NULL AND DBMS_LOB.GETLENGTH(v_json_salida) > 0 THEN
          INSERT INTO tkr_log_alertas (
            id, id_alerta, log, fecha, estado
          ) VALUES (
            tkr_log_alertas_seq.nextval, 
            p_id_alerta, 
            v_log_html, 
            f_fecha_actual, 
            'P'
          );

          IF v_correo IS NOT NULL THEN
            v_p_body := 'Se ha detectado una alerta de función (ID: ' || p_id_alerta || ' - ' || v_descripcion_alerta || '). Por favor revise el log adjunto en el sistema.';
            v_p_body_html := '<h2>Alerta de Función Detectada</h2>' || 
                             '<p>Se ha ejecutado la función de la alerta <b>' || p_id_alerta || ' - ' || v_descripcion_alerta || '</b> y se han obtenido los siguientes resultados:</p>' || 
                             v_log_html;

            apex_mail.send(
              p_to       => v_correo,
              p_from     => 'soporte@teker.co', 
              p_body     => v_p_body,
              p_body_html => v_p_body_html,
              p_subj     => 'ALERTA: ' || p_id_alerta || ' - ' || SUBSTR(v_descripcion_alerta, 1, 50)
            );
            apex_mail.push_queue;
          END IF;
        END IF;
      END;
    END IF;

    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE_APPLICATION_ERROR(-20010, 'Error en p_procesar_proceso: ' || SQLERRM);
  END p_procesar_proceso;

END pkgln_alertas;
/

CREATE OR REPLACE PACKAGE pkgln_alertas AS

  -- TYPE REF CURSOR para devolver result sets
  TYPE cur_type IS REF CURSOR;

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
  PROCEDURE p_save_log_solucion (
    p_id_log               IN NUMBER,
    p_estado               IN VARCHAR2,
    p_asignado             IN VARCHAR2,
    p_solucionado          IN VARCHAR2,
    p_comentarios_solucion IN CLOB
  );

  -- Obtiene todos los logs con filtros (ID de alerta, estado, fechas)
  PROCEDURE p_get_all_logs (
    p_id_alerta IN NUMBER DEFAULT NULL,
    p_estado    IN VARCHAR2 DEFAULT NULL,
    p_fecha_ini IN DATE DEFAULT NULL,
    p_fecha_fin IN DATE DEFAULT NULL,
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
      -- Considera regitrar el error en un log del sistema si aplica
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
      -- Simulamos un sequence o se podria usar NEXTVAL si existe uno: ej. tkr_alertas_seq.NEXTVAL
      SELECT NVL(MAX(ID), 0) + 1 INTO v_id FROM TKR_ALERTAS;
      
      INSERT INTO TKR_ALERTAS (
        ID, DESCRIPCION_ALERTA, TIPO_PROCESO, PROCESO, FRECUENCIA, 
        ESTADO, PASOS_A_SEGUIR, CORREO, TELEFONO, PRIORIDAD,
        FECHA_CREACION, CREADO_POR
      ) VALUES (
        v_id, p_descripcion_alerta, p_tipo_proceso, p_proceso, p_frecuencia, 
        p_estado, p_pasos_a_seguir, p_correo, p_telefono, p_prioridad,
        SYSDATE, p_usuario
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
        FECHA_MODIFICACION = SYSDATE,
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
    -- Preferimos baja logica
    UPDATE TKR_ALERTAS
    SET ESTADO = 'I',
        FECHA_MODIFICACION = SYSDATE,
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
  -- ==========================================
  PROCEDURE p_save_log_solucion (
    p_id_log               IN NUMBER,
    p_estado               IN VARCHAR2,
    p_asignado             IN VARCHAR2,
    p_solucionado          IN VARCHAR2,
    p_comentarios_solucion IN CLOB
  ) IS
  BEGIN
    UPDATE TKR_LOG_ALERTAS
    SET 
      ESTADO = p_estado,
      ASIGNADO = p_asignado,
      SOLUCIONADO = p_solucionado,
      FECHA_SOLUCION = SYSDATE,
      COMENTARIOS_SOLUCION = p_comentarios_solucion
    WHERE ID = p_id_log;
    
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE_APPLICATION_ERROR(-20005, 'Error en p_save_log_solucion: ' || SQLERRM);
  END p_save_log_solucion;

  -- ==========================================
  -- GET ALL LOGS
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
        L.ID, L.ID_ALERTA, A.DESCRIPCION_ALERTA, L.LOG, L.FECHA, 
        L.ESTADO, L.ASIGNADO, L.SOLUCIONADO, L.FECHA_SOLUCION, 
        L.COMENTARIOS_SOLUCION, A.PASOS_A_SEGUIR
      FROM TKR_LOG_ALERTAS L
      JOIN TKR_ALERTAS A ON L.ID_ALERTA = A.ID
      WHERE (p_id_alerta IS NULL OR L.ID_ALERTA = p_id_alerta)
        AND (p_estado IS NULL OR L.ESTADO = p_estado)
        AND (p_fecha_ini IS NULL OR L.FECHA >= p_fecha_ini)
        AND (p_fecha_fin IS NULL OR L.FECHA <= p_fecha_fin + 1)
      ORDER BY L.FECHA DESC;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE_APPLICATION_ERROR(-20006, 'Error en p_get_all_logs: ' || SQLERRM);
  END p_get_all_logs;

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
  BEGIN
      SELECT TIPO_PROCESO, DBMS_LOB.SUBSTR(PROCESO, 4000, 1) INTO v_tipo_proceso, v_proceso 
      FROM TKR_ALERTAS 
      WHERE ID = p_id_alerta;
      
      SELECT COUNT(*) INTO v_job_count 
      FROM TKR_PROGRAMACION_ALERTAS 
      WHERE ID_ALERTA = p_id_alerta;
      
      v_job_name := 'scheduler_' || p_id_alerta || '_' || TO_CHAR(SYSDATE, 'YYMMDDHH24MISS');

      IF UPPER(p_tipo_frecuencia) = 'DIARIO' THEN
          v_repeat_eval := 'FREQ=DAILY; INTERVAL=' || p_repetir_cada;
      ELSIF UPPER(p_tipo_frecuencia) = 'MINUTOS' THEN
          v_repeat_eval := 'FREQ=MINUTELY; INTERVAL=' || p_repetir_cada;
      ELSIF UPPER(p_tipo_frecuencia) = 'SEMANAL' THEN
          v_repeat_eval := 'FREQ=WEEKLY; BYDAY=' || p_dias_operacion || '; INTERVAL=' || p_repetir_cada;
      ELSIF UPPER(p_tipo_frecuencia) = 'MENSUAL' THEN
          v_repeat_eval := 'FREQ=MONTHLY; INTERVAL=' || p_repetir_cada;
      ELSE
          v_repeat_eval := 'FREQ=DAILY'; 
      END IF;

      IF UPPER(v_tipo_proceso) = 'P' OR UPPER(v_tipo_proceso) = 'PROCEDIMIENTO' THEN
          v_block_action := v_proceso;
          DBMS_SCHEDULER.CREATE_JOB (
              job_name        => v_job_name,
              job_type        => 'PLSQL_BLOCK',
              job_action      => v_block_action,
              start_date      => CAST(p_fecha_inicio AS TIMESTAMP),
              repeat_interval => v_repeat_eval,
              end_date        => p_fecha_fin,
              enabled         => FALSE,
              comments        => 'Job programado para alerta PLSQL ID ' || p_id_alerta
          );
          v_codigo_scheduler := 'BEGIN
  DBMS_SCHEDULER.CREATE_JOB(
    job_name => ''' || v_job_name || ''',
    job_type => ''PLSQL_BLOCK'',
    job_action => ''' || REPLACE(v_block_action, '''', '''''') || ''',
    start_date => TIMESTAMP ''' || TO_CHAR(p_fecha_inicio, 'YYYY-MM-DD HH24:MI:SS') || ''',
    repeat_interval => ''' || v_repeat_eval || ''',
    enabled => TRUE
  );
END;';
      ELSE
          DBMS_SCHEDULER.CREATE_JOB (
              job_name        => v_job_name,
              job_type        => 'STORED_PROCEDURE',
              job_action      => 'pkgln_alertas.p_ejecutar_job',
              number_of_arguments => 1,
              start_date      => CAST(p_fecha_inicio AS TIMESTAMP),
              repeat_interval => v_repeat_eval,
              end_date        => p_fecha_fin,
              enabled         => FALSE,
              comments        => 'Job programado para alerta generica ID ' || p_id_alerta
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
    start_date => TIMESTAMP ''' || TO_CHAR(p_fecha_inicio, 'YYYY-MM-DD HH24:MI:SS') || ''',
    repeat_interval => ''' || v_repeat_eval || ''',
    enabled => TRUE
  );
  DBMS_SCHEDULER.SET_JOB_ARGUMENT_VALUE(''' || v_job_name || ''', 1, ''' || TO_CHAR(p_id_alerta) || ''');
END;';
      END IF;
      
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
    -- Aquí corre la lógica del motor cuando salta el cron.
    -- Por defecto crearemos un log que diga que se ejecutó automáticamente
    INSERT INTO TKR_LOG_ALERTAS (
      ID, ID_ALERTA, LOG, FECHA, ESTADO, ASIGNADO
    ) VALUES (
      NVL((SELECT MAX(ID) FROM TKR_LOG_ALERTAS), 0) + 1,
      TO_NUMBER(p_id_alerta),
      'Ejecución automática de Job iniciada vía Oracle Scheduler.',
      SYSDATE,
      'P',
      'SYSTEM'
    );
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
       ROLLBACK;
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
         -- Si el job no existe en Oracle, continuamos con el borrado de la tabla
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

  -- ==========================================
  -- PROCESAR PROCESO (SQL Dinámico + Log + Email)
  -- ==========================================
  PROCEDURE p_procesar_proceso (
    p_id_alerta IN NUMBER
  ) IS
    v_tipo_proceso VARCHAR2(100);
    v_proceso      VARCHAR2(4000);
    v_correo       VARCHAR2(1000);
    v_cursor       INTEGER;
    v_row_count    INTEGER := 0;
    v_col_count    INTEGER;
    v_desc_tab     DBMS_SQL.DESC_TAB;
    v_val          VARCHAR2(4000);
    v_log_html     CLOB := '<table border="1" style="border-collapse: collapse; width: 100%;">';
    v_has_rows     BOOLEAN := FALSE;
    v_p_body      CLOB; -- Agregado para evitar ambigüedad en apex_mail.send
    v_p_body_html CLOB; -- Agregado para evitar ambigüedad en apex_mail.send
  BEGIN
    -- Obtenemos configuración de la alerta
    SELECT tipo_proceso, proceso, correo 
      INTO v_tipo_proceso, v_proceso, v_correo
    FROM tkr_alertas 
    WHERE id = p_id_alerta;

    -- Si el tipo de proceso es 'S' (Select o SQL)
    IF v_tipo_proceso = 'S' THEN
      v_cursor := DBMS_SQL.OPEN_CURSOR;
      
      BEGIN
        DBMS_SQL.PARSE(v_cursor, v_proceso, DBMS_SQL.NATIVE);
        DBMS_SQL.DESCRIBE_COLUMNS(v_cursor, v_col_count, v_desc_tab);

        -- Definimos columnas como VARCHAR2 para simplificar lectura genérica
        FOR i IN 1..v_col_count LOOP
           DBMS_SQL.DEFINE_COLUMN(v_cursor, i, v_val, 4000);
        END LOOP;

        -- Encabezados de la tabla (primera fila)
        v_log_html := v_log_html || '<tr style="background-color: #f2f2f2;">';
        FOR i IN 1..v_col_count LOOP
          v_log_html := v_log_html || '<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">' || v_desc_tab(i).col_name || '</th>';
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

      -- Si arrojó datos, guardamos en log y enviamos correo
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

        -- Enviar correo con APEX_MAIL
        IF v_correo IS NOT NULL THEN
          v_p_body := 'Se ha detectado una alerta (ID: ' || p_id_alerta || '). Por favor revise el log adjunto en el sistema.';
          v_p_body_html := '<h2>Alerta Detectada</h2>' || 
                           '<p>Se ha ejecutado el proceso de la alerta <b>' || p_id_alerta || '</b> y se han encontrado resultados:</p>' || 
                           v_log_html;

          apex_mail.send(
            p_to       => v_correo,
            p_from     => 'soporte@teker.co', 
            p_body     => v_p_body,
            p_body_html => v_p_body_html,
            p_subj     => 'ALERTA: ' || p_id_alerta
          );
          apex_mail.push_queue;
        END IF;
      END IF;
    END IF;

    
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RAISE_APPLICATION_ERROR(-20010, 'Error en p_procesar_proceso: ' || SQLERRM);
  END p_procesar_proceso;

END pkgln_alertas;
/

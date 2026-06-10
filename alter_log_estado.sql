-- =============================================================
-- Script: Agregar campo LOG_ESTADO a TKR_LOG_ALERTAS
-- Propósito: Almacenar auditoría de cambios de estado y
--            persona asignada, separado de COMENTARIOS_SOLUCION
-- =============================================================

ALTER TABLE TKR_LOG_ALERTAS
  ADD LOG_ESTADO CLOB;

COMMENT ON COLUMN TKR_LOG_ALERTAS.LOG_ESTADO IS
  'Auditoría de cambios de estado y asignación del log de incidente. Formato: [DD/MM/YYYY HH:MI] ACCION por: USUARIO';

COMMIT;

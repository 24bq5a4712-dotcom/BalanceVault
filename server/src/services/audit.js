export function auditEvent(db, request, event) {
  return db.auditLog.create({
    data: {
      actorId: event.actorId ?? null,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId ?? null,
      metadata: event.metadata,
      ipAddress: request?.ip ?? null,
    },
  });
}

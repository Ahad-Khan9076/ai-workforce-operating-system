export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SmsNotificationPayload {
  phone: string;
  body: string;
}

/** Reserved for future providers — not implemented in Phase 9. */
export interface PushNotificationProvider {
  send(payload: PushNotificationPayload): Promise<void>;
}

/** Reserved for future providers — not implemented in Phase 9. */
export interface SmsNotificationProvider {
  send(payload: SmsNotificationPayload): Promise<void>;
}

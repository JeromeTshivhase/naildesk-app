/**
 * Push notification testing utilities
 * Use these in development/testing to simulate push notifications
 */

import { LocalNotifications } from "@capacitor/local-notifications";

export interface PushNotificationPayload {
  type: "APPOINTMENT_CONFIRMED" | "APPOINTMENT_BOOKED" | "DEPOSIT_RECEIVED";
  message: string;
  appointmentId?: string;
  clientName?: string;
}

/**
 * Test local notification
 * Call this from browser console to test notification display
 */
export async function testLocalNotification(payload: Partial<PushNotificationPayload> = {}) {
  try {
    const notification: PushNotificationPayload = {
      type: payload.type || "APPOINTMENT_BOOKED",
      message: payload.message || "Test notification from NailDesk",
      appointmentId: payload.appointmentId,
      clientName: payload.clientName || "Jane Doe",
    };

    await LocalNotifications.schedule({
      notifications: [{
        title: notification.type === "DEPOSIT_RECEIVED"
            ? "Deposit Received 💰"
            : notification.type === "APPOINTMENT_CONFIRMED"
                ? "Booking Confirmed ✅"
                : "New Booking 📅",
        body: notification.message,
        id: Math.floor(Math.random() * 10000),
        smallIcon: "ic_stat_naildesk",
        channelId: "naildesk_bookings",
        extra: notification,
      }],
    });

    console.log("[Test] Local notification sent:", notification);
    return true;
  } catch (e) {
    console.error("[Test] Failed to send local notification:", e);
    return false;
  }
}

/**
 * Test appointment booking notification
 */
export async function testAppointmentBookedNotification() {
  return testLocalNotification({
    type: "APPOINTMENT_BOOKED",
    message: "New appointment booking from Sarah Johnson for 2025-06-15 at 14:00 (Gel Manicure - R200)",
    appointmentId: "apt-123456",
    clientName: "Sarah Johnson",
  });
}

/**
 * Test appointment confirmed notification
 */
export async function testAppointmentConfirmedNotification() {
  return testLocalNotification({
    type: "APPOINTMENT_CONFIRMED",
    message: "Your appointment with Sarah Johnson on 2025-06-15 at 14:00 has been confirmed",
    appointmentId: "apt-123456",
    clientName: "Sarah Johnson",
  });
}

/**
 * Test deposit received notification
 */
export async function testDepositReceivedNotification() {
  return testLocalNotification({
    type: "DEPOSIT_RECEIVED",
    message: "Deposit of R500 received from Sarah Johnson for appointment on 2025-06-15",
    clientName: "Sarah Johnson",
  });
}

/**
 * Get the token for the current device
 * (only works after push notifications are initialized)
 */
export async function getDeviceToken() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Create a listener to capture the token
    let token: string | null = null;
    const listener = await PushNotifications.addListener("registration", (reg) => {
      token = reg.value;
    });

    // Register to trigger token
    try {
      await PushNotifications.register();
    } catch (e) {
      console.warn("[Test] Push registration failed:", e);
      // Could be FireBase not configured
    }

    // Wait a moment for the token
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clean up
    listener.remove();

    if (token) {
      console.log("[Test] Device token:", token);
      return token;
    } else {
      console.log("[Test] No token received (Firebase may not be configured)");
      return null;
    }
  } catch (e) {
    console.error("[Test] Failed to get device token:", e);
    return null;
  }
}

/**
 * Export window utilities for console access
 * window.pushTests.testAppointmentBooked()
 */
if (typeof window !== "undefined") {
  (window as any).pushTests = {
    testLocalNotification,
    testAppointmentBookedNotification,
    testAppointmentConfirmedNotification,
    testDepositReceivedNotification,
    getDeviceToken,
  };
}
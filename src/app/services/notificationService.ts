// ============================================================
// Fit Tracker PRO — Notification Service
// Handles browser Web Notifications API for activity tracking
// alerts and daily reminders (meal logging + workout).
//
// Reminder SETTINGS (enabled/time) sync to Supabase so they
// follow the user across devices. The "already fired today"
// flags are ephemeral and device-local (no value in syncing
// them — they just prevent double-notifying on this device),
// so those stay in localStorage.
//
// Since this is a web app without a push server, reminders
// are checked locally: on load, every minute while the tab is
// open, and on visibility change.
// ============================================================
import { supabase } from './supabaseClient';

const PERMISSION_ASKED_KEY = 'fit_notification_permission_asked';

// ─── Reminder settings ─────────────────────────────────────────────────────
export interface ReminderSettings {
  mealRemindersEnabled: boolean;
  workoutRemindersEnabled: boolean;
  mealReminderTime: string;    // "HH:MM", 24-hour
  workoutReminderTime: string; // "HH:MM", 24-hour
}

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  mealRemindersEnabled: true,
  workoutRemindersEnabled: true,
  mealReminderTime: '19:00',
  workoutReminderTime: '18:00',
};

function firedKey(userId: string, type: 'meal' | 'workout', dateKey: string): string {
  return `fit_reminder_fired_${type}_${userId}_${dateKey}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export const notificationService = {
  /**
   * Request notification permission on first app launch.
   * Returns true if granted, false otherwise.
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const alreadyAsked = localStorage.getItem(PERMISSION_ASKED_KEY);
    if (alreadyAsked) return false;

    localStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  isPermitted(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  showTrackingNotification(activityType: string = 'Activity'): void {
    if (!notificationService.isPermitted()) return;
    try {
      new Notification(`${activityType} Tracking Active`, {
        body: 'Fit Tracker PRO is monitoring your activity in the background.',
        icon: '/favicon.ico',
        tag: 'fit-tracking-active',
        requireInteraction: true,
        silent: true,
      });
    } catch (e) {
      console.warn('Notification error:', e);
    }
  },

  dismissTrackingNotification(): void {
    if (!notificationService.isPermitted()) return;
    try {
      const n = new Notification('Tracking Stopped', {
        body: 'Your activity session has been saved.',
        icon: '/favicon.ico',
        tag: 'fit-tracking-active',
        silent: true,
      });
      setTimeout(() => n.close(), 3000);
    } catch (e) {
      console.warn('Notification error:', e);
    }
  },

  show(title: string, body: string, tag?: string): void {
    if (!notificationService.isPermitted()) return;
    try {
      new Notification(title, { body, icon: '/favicon.ico', tag });
    } catch (e) {
      console.warn('Notification error:', e);
    }
  },

  // ── Reminder settings (Supabase — synced across devices) ───────────────────
  async getReminderSettings(userId: string): Promise<ReminderSettings> {
    const { data, error } = await supabase
      .from('reminder_settings').select('*').eq('user_id', userId).maybeSingle();
    if (error || !data) return { ...DEFAULT_REMINDER_SETTINGS };
    return {
      mealRemindersEnabled: data.meal_reminders_enabled,
      workoutRemindersEnabled: data.workout_reminders_enabled,
      mealReminderTime: data.meal_reminder_time,
      workoutReminderTime: data.workout_reminder_time,
    };
  },

  async saveReminderSettings(userId: string, settings: ReminderSettings): Promise<void> {
    const { error } = await supabase.from('reminder_settings').upsert({
      user_id: userId,
      meal_reminders_enabled: settings.mealRemindersEnabled,
      workout_reminders_enabled: settings.workoutRemindersEnabled,
      meal_reminder_time: settings.mealReminderTime,
      workout_reminder_time: settings.workoutReminderTime,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (error) console.error('saveReminderSettings:', error.message);
  },

  /**
   * Checks whether either reminder is due and fires it if so.
   * Safe to call frequently — each reminder fires at most once
   * per calendar day per device (tracked in localStorage).
   */
  async checkAndFireReminders(
    userId: string,
    status: { loggedMealsToday: boolean; workedOutToday: boolean }
  ): Promise<void> {
    const settings = await notificationService.getReminderSettings(userId);
    const dateKey = new Date().toDateString();
    const nowMin = currentMinutes();

    if (settings.mealRemindersEnabled) {
      const key = firedKey(userId, 'meal', dateKey);
      const alreadyFired = localStorage.getItem(key);
      if (!alreadyFired && status.loggedMealsToday) {
        localStorage.setItem(key, 'satisfied');
      } else if (!alreadyFired && !status.loggedMealsToday && nowMin >= timeToMinutes(settings.mealReminderTime)) {
        notificationService.show(
          'Log your meals',
          "You haven't tracked any food today — open Fit Tracker PRO to log it.",
          'fit-meal-reminder'
        );
        localStorage.setItem(key, 'fired');
      }
    }

    if (settings.workoutRemindersEnabled) {
      const key = firedKey(userId, 'workout', dateKey);
      const alreadyFired = localStorage.getItem(key);
      if (!alreadyFired && status.workedOutToday) {
        localStorage.setItem(key, 'satisfied');
      } else if (!alreadyFired && !status.workedOutToday && nowMin >= timeToMinutes(settings.workoutReminderTime)) {
        notificationService.show(
          'Keep your streak going',
          "You haven't logged a workout today — even a quick session counts.",
          'fit-workout-reminder'
        );
        localStorage.setItem(key, 'fired');
      }
    }
  },
};

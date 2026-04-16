import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PushNotifications } from '@capacitor/push-notifications';

export default function PushNotificationHandler() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initPushNotifications = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return;

        // Check if running in Capacitor (mobile app)
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.getPlatform() === 'web') {
          return; // Not a mobile app
        }

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        
        if (permResult.receive === 'granted') {
          // Register with APNs/FCM
          await PushNotifications.register();

          // Listen for registration success
          await PushNotifications.addListener('registration', async (token) => {
            console.log('Push registration success, token:', token.value);

            // Save token to database
            const platform = Capacitor.getPlatform();
            const deviceType = platform === 'ios' ? 'ios' : 'android';

            // Check if token already exists
            const existing = await base44.entities.DeviceToken.filter({
              user_email: user.email,
              token: token.value
            });

            if (existing.length === 0) {
              await base44.entities.DeviceToken.create({
                user_email: user.email,
                token: token.value,
                device_type: deviceType
              });
            }

            setIsInitialized(true);
          });

          // Listen for registration errors
          await PushNotifications.addListener('registrationError', (error) => {
            console.error('Push registration error:', error);
          });

          // Listen for incoming notifications
          await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push notification received:', notification);
          });

          // Listen for notification taps
          await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push notification action performed:', notification);
          });
        }
      } catch (error) {
        console.error('Push notification setup error:', error);
      }
    };

    initPushNotifications();
  }, []);

  return null;
}
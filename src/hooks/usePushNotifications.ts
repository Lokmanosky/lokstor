import { useEffect, useState } from 'react';
import { getFirebaseMessaging, getToken, onMessage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function usePushNotifications() {
  const { user } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('Notifications not supported.');
        return null;
      }

      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        const messaging = getFirebaseMessaging();
        if (messaging) {
          const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
          });

          if (currentToken) {
            console.log('FCM Token received:', currentToken);
            setFcmToken(currentToken);
            localStorage.setItem('fcm_token', currentToken);

            // If user is logged in, save it to their profile
            if (user) {
              await updateDoc(doc(db, 'users', user.uid), {
                fcmToken: currentToken
              }).catch(async (e) => {
                // if document doesn't exist, set it
                if (e.code === 'not-found') {
                    await setDoc(doc(db, 'users', user.uid), { fcmToken: currentToken }, { merge: true });
                }
              });
            }
            return currentToken;
          } else {
            console.warn('No registration token available. Request permission to generate one.');
          }
        }
      }
      return null;
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
      return null;
    }
  };

  useEffect(() => {
    const messaging = getFirebaseMessaging();
    if (messaging && permissionStatus === 'granted') {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // You can use a toast notification library here to show foreground notifications
        if (payload.notification) {
          alert(`🔔 ${payload.notification.title}\n${payload.notification.body}`);
        }
      });
      return () => unsubscribe();
    }
  }, [permissionStatus]);

  return { requestPermission, fcmToken, permissionStatus };
}

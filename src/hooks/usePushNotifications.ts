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
        alert('متصفحك لا يدعم الإشعارات.');
        return null;
      }

      if (Notification.permission === 'denied') {
        alert('لقد قمت بحظر الإشعارات مسبقاً. يرجى تفعيلها من إعدادات المتصفح (علامة القفل بجانب الرابط).');
        setPermissionStatus('denied');
        return null;
      }

      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        const messaging = getFirebaseMessaging();
        if (messaging) {
          const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
          if (!vapidKey) {
            console.warn('VAPID key is missing in environment variables.');
            alert('تم تفعيل الإشعارات في المتصفح، لكن ينقص مفتاح VAPID في إعدادات النظام لاستلامها.');
            return null;
          }

          const currentToken = await getToken(messaging, { vapidKey });

          if (currentToken) {
            console.log('FCM Token received:', currentToken);
            setFcmToken(currentToken);
            localStorage.setItem('fcm_token', currentToken);

            if (user) {
              await updateDoc(doc(db, 'users', user.uid), { fcmToken: currentToken }).catch(async (e) => {
                if (e.code === 'not-found') {
                    await setDoc(doc(db, 'users', user.uid), { fcmToken: currentToken }, { merge: true });
                }
              });
            }
            alert('تم تفعيل الإشعارات بنجاح!');
            return currentToken;
          } else {
            alert('لم نتمكن من توليد رمز الإشعارات. حاول مرة أخرى.');
          }
        }
      } else {
        alert('تم رفض صلاحية الإشعارات.');
      }
      return null;
    } catch (err: any) {
      console.error('An error occurred while retrieving token. ', err);
      alert('حدث خطأ أثناء تفعيل الإشعارات: ' + err.message);
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

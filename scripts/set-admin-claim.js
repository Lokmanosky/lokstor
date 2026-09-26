/**
 * Script to assign "admin: true" custom claim to a user in Firebase Auth.
 * Usage: node scripts/set-admin-claim.js <user-email-or-uid>
 */

const admin = require('firebase-admin');
const path = require('path');

// Try loading service account key
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (e) {
  console.log('يرجى وضع ملف serviceAccountKey.json في مجلد المشروع الرئيسي أولاً.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const targetIdentifier = process.argv[2];

if (!targetIdentifier) {
  console.log('يرجى كتابة البريد الإلكتروني أو UID للمستخدم. مثال:');
  console.log('node scripts/set-admin-claim.js admin@lokstor.dz');
  process.exit(1);
}

async function setAdmin() {
  try {
    let user;
    if (targetIdentifier.includes('@')) {
      user = await admin.auth().getUserByEmail(targetIdentifier);
    } else {
      user = await admin.auth().getUser(targetIdentifier);
    }

    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ تم إعطاء صلاحيات المشرف (admin: true) بنجاح للمستخدم: ${user.email} (${user.uid})`);
  } catch (err) {
    console.error('❌ خطأ أثناء تعيين الصلاحيات:', err.message);
  }
}

setAdmin();

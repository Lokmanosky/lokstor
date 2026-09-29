import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const colRef = collection(db, 'storeBanners');
  const snap = await getDocs(colRef);
  
  // Clear old banners if any
  for (const d of snap.docs) {
    await deleteDoc(doc(db, 'storeBanners', d.id));
  }

  // Add the first banner
  await addDoc(colRef, {
    imageUrl: '/images/banners/banner1.png',
    link: '/',
    sortOrder: 0,
    createdAt: Date.now()
  });

  console.log('Inserted default banner');
}

run().catch(console.error);

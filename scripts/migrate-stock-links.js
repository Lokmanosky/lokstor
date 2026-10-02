const admin = require('firebase-admin');
const fs = require('fs');

// INSTRUCTIONS:
// 1. You must have your Firebase Service Account JSON file saved locally.
// 2. Set the environment variable GOOGLE_APPLICATION_CREDENTIALS to the path of your JSON file.
//    Windows (Command Prompt): set GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccountKey.json"
//    Windows (PowerShell): $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccountKey.json"
//    Mac/Linux: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
// 3. Run this script: node scripts/migrate-stock-links.js

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable not set.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

const deleteSource = process.argv.includes('--delete-source');

async function migrate() {
  console.log(`Starting migration... (Delete source: ${deleteSource})`);
  const productsSnap = await db.collection('products').get();
  let migratedCount = 0;

  for (const doc of productsSnap.docs) {
    const data = doc.data();
    const productId = doc.id;

    if (data.stockLinks !== undefined || data.fileUrl !== undefined) {
      const stockLinks = data.stockLinks || [];
      const fileUrl = data.fileUrl || null;
      
      const computedStock = Array.isArray(stockLinks) && stockLinks.length > 0 ? stockLinks.length : (data.stock || 0);

      // Create/Update productUnits document
      await db.collection('productUnits').doc(productId).set({
        stockLinks,
        fileUrl,
        updatedAt: Date.now()
      }, { merge: true });

      if (deleteSource) {
        // Verify copy exists before deleting
        const unitSnap = await db.collection('productUnits').doc(productId).get();
        if (unitSnap.exists) {
          // Update product document (remove sensitive fields and update stock count)
          await db.collection('products').doc(productId).update({
            stockLinks: admin.firestore.FieldValue.delete(),
            fileUrl: admin.firestore.FieldValue.delete(),
            stock: computedStock,
          });
          console.log(`Migrated and cleaned product: ${productId} (Links: ${stockLinks.length})`);
        } else {
          console.error(`Verification failed for product ${productId}. Skipping delete.`);
        }
      } else {
        console.log(`Copied product to units: ${productId} (Links: ${stockLinks.length})`);
      }
      migratedCount++;
    }
  }

  console.log(`Migration complete! Successfully processed ${migratedCount} products.`);
}

migrate().catch(console.error);

import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

export async function processOrderDelivery(orderId: string, paidAmount: number, paymentMethodDetail: string) {
  if (!adminDb) {
    throw new Error('Admin DB not configured');
  }

  const result = await adminDb.runTransaction(async (transaction: any) => {
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await transaction.get(orderRef);

    if (!orderDoc.exists) {
      return { success: false, status: 404, message: 'Order not found' };
    }

    const orderData = orderDoc.data()!;

    if (orderData.status === 'paid' || orderData.status === 'needs_manual_delivery') {
      return { success: true, status: 200, message: 'Already processed', orderStatus: orderData.status };
    }

    const productId = orderData.productId;
    if (!productId) {
      const updateData = {
        status: 'paid',
        paidAt: Date.now(),
        amountPaid: paidAmount,
        paymentMethodDetails: paymentMethodDetail,
        deliveredAt: Date.now(),
      };
      transaction.update(orderRef, updateData);
      return { success: true, status: 200, message: 'Paid without product', orderData: { ...orderData, ...updateData } };
    }

    const productRef = adminDb.collection('products').doc(productId);
    const productDoc = await transaction.get(productRef);
    const productUnitsRef = adminDb.collection('productUnits').doc(productId);
    const productUnitsDoc = await transaction.get(productUnitsRef);

    let deliveredLink = null;
    let newStatus = 'paid';
    
    // We assume quantity is 1 for now, as the cart code doesn't seem to pass quantity for single products, but we'll try to read it.
    const quantity = orderData.quantity || 1;

    let prodData = productDoc.exists ? productDoc.data()! : null;
    let unitsData = productUnitsDoc.exists ? productUnitsDoc.data()! : null;

    if (prodData) {
      // DISTINCTION:
      // - stockType === 'units': product uses stockLinks array in productUnits.
      //   Delivery REQUIRES a link; if not enough links → needs_manual_delivery.
      // - stockType === 'numeric' + unlimitedStock: no link expected; mark paid directly.
      // - stockType === 'numeric' + !unlimitedStock: count-based stock; decrement on pay.

      if (prodData.stockType === 'units') {
        // Link-based delivery: requires stockLinks from productUnits
        const links = (unitsData?.stockLinks && Array.isArray(unitsData.stockLinks)) ? unitsData.stockLinks : [];
        if (links.length >= quantity) {
          const linksToDeliver = links.slice(0, quantity);
          deliveredLink = linksToDeliver.join('\n');
          const remainingLinks = links.slice(quantity);
          transaction.update(productUnitsRef, { stockLinks: remainingLinks });
          transaction.update(productRef, { stock: remainingLinks.length, updatedAt: Date.now() });
        } else {
          // Insufficient links — flag for manual delivery and create admin notification
          newStatus = 'needs_manual_delivery';
          const notifRef = adminDb.collection('notifications').doc();
          transaction.set(notifRef, {
            title: 'تنبيه: روابط غير كافية في المخزون',
            message: `طلب ${orderId} للمنتج "${prodData.name || productId}" يحتاج ${quantity} رابط لكن المتوفر ${links.length}. يرجى التسليم يدوياً.`,
            type: 'warning',
            read: false,
            createdAt: Date.now(),
            orderId,
          });
        }
      } else if (unitsData?.fileUrl) {
        // Single shared file URL (e.g. Google Drive link stored in productUnits)
        deliveredLink = unitsData.fileUrl;
        if (!prodData.unlimitedStock) {
          const currentStock = Number(prodData.stock || 1);
          transaction.update(productRef, { stock: Math.max(0, currentStock - quantity), updatedAt: Date.now() });
        }
      } else {
        // Numeric / unlimited count-based — no link needed; just decrement or mark paid
        if (prodData.unlimitedStock) {
          // Unlimited: mark paid, no link required
        } else {
          const currentStock = Number(prodData.stock || 1);
          if (currentStock >= quantity) {
            transaction.update(productRef, { stock: Math.max(0, currentStock - quantity), updatedAt: Date.now() });
          } else {
            newStatus = 'needs_manual_delivery';
          }
        }
      }
    }

    const orderUpdate: any = {
      status: newStatus,
      paidAt: Date.now(),
      amountPaid: paidAmount,
      paymentMethodDetails: paymentMethodDetail,
    };

    if (deliveredLink) {
      orderUpdate.downloadUrl = deliveredLink;
      orderUpdate.deliveredAt = Date.now();
    }

    transaction.update(orderRef, orderUpdate);

    // Track confirmed usage if a discount was applied
    if (orderData.discount && orderData.discount.id && newStatus === 'paid') {
      const discountRef = adminDb.collection('discountCodes').doc(orderData.discount.id);
      transaction.update(discountRef, { confirmedUsageCount: FieldValue.increment(1) } as any);
    }

    return { 
      success: true, 
      status: 200, 
      message: 'Order fulfilled', 
      deliveredLink,
      newStatus,
      orderData: { ...orderData, ...orderUpdate } 
    };
  });

  // After transaction, send email backup if delivered
  if (result.success && result.deliveredLink && result.orderData.customerEmail) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: result.orderData.customerEmail,
        subject: `Your Lokstor Order Delivery (#${orderId.replace('ord_', '').slice(0, 8)})`,
        text: `Thank you for your purchase!\n\nYour product (${result.orderData.productName}) has been delivered.\n\nActivation Link/File:\n${result.deliveredLink}\n\nThank you for using Lokstor!`,
      };

      await transporter.sendMail(mailOptions);
      
      // Mark as email sent
      await adminDb.collection('orders').doc(orderId).update({ deliveryEmailSent: true });
    } catch (e) {
      console.error('Delivery email backup failed', e);
      // Never block or rollback on email fail
    }
  }

  return result;
}

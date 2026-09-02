import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, currentUid } from '../lib/firebase';
import type { Customer, Vendor, Product, ProductType } from '../lib/types';

export interface DailyLedgerItem {
  id: string;
  type: 'customer_delivery' | 'customer_payment' | 'vendor_purchase' | 'vendor_payment';
  entityId: string;
  entityName: string;
  entityStatus: string;
  // For entries
  product?: Product;
  productType?: ProductType;
  quantity?: number; // in hundredths
  rate?: number; // in paise
  // For payments
  amountPaise?: number;
  createdAt: number; // For sorting
}

export async function getDailyLedger(
  dateIso: string,
  customers: Customer[],
  vendors: Vendor[]
): Promise<DailyLedgerItem[]> {
  const uid = currentUid();
  if (!uid) return [];
  
  const items: DailyLedgerItem[] = [];

  const fetchPromises: Promise<void>[] = [];

  // Customers: Entries & Payments
  for (const c of customers) {
    const entriesRef = collection(db, 'users', uid, 'customers', c.id, 'entries');
    const paymentsRef = collection(db, 'users', uid, 'customers', c.id, 'payments');

    fetchPromises.push(
      getDocs(query(entriesRef, where('date', '==', dateIso))).then((snap) => {
        snap.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            type: 'customer_delivery',
            entityId: c.id,
            entityName: c.name,
            entityStatus: c.paymentStatus,
            product: data.product as Product,
            productType: data.type as ProductType,
            quantity: data.quantity as number,
            rate: data.rate as number,
            createdAt: data.createdAt?.toMillis() ?? 0,
          });
        });
      })
    );

    fetchPromises.push(
      getDocs(query(paymentsRef, where('date', '==', dateIso))).then((snap) => {
        snap.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            type: 'customer_payment',
            entityId: c.id,
            entityName: c.name,
            entityStatus: c.paymentStatus,
            amountPaise: data.amountPaise as number,
            createdAt: data.createdAt?.toMillis() ?? 0,
          });
        });
      })
    );
  }

  // Vendors: Entries & Payments
  for (const v of vendors) {
    const entriesRef = collection(db, 'users', uid, 'vendors', v.id, 'entries');
    const paymentsRef = collection(db, 'users', uid, 'vendors', v.id, 'payments');

    fetchPromises.push(
      getDocs(query(entriesRef, where('date', '==', dateIso))).then((snap) => {
        snap.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            type: 'vendor_purchase',
            entityId: v.id,
            entityName: v.name,
            entityStatus: v.paymentStatus,
            product: data.product as Product,
            productType: data.type as ProductType,
            quantity: data.quantity as number,
            rate: data.rate as number,
            createdAt: data.createdAt?.toMillis() ?? 0,
          });
        });
      })
    );

    fetchPromises.push(
      getDocs(query(paymentsRef, where('date', '==', dateIso))).then((snap) => {
        snap.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            type: 'vendor_payment',
            entityId: v.id,
            entityName: v.name,
            entityStatus: v.paymentStatus,
            amountPaise: data.amountPaise as number,
            createdAt: data.createdAt?.toMillis() ?? 0,
          });
        });
      })
    );
  }

  await Promise.all(fetchPromises);
  
  // Sort by created at, latest first
  items.sort((a, b) => b.createdAt - a.createdAt);
  
  return items;
}

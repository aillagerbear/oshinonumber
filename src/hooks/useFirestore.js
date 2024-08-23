import { useState, useCallback } from 'react';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export const useFirestore = (user) => {
  const [records, setRecords] = useState([]);
  const db = getFirestore();

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    try {
      const recordsRef = collection(db, 'records');
      const q = query(recordsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10));
      const querySnapshot = await getDocs(q);
      const fetchedRecords = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setRecords(fetchedRecords);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  }, [db, user]);

  const addRecord = useCallback(async (numbers) => {
    if (!user) return;
    try {
      const recordsRef = collection(db, 'records');
      await addDoc(recordsRef, {
        userId: user.uid,
        numbers,
        createdAt: new Date()
      });
      await fetchRecords();
    } catch (error) {
      console.error('Error adding record:', error);
    }
  }, [db, user, fetchRecords]);

  return { records, fetchRecords, addRecord };
};
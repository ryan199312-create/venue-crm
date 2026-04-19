import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { INITIAL_FORM_STATE } from '../constants';

export { INITIAL_FORM_STATE };

export function useAdminData(appId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'private', 'data', 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(data);
      setLoading(false);
    }, (err) => {
      console.error(\"Firestore Error:\", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appId]);

  const saveEvent = async (formData, editingEventId) => {
    const privateRef = collection(db, 'artifacts', appId, 'private', 'data', 'events');
    const publicCalendarRef = collection(db, 'artifacts', appId, 'public_calendar');

    const cleanPhone = formData.clientPhone ? formData.clientPhone.replace(/[^0-9]/g, '').slice(-8) : '';
    const dataToSave = { ...formData, clientPhoneClean: cleanPhone };

    let docId = editingEventId;
    if (editingEventId) {
      await updateDoc(doc(privateRef, docId), dataToSave);
    } else {
      const newDoc = await addDoc(privateRef, { ...dataToSave, createdAt: serverTimestamp() });
      docId = newDoc.id;
    }

    await setDoc(doc(publicCalendarRef, docId), {
      date: formData.date,
      venue: formData.venueLocation || \"Main Hall\",
      isAvailable: formData.status === 'cancelled',
      status: formData.status
    });

    return docId;
  };

  const deleteEvent = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'private', 'data', 'events', id));
  };

  return { events, loading, saveEvent, deleteEvent };
}

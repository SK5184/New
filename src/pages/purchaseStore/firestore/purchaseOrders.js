import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getPOs = async () => {
  const snap = await getDocs(query(collection(db, "purchaseOrders"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createPO = async (data) => {
  return await addDoc(collection(db, "purchaseOrders"), data);
};

export const updatePOStatus = async (id, status) => {
  return await updateDoc(doc(db, "purchaseOrders", id), { status });
};
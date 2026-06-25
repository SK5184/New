import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getPRs = async () => {
  const snap = await getDocs(query(collection(db, "purchaseRequests"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createPR = async (data) => {
  return await addDoc(collection(db, "purchaseRequests"), data);
};

export const updatePRStatus = async (id, status) => {
  return await updateDoc(doc(db, "purchaseRequests", id), { status });
};
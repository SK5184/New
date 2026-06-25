import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getSopDocs = async () => {
  const snap = await getDocs(query(collection(db, "sopDocuments"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createSopDoc = async (data) => {
  return await addDoc(collection(db, "sopDocuments"), data);
};
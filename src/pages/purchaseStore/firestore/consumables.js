import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getConsumables = async () => {
  const snap = await getDocs(query(collection(db, "consumables"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createConsumables = async (data) => {
  return await addDoc(collection(db, "consumables"), data);
};
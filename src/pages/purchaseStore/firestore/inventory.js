import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getInventory = async () => {
  const snap = await getDocs(query(collection(db, "inventory"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createInventoryItem = async (data) => {
  return await addDoc(collection(db, "inventory"), data);
};
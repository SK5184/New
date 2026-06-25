import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getOutwards = async () => {
  const snap = await getDocs(query(collection(db, "materialOutward"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createOutward = async (data) => {
  return await addDoc(collection(db, "materialOutward"), data);
};
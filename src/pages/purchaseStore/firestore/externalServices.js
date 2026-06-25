import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getExtServices = async () => {
  const snap = await getDocs(query(collection(db, "externalServices"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createExtService = async (data) => {
  return await addDoc(collection(db, "externalServices"), data);
};
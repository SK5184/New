import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getRejections = async () => {
  const snap = await getDocs(query(collection(db, "materialRejections"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createRejection = async (data) => {
  return await addDoc(collection(db, "materialRejections"), data);
};
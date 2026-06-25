import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getReagents = async () => {
  const snap = await getDocs(query(collection(db, "reagents"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createReagent = async (data) => {
  return await addDoc(collection(db, "reagents"), data);
};
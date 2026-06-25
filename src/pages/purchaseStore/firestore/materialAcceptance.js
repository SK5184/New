import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getAcceptances = async () => {
  const snap = await getDocs(query(collection(db, "materialAcceptance"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createAcceptance = async (data) => {
  return await addDoc(collection(db, "materialAcceptance"), data);
};
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getSpecs = async () => {
  const snap = await getDocs(query(collection(db, "materialSpecifications"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createSpec = async (data) => {
  return await addDoc(collection(db, "materialSpecifications"), data);
};
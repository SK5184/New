import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getDCRegisters = async () => {
  const snap = await getDocs(query(collection(db, "dcRegister"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createDCRegister = async (data) => {
  return await addDoc(collection(db, "dcRegister"), data);
};
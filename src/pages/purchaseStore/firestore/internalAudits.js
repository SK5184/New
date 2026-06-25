import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getAudits = async () => {
  const snap = await getDocs(query(collection(db, "internalAudits"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createAudit = async (data) => {
  return await addDoc(collection(db, "internalAudits"), data);
};
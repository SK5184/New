import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getTempLogs = async () => {
  const snap = await getDocs(query(collection(db, "temperatureLogs"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createTempLog = async (data) => {
  return await addDoc(collection(db, "temperatureLogs"), data);
};
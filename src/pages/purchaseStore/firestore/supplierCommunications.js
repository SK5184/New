import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getCommunications = async () => {
  const snap = await getDocs(query(collection(db, "supplierCommunications"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createCommunication = async (data) => {
  return await addDoc(collection(db, "supplierCommunications"), data);
};
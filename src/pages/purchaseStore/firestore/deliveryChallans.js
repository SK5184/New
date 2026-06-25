import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getDCs = async () => {
  const snap = await getDocs(query(collection(db, "deliveryChallans"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createDC = async (data) => {
  return await addDoc(collection(db, "deliveryChallans"), data);
};
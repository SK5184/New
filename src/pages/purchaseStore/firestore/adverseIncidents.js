import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getAdverseIncidents = async () => {
  const snap = await getDocs(query(collection(db, "adverseIncidents"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createAdverseIncident = async (data) => {
  return await addDoc(collection(db, "adverseIncidents"), data);
};
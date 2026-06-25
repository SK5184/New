import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getCompetencyRecords = async () => {
  const snap = await getDocs(query(collection(db, "competencyRecords"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createCompetencyRecord = async (data) => {
  return await addDoc(collection(db, "competencyRecords"), data);
};
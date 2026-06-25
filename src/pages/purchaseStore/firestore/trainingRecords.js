import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getTrainingRecords = async () => {
  const snap = await getDocs(query(collection(db, "trainingRecords"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createTrainingRecord = async (data) => {
  return await addDoc(collection(db, "trainingRecords"), data);
};
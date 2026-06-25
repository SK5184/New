import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getEvaluations = async () => {
  const snap = await getDocs(query(collection(db, "supplierEvaluations"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createEvaluation = async (data) => {
  return await addDoc(collection(db, "supplierEvaluations"), data);
};
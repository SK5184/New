import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

export const getSuppliers = async () => {
  const snap = await getDocs(query(collection(db, "suppliers"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createSupplier = async (data) => {
  return await addDoc(collection(db, "suppliers"), data);
};

export const updateSupplierStatus = async (id, status) => {
  return await updateDoc(doc(db, "suppliers", id), { status });
};
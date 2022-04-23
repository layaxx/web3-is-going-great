import { collection, orderBy, query, getDocs } from "firebase/firestore/lite";
import { db } from "./db";

export const getBrandEntries = async () => {
  const entries = [];
  const dbCollection = collection(db, "brandEntries");

  let q = query(dbCollection, orderBy("id", "desc"));
  const snapshot = await getDocs(q);

  snapshot.forEach((child) => {
    entries.push({ _key: child.id, ...child.data() });
  });

  return entries;
};

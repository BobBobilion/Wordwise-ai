import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import type { Document } from "./types"

export async function createDocument(userId: string, title: string, content = "") {
  const docRef = await addDoc(collection(db, "documents"), {
    title,
    content,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateDocument(documentId: string, updates: Partial<Document>) {
  const docRef = doc(db, "documents", documentId)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDocument(documentId: string) {
  const docRef = doc(db, "documents", documentId)
  await deleteDoc(docRef)
}

export async function getUserDocuments(userId: string): Promise<Document[]> {
  // First, get all documents for the user
  const q = query(collection(db, "documents"), where("userId", "==", userId))

  const querySnapshot = await getDocs(q)
  const documents = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp).toDate(),
    updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
  })) as Document[]

  // Sort by updatedAt on the client side
  return documents.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

export async function getDocument(documentId: string): Promise<Document | null> {
  const docRef = doc(db, "documents", documentId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as Document
  }

  return null
}

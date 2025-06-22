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
import type { Document, DocumentAnalysis } from "./types"

export async function createDocument(userId: string, title: string, content = "", analysis?: DocumentAnalysis) {
  const docRef = await addDoc(collection(db, "documents"), {
    title,
    content,
    userId,
    analysis: analysis || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateDocument(documentId: string, updates: Partial<Document>) {
  const docRef = doc(db, "documents", documentId)
  
  // Handle the analysis field specially to preserve existing data
  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  }
  
  // If analysis is being updated, merge it with existing analysis
  if (updates.analysis) {
    const existingDoc = await getDoc(docRef)
    if (existingDoc.exists()) {
      const existingData = existingDoc.data()
      const existingAnalysis = existingData.analysis || {}
      updateData.analysis = {
        ...existingAnalysis,
        ...updates.analysis,
        lastAnalyzed: serverTimestamp(),
      }
    } else {
      updateData.analysis = {
        ...updates.analysis,
        lastAnalyzed: serverTimestamp(),
      }
    }
  }
  
  await updateDoc(docRef, updateData)
}

export async function deleteDocument(documentId: string) {
  const docRef = doc(db, "documents", documentId)
  await deleteDoc(docRef)
}

export async function getUserDocuments(userId: string): Promise<Document[]> {
  // First, get all documents for the user
  const q = query(collection(db, "documents"), where("userId", "==", userId))

  const querySnapshot = await getDocs(q)
  const documents = querySnapshot.docs.map((doc) => {
    const data = doc.data()
    // Convert analysis.lastAnalyzed if present
    if (data.analysis && data.analysis.lastAnalyzed) {
      const lastAnalyzed = data.analysis.lastAnalyzed
      if (lastAnalyzed && typeof lastAnalyzed.toDate === "function") {
        data.analysis.lastAnalyzed = lastAnalyzed.toDate()
      } else if (!(lastAnalyzed instanceof Date)) {
        data.analysis.lastAnalyzed = undefined
      }
    }
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    }
  }) as Document[]

  // Sort by updatedAt on the client side
  return documents.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

export async function getDocument(documentId: string): Promise<Document | null> {
  const docRef = doc(db, "documents", documentId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    const data = docSnap.data()
    // Convert analysis.lastAnalyzed if present
    if (data.analysis && data.analysis.lastAnalyzed) {
      const lastAnalyzed = data.analysis.lastAnalyzed
      if (lastAnalyzed && typeof lastAnalyzed.toDate === "function") {
        data.analysis.lastAnalyzed = lastAnalyzed.toDate()
      } else if (!(lastAnalyzed instanceof Date)) {
        data.analysis.lastAnalyzed = undefined
      }
    }
    return {
      id: docSnap.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as Document
  }

  return null
}

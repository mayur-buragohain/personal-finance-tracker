import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PRESET_CATEGORIES } from '../utils/helpers';

export async function seedCategories(uid) {
  const categoriesRef = collection(db, 'users', uid, 'categories');
  const snapshot = await getDocs(categoriesRef);

  if (!snapshot.empty) return;

  await Promise.all(
    PRESET_CATEGORIES.map((category) =>
      setDoc(doc(categoriesRef, category.id), {
        id: category.id,
        label: category.label,
        icon: category.icon,
        color: category.color,
      })
    )
  );
}

export async function addCategory(uid, category) {
  const categoriesRef = collection(db, 'users', uid, 'categories');
  await setDoc(doc(categoriesRef, category.id), {
    id: category.id,
    label: category.label,
    icon: category.icon,
    color: category.color,
    createdAt: serverTimestamp(),
  });
}

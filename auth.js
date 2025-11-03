import { app } from "./firebaseConfig.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

const auth = getAuth(app);

export async function signUp(email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  console.log("User signed up:", userCredential.user.email);
}

export async function logIn(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  console.log("User logged in:", userCredential.user.email);
}

export async function logOut() {
  await signOut(auth);
  console.log("User logged out.");
}

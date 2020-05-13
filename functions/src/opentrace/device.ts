import * as admin from "firebase-admin";

export async function setDeviceToken(uid: string, token: any){
  console.log(`setDeviceToken uid: ${uid.substring(0, 8)}***, token: ${token}`);
  const db = admin.firestore();
  await db.collection('devices').doc(uid).set({ token, uid })
  return { token }
}
import * as admin from "firebase-admin";
import { encryptData, decryptData } from '../../opentrace/utils/dataEncrypter';

const uuidAPIKey = require('uuid-apikey');

export async function generateClient(){
  const db = admin.firestore();
  
  const idAPIKey = uuidAPIKey.create();
  const clientId = idAPIKey.uuid;
  const apiKey = idAPIKey.apiKey.toLowerCase();

  const encryptStr = await encryptData(apiKey);
  await db.collection('clients').doc(clientId).set({ apiKey: encryptStr });
  return {id: clientId, apiKey};

}

export async function findClientById(clientId: string){
  const db = admin.firestore();
  const clientRef = await db.collection('clients').doc(clientId).get();
  const client = clientRef.data();
  if(!client) return null;

  const enApiKey = client.apiKey;
  return {id: clientId, apiKey: await decryptData(enApiKey)}
}

export async function findClientByApiKey(apiKey: string){
  const db = admin.firestore();
  const encryptStr = await encryptData(apiKey);
  const clients = await db.collection('clients').where('apiKey', '==', encryptStr).get();
  if(clients.empty) return null;
  const clientDoc = clients.docs[0];
  return {id: clientDoc.id, apiKey };
}

export async function allClient(){
  const db = admin.firestore();
  const clients = await db.collection('clients').get();

  return await Promise.all(
    clients.docs.map(async doc => {
      const data = doc.data();
      return {id: doc.id, ...data, apiKey: await decryptData(data.apiKey)}
    })
  )
}



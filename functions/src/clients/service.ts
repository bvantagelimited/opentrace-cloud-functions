import * as admin from "firebase-admin";

import getEncryptionKey from "../opentrace/utils/getEncryptionKey";
import CustomEncrypter from '../opentrace/utils/CustomEncrypter';

const uuidAPIKey = require('uuid-apikey');

const decryptApiKey = async (enApiKey: string) => {
  const encryptionKey = await getEncryptionKey();
  const customEncrypter = new CustomEncrypter(encryptionKey);
  const payloadData = Buffer.from(enApiKey, 'base64');
  const decryptedData = customEncrypter.decodeAndDecrypt(payloadData, [payloadData.length - 32, 16, 16]);
  return JSON.parse(Buffer.from(decryptedData, 'base64').toString());
}

const encryptApiKey = async (apiKey: string) => {
  const encryptionKey = await getEncryptionKey();
  const customEncrypter = new CustomEncrypter(encryptionKey);
  const payload = Buffer.from(JSON.stringify(apiKey));
  const payloadData = customEncrypter.encryptAndEncode(payload, 16, 16, false);
  return payloadData.toString('base64');
}

export async function generateClient(){
  const db = admin.firestore();
  
  const idAPIKey = uuidAPIKey.create();
  const clientId = idAPIKey.uuid;
  const apiKey = idAPIKey.apiKey.toLowerCase();

  const encryptData = await encryptApiKey(apiKey);
  await db.collection('clients').doc(clientId).set({ apiKey: encryptData });
  return {id: clientId, apiKey};

}

export async function findClientById(clientId: string){
  const db = admin.firestore();
  const clientRef = await db.collection('clients').doc(clientId).get();
  const client = clientRef.data();
  if(!client) return null;

  const enApiKey = client.apiKey;
  return {id: clientId, apiKey: await decryptApiKey(enApiKey)}
}

export async function findClientByApiKey(apiKey: string){
  const db = admin.firestore();
  const encryptData = await encryptApiKey(apiKey);
  const clients = await db.collection('clients').where('apiKey', '==', encryptData).get();
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
      return {id: doc.id, ...data, apiKey: await decryptApiKey(data.apiKey)}
    })
  )
}



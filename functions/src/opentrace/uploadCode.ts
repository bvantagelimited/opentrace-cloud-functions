import * as admin from "firebase-admin";
import * as moment from "moment";
import * as _ from 'lodash';
import * as cryptoRandomString from 'crypto-random-string';

import config from '../config';
import formatTimestamp from "./utils/formatTimestamp";
import { encryptData, decryptData } from './utils/dataEncrypter';

const UPLOAD_CODE_COLLECTION = 'uploadCodes';

/**
 * generate random upload code unique
 */
export async function generateUploadCode() {
  const db = admin.firestore();
  let encryptCode;
  let code;
  const createdAt = moment().unix();
  // const expiryTime = moment().unix() - config.upload.codeValidityPeriod * 60;

  // random code and check not exist in db
  while (true) {
    code = cryptoRandomString({length: 6, type: 'numeric'});
    encryptCode = await encryptData(code);
    const records = await db.collection(UPLOAD_CODE_COLLECTION).where('encryptCode', '==', encryptCode).get();
    if(records.empty) break;
  }

  // save code to db
  await db.collection(UPLOAD_CODE_COLLECTION).add({
    encryptCode,
    createdAt,
    isUsed: false
  });

  console.log('generate code:', code, 'is stored successfully at', formatTimestamp(moment().unix()));
  return { code, createdAt };
}

/**
 * list all upload code
 */
export async function listUploadCodes() {
  const db = admin.firestore();
  const clients = await db.collection(UPLOAD_CODE_COLLECTION).get();

  return await Promise.all(
    clients.docs.map(async doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ..._.omit(data, 'encryptCode'),
        code: await decryptData(data.encryptCode)
      }
    })
  )
}

/**
 * check upload code is valid or not
 */
export async function validateUploadCode(code: string){
  const db = admin.firestore();
  const encryptStr = await encryptData(code);
  const records = await db.collection(UPLOAD_CODE_COLLECTION).where('encryptCode', '==', encryptStr).get();
  if(records.empty) return false;
  const codeDoc = records.docs[0];
  const codeData = codeDoc.data();
  // check code not expiried
  return codeData.isUsed === false && (codeData.createdAt + config.upload.codeValidityPeriod * 60 > moment().unix());
}

/**
 * update used code from client
 */
export async function usedUploadCode(code: string){
  const db = admin.firestore();
  const encryptStr = await encryptData(code);
  const records = await db.collection(UPLOAD_CODE_COLLECTION).where('encryptCode', '==', encryptStr).get();
  if(records.empty) return;
  const codeDoc = records.docs[0];
  await db.collection(UPLOAD_CODE_COLLECTION).doc(codeDoc.id).set({isUsed: true, usedAt: moment().unix()});
}
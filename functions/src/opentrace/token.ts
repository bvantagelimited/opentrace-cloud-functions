
// import * as admin from "firebase-admin";

import config from '../config';
import getEncryptionKey from "./utils/getEncryptionKey";
import CustomEncrypter from "./utils/CustomEncrypter";
import formatTimestamp from "./utils/formatTimestamp";

// export async function storeUploadCodes(strCode: any) {
//   // Prepare encrypter
//   const encryptionKey = await getEncryptionKey();
//   const customEncrypter = new CustomEncrypter(encryptionKey);

//   const uploadCodes = strCode.split(',');

//   const payload = Buffer.from(JSON.stringify(uploadCodes));
//   // Encode payload
//   const payloadData = customEncrypter.encryptAndEncode(payload);

//   const writeResult = await admin.firestore().collection('codes').doc('uploadCode').set({uploadCode: payloadData.toString('base64')});
//   console.log('storeCodes:', 'upload code is stored successfully at', formatTimestamp(writeResult.writeTime.seconds));
// }

// export async function retrieveUploadCodes() : Promise<string[]> {
//   const document = await admin.firestore().collection('codes').doc('uploadCode').get();

//   // Prepare encrypter
//   const encryptionKey = await getEncryptionKey();
//   const customEncrypter = new CustomEncrypter(encryptionKey);

//   const payloadData = Buffer.from(document.get('uploadCode'), 'base64');

//   const decryptedData = customEncrypter.decodeAndDecrypt(payloadData, [payloadData.length - 32, 16, 16]);

//   return JSON.parse(Buffer.from(decryptedData, 'base64').toString());
// }

/**
 * Validate upload token by decrypting it and checking if it's still withing validity period
 * @param token
 * @param validateTokenTimestamp
 */
export async function validateToken(token: string, validateTokenTimestamp: boolean = true) {
  const payloadData = Buffer.from(token, 'base64');

  // Prepare encrypter
  const encryptionKey = await getEncryptionKey();
  const customEncrypter = new CustomEncrypter(encryptionKey);

  // Decrypt UUID
  const decryptedData = customEncrypter.decodeAndDecrypt(payloadData, [payloadData.length - 32, 16, 16]);
  console.log('checkToken:', 'decryptedData:', decryptedData, Buffer.from(decryptedData, 'base64').toString());

  const {uid, createdAt, upload} = JSON.parse(Buffer.from(decryptedData, 'base64').toString());
  console.log('checkToken:', 'uid:', `${uid.substring(0, 8)}***`, 'createdAt:', formatTimestamp(createdAt), 'upload:', upload);

  if (validateTokenTimestamp && Date.now() / 1000 - createdAt > config.upload.tokenValidityPeriod * 3600) {
    console.error(new Error(`validateToken: Upload token has expired. createdAt: ${formatTimestamp(createdAt)}, validity period (hrs): ${config.upload.tokenValidityPeriod}, now: ${formatTimestamp(Date.now() / 1000)}`));
    throw new Error('Upload token has expired.');
  }

  if (upload.length !== 6) {
    console.error(new Error('validateToken: Upload code is invalid.'));
    throw new Error('Upload code is invalid.');
  }

  return {uid: uid, uploadCode: upload};
}
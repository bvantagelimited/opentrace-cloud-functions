import * as functions from "firebase-functions";

import getEncryptionKey from "./utils/getEncryptionKey";
import CustomEncrypter from "./utils/CustomEncrypter";
import formatTimestamp from "./utils/formatTimestamp";
import {validateUploadCode } from './uploadCode';

/**
 * Get upload token by passing in a secret string as `data`
 */
const getUploadToken = async (uid: string, code: any, context: functions.https.CallableContext) => {
  console.log('getUploadToken:', 'uid:', uid, 'code:', code);

  let valid = false;
  if (code) {
    valid = await validateUploadCode(code);
    console.log('getUploadToken:', `code is ${valid ? 'valid' : 'not valid'} code`);
  }

  if (valid) {
    const payload = Buffer.from(JSON.stringify(
      {
        uid,
        createdAt: Date.now() / 1000,
        upload: code
      }
    ));
    console.log('getUploadToken:', 'uid:', `${uid.substring(0, 8)}***`, 'createdAt:', formatTimestamp(Date.now() / 1000));

    // Prepare encrypter
    const encryptionKey = await getEncryptionKey();
    const customEncrypter = new CustomEncrypter(encryptionKey);

    // Encode payload
    const payloadData = customEncrypter.encryptAndEncode(payload);
    console.log(`getUploadToken: Completed. Payload byte size: ${payloadData.length}`);

    return {
      status: "SUCCESS",
      token: payloadData.toString('base64')
    };
  } else {
    console.log('getUploadToken:', `Invalid data: ${code}`);
    throw new functions.https.HttpsError('invalid-argument', `Invalid data: ${code}`);
  }
};

export default getUploadToken;

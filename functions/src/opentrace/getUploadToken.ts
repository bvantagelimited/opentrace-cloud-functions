import * as functions from "firebase-functions";

import getEncryptionKey from "./utils/getEncryptionKey";
import CustomEncrypter from "./utils/CustomEncrypter";
import formatTimestamp from "./utils/formatTimestamp";
import { retrieveUploadCodes } from "./token";

/**
 * Get upload token by passing in a secret string as `data`
 */
const getUploadToken = async (uid: string, data: any, context: functions.https.CallableContext) => {
  console.log('getUploadToken:', 'uid', uid, 'data', data);

  let valid = false;
  if (data) {
    const uploadCodes = await retrieveUploadCodes();
    console.log('getUploadToken:', `obtained ${uploadCodes.length} upload codes`);
    valid = uploadCodes.find(x => x === data) !== undefined;
    console.log('getUploadToken:', `data is ${valid ? 'valid' : 'not valid'} code`);
  }

  if (valid) {
    const payload = Buffer.from(JSON.stringify(
      {
        uid,
        createdAt: Date.now() / 1000,
        upload: data
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
    console.log('getUploadToken:', `Invalid data: ${data}`);
    throw new functions.https.HttpsError('invalid-argument', `Invalid data: ${data}`);
  }
};

export default getUploadToken;

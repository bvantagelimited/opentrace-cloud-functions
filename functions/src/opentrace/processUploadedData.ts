import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as moment from "moment";
import * as path from "path";
import * as _ from "lodash";

import StreetPassRecord from "./types/StreetPassRecord";
import UserInfectedInfo from "./types/UserInfectedInfo";
import config from "../config";

import { decryptTempID } from "./getTempIDs";
import { validateToken } from "./token";
import { getAllEncryptionKeys } from "./utils/getEncryptionKey";
import formatTimestamp from "./utils/formatTimestamp";
import { storeUploadLog } from "./utils/AuditLogger";
import { usedUploadCode } from "./uploadCode";

/**
 * Process user's uploaded data.
 *
 * Most important tasks:
 *  + Validate upload token to get uid
 *  + Post-process records (e.g., validate exchanged messages, decrypt TempIDs)
 *  + Forward data for further processing
 */
export default async function processUploadedData(object: functions.storage.ObjectMetadata) {
  const filePath = object.name;

  console.log('processUploadedData:', 'Detected new file:', filePath);

  if (filePath !== undefined && filePath.startsWith(config.upload.recordsDir) && filePath.endsWith('.json')) {
    const fileName = path.basename(filePath, '.json');
    let archiveFilePath = filePath;
    console.log('processUploadedData:', 'File is streetPassRecords, content type:', object.contentType);
    await storeUploadLog(fileName, {
      fileName: fileName,
      status: 'STARTED',
      loggedTime: Date.now() / 1000
    });

    const step = "0 - move file";
    try {
      const uploadFile = admin.storage().bucket(object.bucket).file(filePath);
      console.log('processUploadedData:', 'Uploaded file md5Hash', object.md5Hash);

      //
      // Step 0: Move file to archive bucket
      //
      if (!archiveFilePath.startsWith(`${config.upload.recordsDir}/20`)) {
        // Put file into date folder if filepath doesn't contain date
        archiveFilePath = archiveFilePath.replace(config.upload.recordsDir, `${config.upload.recordsDir}/${formatTimestamp(moment().unix(), "YYYYMMDD")}`)
      }
      const archivedFile = admin.storage().bucket(config.upload.bucketForArchive).file(archiveFilePath);
      await uploadFile.copy(archivedFile);
      await uploadFile.delete();
      console.log('processUploadedData:', `"step ${step}"`, 'Uploaded file has been moved to archive folder.');
    } catch (error) {
      console.error(new Error(`processUploadedData: "step ${step}" Error encountered, message: ${error.message}. Stack trace:\n${error.stack}`));
      await storeUploadLog(fileName, {
        fileName: fileName,
        id: '',
        status: 'ERROR',
        step: step,
        errorMessage: error.message,
        errorStackTrace: error.stack,
        loggedTime: Date.now() / 1000
      });

      return {
        status: 'ERROR'
      };
    }

    return _processUploadedData(archiveFilePath);
  } else {
    console.log('processUploadedData:', 'File is not streetPassRecords, ignore.');

    return {
      status: 'NONE'
    };
  }
}



export async function _processUploadedData(filePath: string, validateTokenTimestamp: boolean = true): Promise<any> {
  const fileName = path.basename(filePath, '.json');
  let uid = '', uploadCode = '', step = '';

  try {
    //
    // Step 1: load file content into memory
    //
    step = "1 - load file";
    const { token, records } = JSON.parse(await getStorageData(config.upload.bucketForArchive, filePath));
    console.log('processUploadedData:', `"step ${step}"`, 'File is loaded, record count:', records.length);

    //
    // Step 2: Validate upload token to get uid
    //
    step = "2 - validate upload token";
    ({ uid, uploadCode } = await validateToken(token, validateTokenTimestamp));
    console.log('processUploadedData:', `"step ${step}"`, 'Upload token is valid, id:', uid);

    // set code is used
    await usedUploadCode(uploadCode);

    //
    // Step 3: Post-process records (e.g., validate, decrypt the contact's phone number)
    //
    step = "3 - post-process records";
    const validatedRecords = await validateRecords(records);
    console.log('processUploadedData:', `"step ${step}"`, 'Complete validation of records,', 'original count:', records.length, 'after validation:', validatedRecords.length);

    //
    // Step 4: The list of possible users is infected
    //
    step = "4 - The list of possible users is infected";
    const validRecords = validatedRecords.filter(row => row.isValid);
    const listUsers: UserInfectedInfo[] = config.upload.analyzeInfectedUser.analyze(validRecords);
    console.log('processUploadedData:', `"step ${step}"`, 'Upload token is valid, id:', uid, 'listUsers:', JSON.stringify(listUsers));

    //
    // Step 5: send notices to people who may be infected
    //
    await sendPushNotificationToUsers(listUsers);
    
    //
    // Step 6: Create an audit record and store in a Firebase Database
    //
    await storeUploadLog(fileName, {
      fileName: fileName,
      id: uid,
      status: 'SUCCESS',
      uploadCode: uploadCode,
      receivedRecords: records.length,
      validRecords: _.sumBy(validatedRecords, row => row.isValid ? 1 : 0),
      listUsers: JSON.stringify(listUsers),
      loggedTime: Date.now() / 1000
    });

    return {
      status: 'SUCCESS',
      filePath: filePath,
      receivedRecords: records.length,
      validRecords: _.sumBy(validatedRecords, row => row.isValid ? 1 : 0),
      records: validatedRecords,
      listUsers
    };

  } catch (error) {
    console.error(new Error(`processUploadedData: "step ${step}" Error encountered, message: ${error.message}. Stack trace:\n${error.stack}`));
    await storeUploadLog(fileName, {
      fileName: fileName,
      id: uid,
      status: 'ERROR',
      uploadCode: uploadCode,
      step: step,
      errorMessage: error.message,
      errorStackTrace: error.stack,
      loggedTime: Date.now() / 1000
    });

    return {
      status: 'ERROR',
      message: error.message
    };
  }

}

/**
 * Process show user's uploaded data.
 */
export async function showUploadedData(filePath: string, validateTokenTimestamp: boolean = true): Promise<any> {
  let uid = '', step = '';

  try {
    //
    // Step 1: load file content into memory
    //
    step = "1 - load file";
    const { token, records } = JSON.parse(await getStorageData(config.upload.bucketForArchive, filePath));
    console.log('showUploadedData:', `"step ${step}"`, 'File is loaded, record count:', records.length);

    //
    // Step 2: Validate upload token to get uid
    //
    step = "2 - validate upload token";
    ({ uid } = await validateToken(token, validateTokenTimestamp));
    console.log('showUploadedData:', `"step ${step}"`, 'Upload token is valid, id:', uid);

    //
    // Step 3: Post-process records (e.g., validate, decrypt the contact's phone number)
    //
    step = "3 - post-process records";
    const validatedRecords = await validateRecords(records);
    console.log('showUploadedData:', `"step ${step}"`, 'Complete validation of records,', 'original count:', records.length);

    //
    // Step 4: The list of possible users is infected
    //
    step = "4 - The list of possible users is infected";
    const validRecords = validatedRecords.filter(row => row.isValid);
    const listUsers: UserInfectedInfo[] = config.upload.analyzeInfectedUser.analyze(validRecords);

    return {
      status: 'SUCCESS',
      filePath: filePath,
      totalRecord: records.length,
      totalValidRecord: _.sumBy(validatedRecords, row => row.isValid ? 1 : 0),
      records: validatedRecords,
      listUsers
    };

  } catch (error) {
    return {
      status: 'ERROR',
      filePath: filePath,
      errorMessage: error.message
    };
    
  }
}

/**
 * Get data from storage bucket
 * @param bucket
 * @param filePath
 */
async function getStorageData(bucket: string, filePath: string) {
  const archivedFile = admin.storage().bucket(bucket).file(filePath);
  return archivedFile.download().then(content => content.toString());
}

/**
 * Validate records and convert temp ID to UID
 */
async function validateRecords(records: StreetPassRecord[]): Promise<StreetPassRecord[]> {
  if (!records) {
    return [];
  }
  const encryptionKeys = await getAllEncryptionKeys();
  const measuredPower = 1 // record.txPower

  records.forEach(record => {
    record.timestamp = record.timestamp > 10000000000 ? record.timestamp / 1000 : record.timestamp; // Convert Epoch ms to Epoch s
    record.timestampString = formatTimestamp(record.timestamp);
    record.distance = Math.pow(10, (measuredPower - 62 - record.rssi) / 20);

    validateRecord(record, encryptionKeys);
  });

  return records;
}

/**
 * Validate records by decrypting and checking if broadcast message's timestamp is within validity period.
 * Multiple encryption keys can be provided, they are tried until 1 succeeds.
 * @param record
 * @param encryptionKeys: all possible encryption keys
 */
function validateRecord(record: StreetPassRecord, encryptionKeys: Buffer[]) {
  record.isValid = false;

  if (!record.msg) {
    record.invalidReason = "no_msg";
    return;
  }

  for (const encryptionKey of encryptionKeys) {
    try {
      // Decrypt UUID
      const { uid, startTime, expiryTime } = decryptTempID(record.msg, encryptionKey);
      record.contactId = uid;
      record.contactIdValidFrom = startTime;
      record.contactIdValidTo = expiryTime;

      if (record.timestamp < startTime || record.timestamp > expiryTime) {
        console.warn('validateRecord:', 'ID timestamp is not valid.', 'ID startTime:', formatTimestamp(startTime), 'ID expiryTime:', formatTimestamp(expiryTime), 'timestamp:', formatTimestamp(record.timestamp));
        record.isValid = false;
        record.invalidReason = "expired_id";
      } else {
        record.isValid = true;
      }

      break;
    } catch (error) {
      console.warn('validateRecord:', 'Error while decrypting temp ID.', error.message);
    }
  }

  if (!record.isValid && !record.invalidReason) {
    // Decryption using all encryption keys have failed. Setting the full temp ID as contactId for downstream processing.
    record.contactId = record.msg;
    record.invalidReason = "failed_decryption";
  }
}

/**
 * send push notification to list users
 * @param users
 */
async function sendPushNotificationToUsers(users: UserInfectedInfo[]){
  const db = admin.firestore();
  await Promise.all(
    users.filter(row => row.isInfected).map(async userInfo => {
      const userRef = await db.collection('devices').doc(userInfo.contactId).get();
      const user = userRef.data();
      const token = user?.token;

      const notification = {
        title: 'Covtakt',
        body: `Imali ste bliski kontakt sa COVID-19, ${formatTimestamp(userInfo.timestamp, 'DD.MM.YYYY. HH:mm')}, na razdaljini manjoj od ${userInfo.distance} m u dužini trajanja ${Math.round(userInfo.duration)} min`
      }
    
      const message = {
        notification: notification,
        data: {...notification, act: 'add_notification', key: 'infection', sent_at: `${moment().unix()}`},
        token
      }
      
      console.log('send message:', JSON.stringify(message));
      if(token){
        admin.messaging().send(message)
          .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
          })
          .catch((error) => {
            console.log('Error sending message:', error);
          });
      }
    
    })
  )
}

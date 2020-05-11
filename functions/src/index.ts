import * as admin from "firebase-admin";
admin.initializeApp();

import * as firebaseFunctions from "./firebaseFunctions";
import config from "./config";

import getHandshakePin from "./opentrace/getHandshakePin";
import getTempIDs from "./opentrace/getTempIDs";
import getUploadToken from "./opentrace/getUploadToken";
import processUploadedData from "./opentrace/processUploadedData";
import { setDeviceToken } from './opentrace/device';
import app from './app';

exports.setDeviceToken = firebaseFunctions.callableHttps(setDeviceToken);
exports.getHandshakePin = firebaseFunctions.callableHttps(getHandshakePin);
exports.getTempIDs = firebaseFunctions.callableHttps(getTempIDs);
exports.getUploadToken = firebaseFunctions.callableHttps(getUploadToken);
exports.processUploadedData = firebaseFunctions.storage(config.upload.bucket, processUploadedData);
// add api 
exports.api = firebaseFunctions.requestHttps(app);

import * as _ from 'lodash';
import StreetPassRecord from "../types/StreetPassRecord";
import UserInfectedInfo from "../types/UserInfectedInfo";
import config from "../../config";

interface RangeTimeRecord {
  contactIdValidFrom: number // start time of range
  contactIdValidTo: number // expiry time of range
  duration: number // second
  minDistance: number // met
  records: StreetPassRecord[] // list record data have same or continue range time from file
}

export default class AnalyzeInfectedUser {

  analyze(records: StreetPassRecord[]) : UserInfectedInfo[] {
    const minDistance = config.notification.minDistance;

    const distanceRercords = records.filter(record => record.distance && record.distance <= minDistance);
    const userRercords = _.groupBy(distanceRercords, record => record.contactId);

    const validUsers = _.map(userRercords, (rows, uid) => this.analyzeUserData(uid, rows));
    return validUsers;
  }

  analyzeUserData(uid:string, rows: StreetPassRecord[]){
    console.log('------> analyzeUserData uid:',uid);
    //
    // Step 1: group by timeline
    //
    let timelineRows = this.groupByUserTimeline(rows);
    // console.log('groupByUserTimeline:', JSON.stringify(timelineRows));
    //
    // Step 2: validate timeline
    //
    timelineRows = this.validateUserTimeline(timelineRows);

    //
    // Step 3: select timeline with min distance
    //
    return this.selectTimelineToPush(uid, timelineRows);
  }

  groupByUserTimeline(rows: StreetPassRecord[]) : RangeTimeRecord[] {
    const sortRows = _.sortBy(rows, 'contactIdValidFrom');
    // init array and push range time to array
    // <------->
    //       <--------->
    //                     <-------->
    const rangeTimeRecords: RangeTimeRecord[] = [];
    _.each(sortRows, record => {
      // find range time record will append or push
      const indx = _.findIndex(rangeTimeRecords, row => record.contactIdValidFrom !== undefined && record.contactIdValidFrom <= row.contactIdValidTo);
      if(record.contactIdValidTo && indx >= 0){
        // append record to exist range time
        rangeTimeRecords[indx].contactIdValidTo = record.contactIdValidTo;
        rangeTimeRecords[indx].records.push(record)
      }else if(record.contactIdValidFrom && record.contactIdValidTo){
        // append to new range time
        rangeTimeRecords.push({
          contactIdValidFrom: record.contactIdValidFrom,
          contactIdValidTo: record.contactIdValidTo,
          duration: 0,
          minDistance: 0,
          records: [record]
        })
      }
    })
    return rangeTimeRecords;
  }

  validateUserTimeline(rows: RangeTimeRecord[]) : RangeTimeRecord[]{
    const minDuration = config.notification.minDuration;
    // remove rang time have only one record
    const validRows = rows.filter(row => row.records.length > 1);
    // calculate distance and duration of range time
    validRows.forEach(row => {
      const firstRecord = row.records[0];
      const lastRecord = _.last(_.sortBy(row.records, 'timestamp'));
      if(lastRecord){
        row.duration = (lastRecord.timestamp - firstRecord.timestamp) / 60;
        row.minDistance = _.min(_.map(row.records, r => r.distance)) || 0;
      }
    })

    // console.log('validateUserTimeline:', JSON.stringify(validRows));
    return _.filter(validRows, row => row.duration >= minDuration);
  }

  selectTimelineToPush(uid: string, rows: RangeTimeRecord[]) {
    const minDistance = config.notification.minDistance;
    const minTimeline = _.minBy(rows, record => record.minDistance);
    if(!minTimeline){
      const res = {
        contactId: uid,
        timestamp: 0,
        distance: 0,
        duration: 0,
        isInfected: false
      }
      console.log('check uid:', `${uid.substring(0, 10)}***`, 'result:', JSON.stringify(res), 'timeLine:', JSON.stringify(rows));
      return res;
    };

    const firstRecord = minTimeline.records[0];
    let userMinDistance = _.round(minTimeline.minDistance);
    if(minTimeline.minDistance - minDistance > 0){
      userMinDistance += minTimeline.minDistance - minDistance > 0.5 ? 1 : 0.5
    }

    const result = {
      contactId: uid,
      timestamp: firstRecord.timestamp,
      distance: userMinDistance,
      duration: Math.round(minTimeline.duration),
      isInfected: true

    }
    console.log('check uid:', `${uid.substring(0, 10)}***`, 'result:', JSON.stringify(result));
    return result;
  }
}

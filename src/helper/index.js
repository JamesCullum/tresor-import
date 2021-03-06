import every from 'lodash/every';
import values from 'lodash/values';
import { DateTime } from 'luxon';

//regex to match an ISIN-only string, taken from https://www.iban.com/country-codes
export const isinRegex = /^(AF|AL|DZ|AS|AD|AO|AI|AQ|AG|AR|AM|AW|AU|AT|AZ|BS|BH|BD|BB|BY|BE|BZ|BJ|BM|BT|BO|BQ|BA|BW|BV|BR|IO|BN|BG|BF|BI|CV|KH|CM|CA|KY|CF|TD|CL|CN|CX|CC|CO|KM|CD|CG|CK|CR|HR|CU|CW|CY|CZ|CI|DK|DJ|DM|DO|EC|EG|SV|GQ|ER|EE|SZ|ET|FK|FO|FJ|FI|FR|GF|PF|TF|GA|GM|GE|DE|GH|GI|GR|GL|GD|GP|GU|GT|GG|GN|GW|GY|HT|HM|VA|HN|HK|HU|IS|IN|ID|IR|IQ|IE|IM|IL|IT|JM|JP|JE|JO|KZ|KE|KI|KP|KR|KW|KG|LA|LV|LB|LS|LR|LY|LI|LT|LU|MO|MG|MW|MY|MV|ML|MT|MH|MQ|MR|MU|YT|MX|FM|MD|MC|MN|ME|MS|MA|MZ|MM|NA|NR|NP|NL|NC|NZ|NI|NE|NG|NU|NF|MP|NO|OM|PK|PW|PS|PA|PG|PY|PE|PH|PN|PL|PT|PR|QA|MK|RO|RU|RW|RE|BL|SH|KN|LC|MF|PM|VC|WS|SM|ST|SA|SN|RS|SC|SL|SG|SX|SK|SI|SB|SO|ZA|GS|SS|ES|LK|SD|SR|SJ|SE|CH|SY|TW|TJ|TZ|TH|TL|TG|TK|TO|TT|TN|TR|TM|TC|TV|UG|UA|AE|GB|UM|US|UY|UZ|VU|VE|VN|VG|VI|WF|EH|YE|ZM|ZW|AX)([0-9A-Z]{9})([0-9])$/;

export const timeRegex = withSeconds => {
  return withSeconds ? /[0-2][0-9]:[0-9]{2}:[0-9]{2}/ : /[0-2][0-9]:[0-9]{2}/;
};

export function csvLinesToJSON(content, trimAndSplit = false) {
  let result = [];

  let lines = content;
  if (trimAndSplit) {
    lines = content.trim().split('\n');
  }

  // NOTE: If your columns contain commas in their values, you'll need
  // to deal with those before doing the next step
  // (you might convert them to &&& or something, then covert them back later)
  // jsfiddle showing the issue https://jsfiddle.net/
  let firstLine = lines[0];
  let delim = (countString(firstLine, ";") < countString(firstLine, ",")) ? "," : ";";
  let headers = lines[0].split(delim);

  for (let i = 1; i < lines.length; i++) {
    let obj = {};
    const currentline = lines[i].split(delim);

    for (let j = 0; j < headers.length; j++) {
      // Some .csv files contains leading/trailing " and spaces. We need to replace the double quote at the beginning an
      // the end to get the real value. E.g.: Value for a Starbucks WKN was in a .csv file "884437 ". T1 was unable to
      // found the Holding by WKN because of the double quote. Also we need to trim spaces.

      headers[j] = headers[j].replace(/["]/g, "");
      if (currentline[j] === undefined) {
        obj[headers[j]] = undefined;
        continue;
      }

      obj[headers[j]] = currentline[j].replace(/^"(.+)"$/, '$1').trim();
    }

    result.push(obj);
  }

  return JSON.stringify(result);
}

export function countString(str, substr) {
	return str.split(substr).length - 1;
}

export function parseGermanNum(n) {
  if (!n) {
    return 0;
  }
  return parseFloat(n.replace(/\./g, '').replace(',', '.'));
}

export function findPreviousRegexMatchIdx(arr, idx, regex) {
  let bckwrdIdx = 1;
  while (idx - bckwrdIdx >= 0) {
    if (regex.test(arr[idx - bckwrdIdx])) {
      return idx - bckwrdIdx;
    }
    bckwrdIdx += 1;
  }
  return -1;
}

export function validateActivity(activity, findSecurityAlsoByCompany = false) {
  // All fields must have a value unequal undefined
  if (!every(values(activity), a => !!a || a === 0)) {
    console.error(
      'The activity for ' + activity.broker + ' has empty fields.',
      activity
    );
    return undefined;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const oldestDate = new Date(1990, 1, 1);
  oldestDate.setUTCHours(0, 0, 0, 0);

  // The date property must be present.
  if (activity.date === undefined) {
    console.error(
      'The activity date for ' + activity.broker + ' must be present.',
      activity
    );
    return undefined;
  }

  // The datetime property must be present.
  if (activity.datetime === undefined) {
    console.error(
      'The activity datetime for ' + activity.broker + ' must be present.',
      activity
    );
    return undefined;
  }

  // The date must be in the past.
  if (activity.date > tomorrow) {
    console.error(
      'The activity date for ' + activity.broker + ' has to be in the past.',
      activity
    );
    return undefined;
  }

  // The date must be not older than 1990-01-01
  if (activity.date < oldestDate) {
    console.error(
      'The activity date for ' + activity.broker + ' is older than 1990-01-01.',
      activity
    );
    return undefined;
  }

  // The datetime must be in the past.
  if (activity.datetime > tomorrow) {
    console.error(
      'The activity datetime for ' +
        activity.broker +
        ' has to be in the past.',
      activity
    );
    return undefined;
  }

  // The datetime must be not older than 1990-01-01
  if (activity.datetime < oldestDate) {
    console.error(
      'The activity datetime for ' +
        activity.broker +
        ' is older than 1990-01-01.',
      activity
    );
    return undefined;
  }

  if (Number(activity.shares) !== activity.shares || activity.shares <= 0) {
    console.error(
      'The shares in activity for ' +
        activity.broker +
        ' must be a number greater than 0.',
      activity
    );
    return undefined;
  }

  if (Number(activity.price) !== activity.price || activity.price < 0) {
    console.error(
      'The price in activity for ' +
        activity.broker +
        ' must be a number greater or equal 0.',
      activity
    );
    return undefined;
  }

  if (Number(activity.amount) !== activity.amount || activity.amount < 0) {
    console.error(
      'The amount in activity for ' +
        activity.broker +
        ' must be a number greater or equal than 0.',
      activity
    );
    return undefined;
  }

  if (Number(activity.fee) !== activity.fee) {
    console.error(
      'The fee amount in activity for ' +
        activity.broker +
        ' must be a number that can be positive, negative or 0. ',
      activity
    );
    return undefined;
  }

  if (Number(activity.tax) !== activity.tax) {
    console.error(
      'The tax amount in activity for ' +
        activity.broker +
        ' must be a number that can be positive, negative or zero.',
      activity
    );
    return undefined;
  }

  // Tresor One will search the security for PDF Documents with ISIN or WKN. For Imports of .csv File from Portfolio Performance
  // T1 can search the security also by the Company.
  if (
    ((findSecurityAlsoByCompany && activity.company === undefined) ||
      !findSecurityAlsoByCompany) &&
    activity.isin === undefined &&
    activity.wkn === undefined
  ) {
    console.error(
      'The activity for ' +
        activity.broker +
        ' must have at least a' +
        (findSecurityAlsoByCompany ? ' company,' : 'n') +
        ' ISIN or WKN.',
      activity
    );
    return undefined;
  }

  if (activity.isin !== undefined && !isinRegex.test(activity.isin)) {
    console.error(
      'The activity ISIN for ' +
        activity.broker +
        " can't be valid with an invalid scheme.",
      activity
    );
    return undefined;
  }

  if (activity.wkn !== undefined && !/^([A-Z0-9]{6})$/.test(activity.wkn)) {
    console.error(
      'The activity WKN for ' +
        activity.broker +
        " can't be valid with an invalid scheme.",
      activity
    );
    return undefined;
  }

  if (!['Buy', 'Sell', 'Dividend'].includes(activity.type)) {
    console.error(
      'The activity type for ' +
        activity.broker +
        " can't be valid with an unknown type.",
      activity
    );
    return undefined;
  }

  return activity;
}

export function findFirstIsinIndexInArray(array, offset = 0) {
  const isinIndex = array
    .slice(offset)
    .findIndex(element => isinRegex.test(element));
  return isinIndex === -1 ? undefined : isinIndex + offset;
}

// This function will convert a date (reuqired) and a time (can be undefined) to a formatted date and datetime.
// When no time is present, the current time will be used to ensure the right order of activities after an import
// was processed.
export function createActivityDateTime(
  date,
  time,
  dateFormat = 'dd.MM.yyyy',
  dateTimeFormat = 'dd.MM.yyyy HH:mm',
  zone = 'Europe/Berlin'
) {
  date = date.trim();
  if (time !== undefined) {
    time = time.trim();
  }
  zone = zone.trim();

  let dateTime;
  if (time === undefined || !/[0-2][0-9]:[0-9]{2}(:[0-9]{2}|)/.test(time)) {
    // Append the current local time when to the date that was given from the implementation. The date must match the
    // format in `dateFormat`.
    const currentTime = DateTime.fromObject({ zone: zone });
    time =
      String(currentTime.hour).padStart(2, '0') +
      ':' +
      String(currentTime.minute).padStart(2, '0');
    dateTime = DateTime.fromFormat(date + ' ' + time, dateFormat + ' HH:mm', {
      zone: zone,
    });
  } else {
    // Convert the date and time from the implementation to a datetime value. The values of date and time must match
    // the given format in `dateTimeFormat` concat with an space between.
    dateTime = DateTime.fromFormat(date + ' ' + time, dateTimeFormat, {
      zone: zone,
    });
  }

  return [dateTime.toFormat('yyyy-MM-dd'), dateTime.toUTC().toISO()];
}

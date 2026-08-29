// =============================================================================
//  CHURCH ATTENDANCE PWA - Google Apps Script Backend
//  Deploy as: Web App (Execute as: Me, Who has access: Anyone)
//  Version: 2.0.0
// =============================================================================

// ---------------------------------------------------------------------------
//  CONFIGURATION — update SHEET_ID and ADMIN_EMAIL before deploying
// ---------------------------------------------------------------------------
const SHEET_ID    = "<YOUR_GOOGLE_SHEET_ID>";
const ADMIN_EMAIL = "";                           // <-- Fill in admin email for weekly backup

// Sheet names (must match exactly)
const SHEET_MEMBERS    = "Members";
const SHEET_ATTENDANCE = "Attendance";
const SHEET_VISITORS   = "Visitors";
const SHEET_CONFIG     = "Config";
const SHEET_DEVICES    = "Devices";

// Column indices (0-based) for Members sheet
// ID | Name | Outreach | DGroup | DGroupLeader | Ministry | Phone | Address | Birthday | Gender | CivilStatus | HasChildren | EmergencyContact | EmergencyPhone | Email | MembershipStatus | MembershipDate | BaptismDate | BaptismPlace | Classes | QRCodeURL | Status | DateRegistered
const COL_MEM = {
  ID:               0,
  NAME:             1,
  OUTREACH:         2,
  DGROUP:           3,
  DGROUP_LEADER:    4,
  MINISTRY:         5,
  PHONE:            6,
  ADDRESS:          7,
  BIRTHDAY:         8,
  GENDER:           9,
  CIVIL_STATUS:     10,
  HAS_CHILDREN:     11,
  EMERGENCY_CONTACT:12,
  EMERGENCY_PHONE:  13,
  EMAIL:            14,
  MEMBERSHIP_STATUS:15,
  MEMBERSHIP_DATE:  16,
  BAPTISM_DATE:     17,
  BAPTISM_PLACE:    18,
  CLASSES:          19,
  QR_CODE:          20,
  STATUS:           21,
  DATE_REGISTERED:  22
};

// Column indices (0-based) for Attendance sheet
const COL_ATT = {
  MEMBER_ID:      0,
  MEMBER_NAME:    1,
  DATE:           2,
  TIMESTAMP:      3,
  CHECKED_IN_BY:  4,
  OCCASION:       5
};

// Column indices (0-based) for Visitors sheet
const COL_VIS = {
  NAME:   0,
  PHONE:  1,
  DATE:   2,
  NOTES:  3
};


// =============================================================================
//  ENTRY POINTS
// =============================================================================

/**
 * Handles all GET requests.
 * Supported actions:
 *   - getMembers
 *   - getAttendance&date=YYYY-MM-DD
 *   - getSummary&month=YYYY-MM
 */
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || "";

    // Handle POST-like requests via GET with encoded data parameter
    if (e.parameter && e.parameter.data) {
      const body = JSON.parse(decodeURIComponent(e.parameter.data));
      const dataAction = body.action || action;
      switch (dataAction) {
        case "checkIn": return respond(checkIn(body));
        case "addMember": return respond(addMember(body));
        case "updateMember": return respond(updateMember(body));
        case "addVisitor": return respond(addVisitor(body));
        case "bulkSync": return respond(bulkSync(body));
        case "resendQR": return respond(resendQR(body));
        case "sendReport": return respond(sendReport(body));
        case "submitFeedback": return respond(submitFeedback(body));
        case "checkAccess": return respond(checkAccess(body));
        case "setOccasion": return respond(setOccasionConfig(body));
        case "registerDevice": return respond(registerDevice(body));
        case "removeCheckIn": return respond(removeCheckIn(body));
        case "deleteMember": return respond(deleteMember(body));
        case "saveSetting": return respond(saveSharedSetting(body));
        default: return respondError("Unknown data action: " + dataAction, 400);
      }
    }

    switch (action) {

      case "getMembers":
        return respond(getMembers());

      case "getAttendance": {
        const date = e.parameter.date || "";
        if (!isValidDate(date)) return respondError("Invalid or missing date parameter (expected YYYY-MM-DD)");
        return respond(getAttendance(date));
      }

      case "getSummary": {
        const month = e.parameter.month || "";
        if (!isValidMonth(month)) return respondError("Invalid or missing month parameter (expected YYYY-MM)");
        return respond(getSummary(month));
      }

      case "getAttendanceHistory": {
        const weeks = parseInt(e.parameter.weeks || "10", 10);
        return respond(getAttendanceHistory(weeks));
      }

      case "getSharedSettings":
        return respond(getSharedSettings());

      case "getMemberQR": {
        const memberId = e.parameter.memberId || "";
        if (!memberId) return respondError("memberId is required");
        return respond(getMemberQR(memberId));
      }

      case "getOccasion":
        return respond(getOccasionConfig());

      case "getDeviceStatus": {
        const deviceId = e.parameter.deviceId || "";
        if (!deviceId) return respondError("deviceId is required");
        return respond(getDeviceStatus(deviceId));
      }

      case "registerDevice": {
        const deviceId = e.parameter.deviceId || "";
        const name = e.parameter.name || "";
        if (!deviceId || !name) return respondError("deviceId and name are required");
        return respond(registerDevice({ deviceId, name }));
      }

      case "getPendingDevices": {
        const deviceId = e.parameter.deviceId || "";
        if (!deviceId) return respondError("deviceId is required");
        return respond(getPendingDevices(deviceId));
      }

      case "getAllDevices": {
        const deviceId = e.parameter.deviceId || "";
        if (!deviceId) return respondError("deviceId is required");
        return respond(getAllDevices(deviceId));
      }

      case "updateDeviceStatus": {
        const deviceId = e.parameter.deviceId || "";
        const targetDeviceId = e.parameter.targetDeviceId || "";
        const status = e.parameter.status || "";
        if (!deviceId || !targetDeviceId || !status) return respondError("deviceId, targetDeviceId, and status are required");
        return respond(updateDeviceStatusAdmin(deviceId, targetDeviceId, status));
      }

      default:
        return respondError("Unknown action: " + action, 400);
    }

  } catch (err) {
    logError("doGet", err);
    return respondError("Internal server error: " + err.message, 500);
  }
}


/**
 * Handles all POST requests.
 * Supported actions (sent in JSON body):
 *   - checkIn
 *   - addMember
 *   - updateMember
 *   - addVisitor
 *   - bulkSync
 */
function doPost(e) {
  try {
    // Parse JSON body
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const action = body.action || (e.parameter && e.parameter.action) || "";

    switch (action) {

      case "checkIn":
        return respond(checkIn(body));

      case "addMember":
        return respond(addMember(body));

      case "updateMember":
        return respond(updateMember(body));

      case "addVisitor":
        return respond(addVisitor(body));

      case "bulkSync":
        return respond(bulkSync(body));

      case "resendQR":
        return respond(resendQR(body));

      case "sendReport":
        return respond(sendReport(body));

      case "submitFeedback":
        return respond(submitFeedback(body));

      case "checkAccess":
        return respond(checkAccess(body));

      case "setOccasion":
        return respond(setOccasionConfig(body));

      case "registerDevice":
        return respond(registerDevice(body));

      case "getMembers":
        return respond(getMembers());

      case "getAttendance": {
        const date = body.date || "";
        if (!isValidDate(date)) return respondError("Invalid or missing date parameter (expected YYYY-MM-DD)");
        return respond(getAttendance(date));
      }

      case "getOccasion":
        return respond(getOccasionConfig());

      case "getDeviceStatus": {
        const deviceId = body.deviceId || "";
        if (!deviceId) return respondError("deviceId is required");
        return respond(getDeviceStatus(deviceId));
      }

      case "deleteMember":
        return respond(deleteMember(body));

      default:
        return respondError("Unknown action: " + action, 400);
    }

  } catch (err) {
    logError("doPost", err);
    return respondError("Internal server error: " + err.message, 500);
  }
}


// =============================================================================
//  GET HANDLERS
// =============================================================================

/**
 * Returns all members from the Members sheet.
 * @returns {Object} { success: true, data: [ memberObject, ... ] }
 */
function getMembers() {
  const sheet = getSheet(SHEET_MEMBERS);
  const rows  = getDataRows(sheet);

  const members = rows.map(row => rowToMember(row));
  return { success: true, data: members };
}


/**
 * Returns all attendance records for a specific date.
 * @param {string} date - Format YYYY-MM-DD
 * @returns {Object} { success: true, data: [ attendanceObject, ... ] }
 */
function getAttendance(date) {
  const sheet    = getSheet(SHEET_ATTENDANCE);
  const rows     = getDataRows(sheet);
  const filtered = rows.filter(row => normDate(row[COL_ATT.DATE]) === date);

  const records = filtered.map(row => rowToAttendance(row));
  return { success: true, data: records };
}


/**
 * Returns attendance records for the last N weeks (Sundays).
 * @param {number} weeks - Number of weeks to look back
 * @returns {Object} { success: true, data: [ attendanceObject, ... ] }
 */
function getAttendanceHistory(weeks) {
  const sheet = getSheet(SHEET_ATTENDANCE);
  const rows = getDataRows(sheet);
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - (weeks * 7));
  const cutoffStr = Utilities.formatDate(cutoff, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const filtered = rows.filter(row => {
    const d = normDate(row[COL_ATT.DATE]);
    return d >= cutoffStr;
  });

  const records = filtered.map(row => rowToAttendance(row));
  return { success: true, data: records };
}


/**
 * Saves a shared setting to a Settings sheet (key-value store).
 */
function saveSharedSetting(body) {
  const key = body.key;
  const value = body.value;
  if (!key) return { success: false, error: "key is required" };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Settings");
  if (!sheet) { sheet = ss.insertSheet("Settings"); sheet.appendRow(["key", "value"]); }
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) { sheet.getRange(i + 1, 2).setValue(value); return { success: true }; }
  }
  sheet.appendRow([key, value]);
  return { success: true };
}


/**
 * Returns all shared settings as key-value pairs.
 */
function getSharedSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Settings");
  if (!sheet) return { success: true, data: {} };
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) { if (data[i][0]) settings[data[i][0]] = data[i][1]; }
  return { success: true, data: settings };
}


/**
 * Returns per-Sunday attendance counts for the given month.
 * @param {string} month - Format YYYY-MM
 * @returns {Object} { success: true, data: [ { date, count, memberIds: [] }, ... ] }
 */
function getSummary(month) {
  const sheet = getSheet(SHEET_ATTENDANCE);
  const rows  = getDataRows(sheet);

  // Filter rows belonging to this month
  const monthRows = rows.filter(row => {
    const d = normDate(row[COL_ATT.DATE]);
    return d.startsWith(month);
  });

  // Group by date
  const map = {};
  monthRows.forEach(row => {
    const d  = normDate(row[COL_ATT.DATE]);
    const id = String(row[COL_ATT.MEMBER_ID]).trim();
    if (!map[d]) map[d] = { date: d, count: 0, memberIds: [] };
    map[d].count++;
    map[d].memberIds.push(id);
  });

  // Sort by date and return
  const summary = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  return { success: true, data: summary };
}


// =============================================================================
//  POST HANDLERS
// =============================================================================

/**
 * Records a single attendance check-in.
 * Prevents duplicate check-ins for the same member on the same date.
 *
 * @param {Object} body - { memberId, date, checkedInBy }
 * @returns {Object} { success: true, data: { status: "checked-in" | "already-checked-in" } }
 */
function checkIn(body) {
  const { memberId, date, checkedInBy } = body;

  if (!memberId)    throw new Error("memberId is required");
  if (!isValidDate(date)) throw new Error("date must be YYYY-MM-DD");

  const memberSheet = getSheet(SHEET_MEMBERS);
  const memberRows  = getDataRows(memberSheet);
  const memberRow   = memberRows.find(r => String(r[COL_MEM.ID]).trim() === String(memberId).trim());
  if (!memberRow) throw new Error("Member not found: " + memberId);
  const memberName = String(memberRow[COL_MEM.NAME]).trim();

  const attSheet = getSheet(SHEET_ATTENDANCE);
  const attRows  = getDataRows(attSheet);
  const isDup = attRows.some(r =>
    String(r[COL_ATT.MEMBER_ID]).trim() === String(memberId).trim() &&
    normDate(r[COL_ATT.DATE]) === date
  );
  if (isDup) {
    return { success: true, data: { status: "already-checked-in", memberId, date } };
  }

  const timestamp = new Date().toISOString();
  attSheet.appendRow([
    memberId,
    memberName,
    date,
    timestamp,
    checkedInBy || "manual",
    body.occasion || "Sunday Service"
  ]);

  return { success: true, data: { status: "checked-in", memberId, memberName, date, timestamp } };
}


function removeCheckIn(body) {
  const { memberId, date } = body;
  if (!memberId) throw new Error("memberId is required");
  if (!date) throw new Error("date is required");
  const sheet = getSheet(SHEET_ATTENDANCE);
  const data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    var rowDate = data[i][COL_ATT.DATE];
    if (rowDate instanceof Date) {
      var y = rowDate.getFullYear();
      var m = String(rowDate.getMonth() + 1).padStart(2, '0');
      var d = String(rowDate.getDate()).padStart(2, '0');
      rowDate = y + '-' + m + '-' + d;
    } else {
      rowDate = String(rowDate);
    }
    if (String(data[i][COL_ATT.MEMBER_ID]) === String(memberId) && rowDate === date) {
      sheet.deleteRow(i + 1);
      return { success: true, data: { status: "removed", memberId, date } };
    }
  }
  return { success: true, data: { status: "not-found", memberId, date } };
}

/**
 * Deletes a member from the Members sheet by ID.
 */
function deleteMember(body) {
  const { id } = body;
  if (!id) throw new Error("id is required");
  const sheet = getSheet(SHEET_MEMBERS);
  const data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][COL_MEM.ID]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, data: { status: "deleted", id: id } };
    }
  }
  return { success: true, data: { status: "not-found", id: id } };
}


/**
 * Adds a new member to the Members sheet.
 * Generates a unique ID in the format MEM-001.
 *
 * @param {Object} body - { name, dgroup, ministry, phone, birthday, email }
 * @returns {Object} { success: true, data: memberObject }
 */
function addMember(body) {
  const { name, outreach, dgroup, dgroupLeader, ministry, phone, address, birthday, gender, civilStatus, hasChildren, emergencyContact, emergencyPhone, email, membershipStatus, membershipDate, baptismDate, baptismPlace, classes } = body;

  if (!name) throw new Error("name is required");

  const existing = findMemberByName(name);
  if (existing) {
    return { success: false, error: 'Member "' + existing.name + '" already exists (' + existing.id + ')' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {

  const sheet  = getSheet(SHEET_MEMBERS);
  const newId  = generateMemberId(sheet);
  const today  = formatDate(new Date());
  const qrCode = generateQRUrl(newId);

  sheet.appendRow([
    newId,
    name             || "",
    outreach         || "",
    dgroup           || "",
    dgroupLeader     || "",
    ministry         || "",
    phone            || "",
    address          || "",
    birthday         || "",
    gender           || "",
    civilStatus      || "",
    hasChildren      || "",
    emergencyContact || "",
    emergencyPhone   || "",
    email            || "",
    membershipStatus || "",
    membershipDate   || "",
    baptismDate      || "",
    baptismPlace     || "",
    classes          || "",
    qrCode,
    "Active",
    today
  ]);

  const member = {
    id: newId, name, outreach: outreach||"", dgroup: dgroup||"", dgroupLeader: dgroupLeader||"",
    ministry: ministry||"", phone: phone||"", address: address||"", birthday: birthday||"",
    gender: gender||"", civilStatus: civilStatus||"", hasChildren: hasChildren||"",
    emergencyContact: emergencyContact||"", emergencyPhone: emergencyPhone||"",
    email: email||"", membershipStatus: membershipStatus||"", membershipDate: membershipDate||"",
    baptismDate: baptismDate||"", baptismPlace: baptismPlace||"", classes: classes||"",
    qrCode, status: "Active", dateRegistered: today
  };

  return { success: true, data: member };

  } finally {
    lock.releaseLock();
  }
}


/**
 * Updates one or more fields for an existing member.
 * Only provided fields are overwritten; others remain unchanged.
 *
 * @param {Object} body - { id, name?, dgroup?, phone?, birthday?, status?, photoUrl? }
 * @returns {Object} { success: true, data: updatedMemberObject }
 */
function updateMember(body) {
  const { id } = body;
  if (!id) throw new Error("id is required");

  const sheet = getSheet(SHEET_MEMBERS);
  const data  = sheet.getDataRange().getValues();

  // Find the row (skip header at index 0)
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL_MEM.ID]).trim() === String(id).trim()) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex === -1) throw new Error("Member not found: " + id);

  // Map of field names to column indices
  const fieldMap = {
    name:             COL_MEM.NAME,
    outreach:         COL_MEM.OUTREACH,
    dgroup:           COL_MEM.DGROUP,
    dgroupLeader:     COL_MEM.DGROUP_LEADER,
    ministry:         COL_MEM.MINISTRY,
    phone:            COL_MEM.PHONE,
    address:          COL_MEM.ADDRESS,
    birthday:         COL_MEM.BIRTHDAY,
    gender:           COL_MEM.GENDER,
    civilStatus:      COL_MEM.CIVIL_STATUS,
    hasChildren:      COL_MEM.HAS_CHILDREN,
    emergencyContact: COL_MEM.EMERGENCY_CONTACT,
    emergencyPhone:   COL_MEM.EMERGENCY_PHONE,
    email:            COL_MEM.EMAIL,
    membershipStatus: COL_MEM.MEMBERSHIP_STATUS,
    membershipDate:   COL_MEM.MEMBERSHIP_DATE,
    baptismDate:      COL_MEM.BAPTISM_DATE,
    baptismPlace:     COL_MEM.BAPTISM_PLACE,
    classes:          COL_MEM.CLASSES,
    status:           COL_MEM.STATUS
  };

  const currentRow = sheet.getRange(rowIndex + 1, 1, 1, 23).getValues()[0];
  Object.entries(fieldMap).forEach(([field, col]) => {
    if (body[field] !== undefined) {
      currentRow[col] = body[field];
    }
  });
  sheet.getRange(rowIndex + 1, 1, 1, 23).setValues([currentRow]);

  return { success: true, data: rowToMember(currentRow) };
}


/**
 * Adds a walk-in visitor to the Visitors sheet.
 *
 * @param {Object} body - { name, phone, notes? }
 * @returns {Object} { success: true, data: visitorRecord }
 */
function addVisitor(body) {
  const { name, phone, notes } = body;
  if (!name) throw new Error("name is required");

  const sheet = getSheet(SHEET_VISITORS);
  const date  = formatDate(new Date());

  sheet.appendRow([name, phone || "", date, notes || ""]);

  return {
    success: true,
    data: { name, phone: phone || "", date, notes: notes || "" }
  };
}


/**
 * Bulk-syncs offline check-ins in a single call.
 * Skips any records that are already present (idempotent).
 *
 * @param {Object} body - { checkins: [{ memberId, date, timestamp, checkedInBy }, ...] }
 * @returns {Object} { success: true, data: { synced, skipped, errors } }
 */
function bulkSync(body) {
  const checkins = body.checkins || [];
  if (!Array.isArray(checkins)) throw new Error("checkins must be an array");

  const sheet   = getSheet(SHEET_ATTENDANCE);
  let synced    = 0;
  let skipped   = 0;
  const errors  = [];

  // Pre-load existing check-in keys for fast duplicate lookup
  const existingKeys = buildExistingCheckinKeys(sheet);

  checkins.forEach((item, idx) => {
    try {
      const { memberId, date, timestamp, checkedInBy } = item;

      if (!memberId || !isValidDate(date)) {
        errors.push({ index: idx, reason: "Invalid memberId or date", item });
        return;
      }

      const key = `${memberId}__${date}`;
      if (existingKeys.has(key)) {
        skipped++;
        return;
      }

      const memberName = getMemberName(memberId) || "Unknown";
      sheet.appendRow([
        memberId,
        memberName,
        date,
        timestamp || new Date().toISOString(),
        checkedInBy || "sync",
        item.occasion || "Sunday Service"
      ]);
      existingKeys.add(key); // Prevent intra-batch duplicates
      synced++;

    } catch (err) {
      errors.push({ index: idx, reason: err.message });
    }
  });

  return { success: true, data: { synced, skipped, errors } };
}


// =============================================================================
//  FEEDBACK
// =============================================================================

function submitFeedback(body) {
  const { category, message, userEmail } = body;
  if (!message) throw new Error("message is required");
  const ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Feedback');
  if (!sheet) {
    sheet = ss.insertSheet('Feedback');
    sheet.appendRow(["Date", "Category", "Message", "UserEmail", "Status"]);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([new Date().toISOString(), category || "General", message, userEmail || "anonymous", "New"]);
  return { success: true, data: { status: "received" } };
}


// =============================================================================
//  ACCESS CONTROL
// =============================================================================

function checkAccess(body) {
  const { email, name } = body;
  if (!email) throw new Error("email is required");
  const ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('ApprovedUsers');
  if (!sheet) {
    sheet = ss.insertSheet('ApprovedUsers');
    sheet.appendRow(["Email", "Name", "Role", "ApprovedDate", "Status"]);
    sheet.setFrozenRows(1);
  }
  const rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase().trim() === email.toLowerCase().trim()) {
      var status = String(rows[i][4]).toLowerCase().trim();
      if (status === "approved") {
        return { success: true, approved: true, role: rows[i][2] };
      } else {
        return { success: true, approved: false, pending: status === "pending" };
      }
    }
  }
  sheet.appendRow([email, name || "", "usher", "", "pending"]);
  return { success: true, approved: false, pending: true };
}


// =============================================================================
//  OCCASION CONFIG
// =============================================================================

function getOccasionConfig() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName("Config");
  if (!sheet) return { success: true, data: { active: "Sunday Service", list: ["Sunday Service"] } };
  const rows = sheet.getDataRange().getValues();
  var active = "Sunday Service";
  var list = ["Sunday Service"];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === "activeOccasion") active = String(rows[i][1]).trim() || "Sunday Service";
    if (String(rows[i][0]).trim() === "occasionList") {
      try { list = JSON.parse(String(rows[i][1])); } catch(e) {}
    }
  }
  return { success: true, data: { active: active, list: list } };
}

function setOccasionConfig(body) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName("Config");
  if (!sheet) {
    sheet = ss.insertSheet("Config");
    sheet.appendRow(["Key", "Value"]);
    sheet.setFrozenRows(1);
  }
  const rows = sheet.getDataRange().getValues();
  var activeRow = -1, listRow = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === "activeOccasion") activeRow = i + 1;
    if (String(rows[i][0]).trim() === "occasionList") listRow = i + 1;
  }
  if (body.active !== undefined) {
    if (activeRow > 0) sheet.getRange(activeRow, 2).setValue(body.active);
    else sheet.appendRow(["activeOccasion", body.active]);
  }
  if (body.list !== undefined) {
    var listStr = JSON.stringify(body.list);
    if (listRow > 0) sheet.getRange(listRow, 2).setValue(listStr);
    else sheet.appendRow(["occasionList", listStr]);
  }
  return { success: true };
}


// =============================================================================
//  DEVICE ACCESS CONTROL
// =============================================================================

function getOrCreateDevicesSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_DEVICES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DEVICES);
    sheet.appendRow(["DeviceID", "Name", "Status", "RegisteredDate", "Email"]);
    sheet.getRange("1:1").setFontWeight("bold");
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Pending", "Approved", "Blocked"], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange("C2:C1000").setDataValidation(statusRule);
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 130);
    sheet.setColumnWidth(5, 200);
  }
  return sheet;
}

function registerDevice(body) {
  const { deviceId, name } = body;
  if (!deviceId || !name) throw new Error("deviceId and name are required");

  const sheet = getOrCreateDevicesSheet();
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === deviceId) {
      return { success: true, data: { status: String(rows[i][2]).trim(), alreadyRegistered: true } };
    }
  }

  // Look up member email by name
  var memberEmail = "";
  try {
    const memberSheet = getSheet(SHEET_MEMBERS);
    const memberRows = getDataRows(memberSheet);
    const target = String(name).trim().toLowerCase();
    for (let m = 0; m < memberRows.length; m++) {
      if (String(memberRows[m][COL_MEM.NAME]).trim().toLowerCase() === target) {
        memberEmail = String(memberRows[m][COL_MEM.EMAIL] || "").trim();
        break;
      }
    }
  } catch (err) {}

  const isFirst = rows.length <= 1;
  const status = isFirst ? "Approved" : "Pending";
  sheet.appendRow([deviceId, name, status, formatDate(new Date()), memberEmail]);

  return { success: true, data: { status: status, alreadyRegistered: false, memberFound: !!memberEmail } };
}

function getDeviceStatus(deviceId) {
  const sheet = getOrCreateDevicesSheet();
  const rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var roleCol = -1;
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).trim().toLowerCase() === 'role') { roleCol = h; break; }
  }

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === deviceId) {
      var role = roleCol >= 0 ? (String(rows[i][roleCol]).trim() || 'user') : 'user';
      return { success: true, data: { status: String(rows[i][2]).trim(), role: role } };
    }
  }
  return { success: true, data: { status: "unknown", role: "user" } };
}

function isAdminDevice(deviceId) {
  const sheet = getOrCreateDevicesSheet();
  const rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var roleCol = -1;
  for (var h = 0; h < headers.length; h++) {
    if (String(headers[h]).trim().toLowerCase() === 'role') { roleCol = h; break; }
  }
  if (roleCol < 0) return false;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === deviceId && String(rows[i][roleCol]).trim().toLowerCase() === 'admin') {
      return true;
    }
  }
  return false;
}

function getPendingDevices(requestingDeviceId) {
  if (!isAdminDevice(requestingDeviceId)) {
    return { success: false, error: 'unauthorized' };
  }
  const sheet = getOrCreateDevicesSheet();
  const rows = sheet.getDataRange().getValues();
  var pending = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).trim() === 'Pending') {
      pending.push({
        deviceId: String(rows[i][0]).trim(),
        name: String(rows[i][1]).trim(),
        registeredAt: String(rows[i][3]).trim()
      });
    }
  }
  return { success: true, data: pending };
}

function getAllDevices(requestingDeviceId) {
  if (!isAdminDevice(requestingDeviceId)) {
    return { success: false, error: 'unauthorized' };
  }
  const sheet = getOrCreateDevicesSheet();
  const rows = sheet.getDataRange().getValues();
  var devices = [];
  for (let i = 1; i < rows.length; i++) {
    devices.push({
      deviceId: String(rows[i][0]).trim(),
      name: String(rows[i][1]).trim(),
      status: String(rows[i][2]).trim(),
      registeredAt: String(rows[i][3]).trim()
    });
  }
  return { success: true, data: devices };
}

function updateDeviceStatusAdmin(requestingDeviceId, targetDeviceId, newStatus) {
  if (!isAdminDevice(requestingDeviceId)) {
    return { success: false, error: 'unauthorized' };
  }
  if (newStatus !== 'Approved' && newStatus !== 'Blocked') {
    return { success: false, error: 'Invalid status' };
  }
  const sheet = getOrCreateDevicesSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === targetDeviceId) {
      sheet.getRange(i + 1, 3).setValue(newStatus);
      return { success: true };
    }
  }
  return { success: false, error: 'Device not found' };
}

// =============================================================================
//  SETUP FUNCTION
//  Run this manually once from the Apps Script editor to initialize the sheet.
// =============================================================================

/**
 * Creates the required sheets with headers if they do not already exist.
 * Also initializes the Config sheet with default key-value pairs.
 * Run from the Apps Script editor: Extensions > Apps Script > Run > setup
 */
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // --- Members (updated schema) ---
  ensureSheet(ss, SHEET_MEMBERS, [
    "ID", "Name", "Outreach", "DGroup", "DGroupLeader", "Ministry",
    "Phone", "Address", "Birthday", "Gender", "CivilStatus", "HasChildren",
    "EmergencyContact", "EmergencyPhone", "Email", "MembershipStatus",
    "MembershipDate", "BaptismDate", "BaptismPlace", "Classes",
    "QRCodeURL", "Status", "DateRegistered"
  ]);

  // --- Attendance ---
  ensureSheet(ss, SHEET_ATTENDANCE, [
    "MemberID", "MemberName", "Date", "Timestamp", "CheckedInBy", "Occasion"
  ]);

  // --- Visitors ---
  ensureSheet(ss, SHEET_VISITORS, [
    "Name", "Phone", "Date", "Notes"
  ]);

  // --- Config ---
  const configSheet = ensureSheet(ss, SHEET_CONFIG, ["Key", "Value"]);

  // Populate default config rows only if the sheet was just created (1 row = header only)
  if (configSheet.getLastRow() <= 1) {
    configSheet.appendRow(["ADMIN_EMAIL",  ADMIN_EMAIL || ""]);
    configSheet.appendRow(["CHURCH_NAME",  "JILGM"]);
    Logger.log("Config sheet initialized with default values.");
  }

  // --- Reports ---
  if (!ss.getSheetByName('Reports')) {
    var reportsSheet = ss.insertSheet('Reports');
    reportsSheet.appendRow(['Date', 'Outreach', 'Youth', 'YPro', 'Mothers', 'Fathers', 'Children', 'Total', 'New', 'Others', 'SentTo', 'Timestamp']);
    reportsSheet.getRange(1, 1, 1, 12).setFontWeight('bold');
    reportsSheet.setFrozenRows(1);
    Logger.log("Created sheet: Reports");
  }

  // --- Feedback ---
  ensureSheet(ss, 'Feedback', [
    "Date", "Category", "Message", "UserEmail", "Status"
  ]);

  // --- ApprovedUsers ---
  ensureSheet(ss, 'ApprovedUsers', [
    "Email", "Name", "Role", "ApprovedDate", "Status"
  ]);

  Logger.log("Setup complete. Sheets ready.");
}


// =============================================================================
//  HELPER UTILITIES
// =============================================================================

/**
 * Opens the spreadsheet and returns the named sheet.
 * Throws if the sheet does not exist.
 */
function sheetToCsv(sheet) {
  var data = sheet.getDataRange().getValues();
  return data.map(function(row) {
    return row.map(function(cell) {
      var val = String(cell === null || cell === undefined ? '' : cell);
      if (val.indexOf(',') >= 0 || val.indexOf('"') >= 0 || val.indexOf('\n') >= 0) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(',');
  }).join('\n');
}

function getSheet(sheetName) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found. Run setup() first.`);
  return sheet;
}


/**
 * Returns all data rows (excluding the header row) from a sheet.
 * @returns {Array[]} 2-D array of values
 */
function getDataRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; // No data rows
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
}

/**
 * Normalizes a date value (Date object or string) to YYYY-MM-DD format.
 */
function normDate(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(val || "").trim();
}


/**
 * Converts a raw Members row array to a plain object.
 */
function rowToMember(row) {
  return {
    id:               String(row[COL_MEM.ID]               || "").trim(),
    name:             String(row[COL_MEM.NAME]             || "").trim(),
    outreach:         String(row[COL_MEM.OUTREACH]         || "").trim(),
    dgroup:           String(row[COL_MEM.DGROUP]           || "").trim(),
    dgroupLeader:     String(row[COL_MEM.DGROUP_LEADER]    || "").trim(),
    ministry:         String(row[COL_MEM.MINISTRY]         || "").trim(),
    phone:            String(row[COL_MEM.PHONE]            || "").trim(),
    address:          String(row[COL_MEM.ADDRESS]          || "").trim(),
    birthday:         normDate(row[COL_MEM.BIRTHDAY]),
    gender:           String(row[COL_MEM.GENDER]           || "").trim(),
    civilStatus:      String(row[COL_MEM.CIVIL_STATUS]     || "").trim(),
    hasChildren:      String(row[COL_MEM.HAS_CHILDREN]     || "").trim(),
    emergencyContact: String(row[COL_MEM.EMERGENCY_CONTACT]|| "").trim(),
    emergencyPhone:   String(row[COL_MEM.EMERGENCY_PHONE]  || "").trim(),
    email:            String(row[COL_MEM.EMAIL]            || "").trim(),
    membershipStatus: String(row[COL_MEM.MEMBERSHIP_STATUS]|| "").trim(),
    membershipDate:   normDate(row[COL_MEM.MEMBERSHIP_DATE]),
    baptismDate:      normDate(row[COL_MEM.BAPTISM_DATE]),
    baptismPlace:     String(row[COL_MEM.BAPTISM_PLACE]    || "").trim(),
    classes:          String(row[COL_MEM.CLASSES]          || "").trim(),
    qrCode:           String(row[COL_MEM.QR_CODE]          || "").trim(),
    status:           String(row[COL_MEM.STATUS]           || "").trim(),
    dateRegistered:   String(row[COL_MEM.DATE_REGISTERED]  || "").trim()
  };
}


/**
 * Converts a raw Attendance row array to a plain object.
 */
function rowToAttendance(row) {
  return {
    memberId:    String(row[COL_ATT.MEMBER_ID]    || "").trim(),
    memberName:  String(row[COL_ATT.MEMBER_NAME]  || "").trim(),
    date:        normDate(row[COL_ATT.DATE]),
    timestamp:   String(row[COL_ATT.TIMESTAMP]    || "").trim(),
    checkedInBy: String(row[COL_ATT.CHECKED_IN_BY]|| "").trim(),
    occasion:    String(row[COL_ATT.OCCASION]     || "Sunday Service").trim()
  };
}


/**
 * Finds a member by full name (case-insensitive).
 * Returns {id, name, email} or null if not found.
 */
function findMemberByName(name) {
  const sheet = getSheet(SHEET_MEMBERS);
  const rows = getDataRows(sheet);
  for (let i = 0; i < rows.length; i++) {
    if (namesMatch(rows[i][COL_MEM.NAME], name)) {
      return {
        id: String(rows[i][COL_MEM.ID]).trim(),
        name: String(rows[i][COL_MEM.NAME]).trim(),
        email: String(rows[i][COL_MEM.EMAIL]).trim()
      };
    }
  }
  return null;
}

/**
 * Sends email to a person who tried to register again.
 */
function sendDuplicateNotice(email, name, existingId) {
  try {
    const subject = "FlockTrack - You're Already Registered";
    const body = "Hi " + name + ",\n\n" +
      "You are already registered in our system (ID: " + existingId + ").\n\n" +
      "Your QR code was previously sent to this email. If you lost it, please ask an usher to resend it.\n\n" +
      "God bless!\nFlockTrack - JILGM STBC";
    MailApp.sendEmail(email, subject, body);
  } catch (err) {
    Logger.log("sendDuplicateNotice error: " + err.message);
  }
}

/**
 * Looks up the display name of a member by their ID.
 * Returns null if not found.
 */
function getMemberName(memberId) {
  const sheet = getSheet(SHEET_MEMBERS);
  const rows  = getDataRows(sheet);
  const found = rows.find(row => String(row[COL_MEM.ID]).trim() === String(memberId).trim());
  return found ? String(found[COL_MEM.NAME]).trim() : null;
}


/**
 * Returns true if the member is already checked in for the given date.
 */
function isAlreadyCheckedIn(memberId, date) {
  const sheet = getSheet(SHEET_ATTENDANCE);
  const keys  = buildExistingCheckinKeys(sheet);
  return keys.has(`${memberId}__${date}`);
}


/**
 * Builds a Set of "memberId__date" keys from the Attendance sheet for O(1) lookups.
 */
function buildExistingCheckinKeys(sheet) {
  const rows = getDataRows(sheet);
  const keys = new Set();
  rows.forEach(row => {
    const id   = String(row[COL_ATT.MEMBER_ID]).trim();
    const date = normDate(row[COL_ATT.DATE]);
    if (id && date) keys.add(`${id}__${date}`);
  });
  return keys;
}


/**
 * Generates the next sequential member ID (e.g. MEM-042).
 * Scans existing IDs and increments the highest numeric suffix.
 */
function generateMemberId(sheet) {
  const rows   = getDataRows(sheet);
  let   maxNum = 0;

  rows.forEach(row => {
    const id    = String(row[COL_MEM.ID]).trim();
    const match = id.match(/^MEM-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  const nextNum = maxNum + 1;
  return "MEM-" + String(nextNum).padStart(3, "0");
}


/**
 * Saves a base64-encoded image to Google Drive and returns a public URL.
 * Stores photos in a folder named "ChurchApp_Photos".
 *
 * @param {string} base64Data - Data URL (data:image/jpeg;base64,...) or raw base64
 * @param {string} memberId   - Used as the filename
 * @returns {string} Public view URL of the uploaded file
 */
function savePhotoToDrive(base64Data, memberId) {
  try {
    // Strip data URL prefix if present
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const blob   = Utilities.newBlob(
      Utilities.base64Decode(base64),
      "image/jpeg",
      memberId + ".jpg"
    );

    // Get or create the photos folder
    const folderName = "ChurchApp_Photos";
    let   folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getDownloadUrl();

  } catch (err) {
    logError("savePhotoToDrive", err);
    return ""; // Non-fatal: return empty string if photo upload fails
  }
}


/**
 * Generates a QR code URL for a member ID using the free qrserver API.
 * The QR encodes the member ID string directly.
 *
 * @param {string} memberId
 * @returns {string} QR code image URL (300x300)
 */
function generateQRUrl(memberId) {
  const encodedId = encodeURIComponent(memberId);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedId}`;
}


/**
 * Creates a sheet with the given header row if it does not already exist.
 */
function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);

    // Style the header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4a86e8");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);

    Logger.log(`Created sheet: ${name}`);
  } else {
    Logger.log(`Sheet already exists: ${name}`);
  }
  return sheet;
}


/**
 * Formats a Date object as YYYY-MM-DD.
 */
function formatDate(d) {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day   = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


/**
 * Validates a YYYY-MM-DD date string.
 */
function isValidDate(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}


/**
 * Validates a YYYY-MM month string.
 */
function isValidMonth(str) {
  return typeof str === "string" && /^\d{4}-\d{2}$/.test(str);
}


/**
 * Logs an error to the Apps Script Logger for debugging.
 */
function logError(context, err) {
  Logger.log(`[ERROR] ${context}: ${err.message}\n${err.stack || ""}`);
}


// =============================================================================
//  RESPONSE BUILDERS
//  All responses include CORS headers (Access-Control-Allow-Origin: *)
// =============================================================================

/**
 * Builds a successful JSON response with CORS headers.
 * @param {Object} payload - Must have { success, data } shape
 */
function respond(payload) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}


/**
 * Builds an error JSON response.
 * Note: Apps Script Web Apps do not support custom HTTP status codes;
 * the status field in the body conveys the error code to the client.
 *
 * @param {string} message
 * @param {number} [status=400]
 */
function respondError(message, status) {
  const payload = {
    success: false,
    error:   message,
    status:  status || 400
  };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================================================
//  FORM SUBMIT TRIGGER
//  Install as an installable trigger: Triggers > onFormSubmit > From spreadsheet
//  or bind to the linked Google Form's "On form submit" trigger.
// =============================================================================

/**
 * Installable trigger fired when a member registration Google Form is submitted.
 * Extracts fields, generates a member ID and QR code, saves the QR image to
 * Drive, writes the member row, and emails the member their QR code.
 *
 * Expected form fields (case-insensitive match on title):
 *   Full Name | Email | Phone | Birthday | D-Group Leader | Ministry
 *
 * @param {GoogleAppsScript.Events.SheetsOnFormSubmit} e
 */
function onFormSubmit(e) {
  try {
    const responses = e.namedValues; // { "Field Title": ["value"], ... }

    // Helper to safely pull first response value by a case-insensitive key match
    function getField(label) {
      const key = Object.keys(responses).find(
        k => k.toLowerCase().trim() === label.toLowerCase().trim()
      );
      return key ? (responses[key][0] || "").trim() : "";
    }

    const fullName        = getField("Full Name");
    const email           = getField("Email Address");
    const phone           = getField("Phone");
    const address         = getField("Complete Address");
    const birthday        = getField("Birthday");
    const gender          = getField("Gender");
    const civilStatus     = getField("Civil Status");
    const hasChildren     = getField("Do you have children?");
    const emergencyContact= getField("Emergency Contact Person");
    const emergencyPhone  = getField("Emergency Contact Person Number");
    const outreach        = getField("Outreach");
    const dgroup          = "";
    const dgroupLeader    = getField("D-Group Leader");
    const ministry        = getField("Ministry");
    const membershipStatus= getField("Membership Status");
    const membershipDate  = getField("Membership Date");
    const baptismDate     = getField("Date of Baptism");
    const baptismPlace    = getField("Place of Baptism");
    const classes         = getField("Classes Attended");

    if (!fullName) {
      Logger.log("onFormSubmit: No Full Name found in form response. Skipping.");
      return;
    }

    const existing = findMemberByName(fullName);
    if (existing) {
      Logger.log("Duplicate registration blocked: " + fullName + " (matches " + existing.id + ")");
      if (email) { sendDuplicateNotice(email, fullName, existing.id); }
      return;
    }

    const formLock = LockService.getScriptLock();
    formLock.waitLock(10000);
    try {

    const sheet  = getSheet(SHEET_MEMBERS);
    const newId  = generateMemberId(sheet);
    const today  = formatDate(new Date());
    const qrUrl  = generateQRUrl(newId);
    const qrImageUrl = saveQRToDrive(newId, qrUrl);

    sheet.appendRow([
      newId,
      fullName,
      outreach,
      dgroup,
      dgroupLeader,
      ministry,
      phone,
      address,
      birthday,
      gender,
      civilStatus,
      hasChildren,
      emergencyContact,
      emergencyPhone,
      email,
      membershipStatus,
      membershipDate,
      baptismDate,
      baptismPlace,
      classes,
      qrImageUrl || qrUrl,
      "Active",
      today
    ]);

    } finally {
      formLock.releaseLock();
    }

    Logger.log("onFormSubmit: Registered member " + newId + " - " + fullName);

    // Send QR email if email provided
    if (email) {
      sendQREmail(email, fullName, newId, qrImageUrl || qrUrl);
    }

  } catch (err) {
    logError("onFormSubmit", err);
  }
}


// =============================================================================
//  NEW GET HANDLERS
// =============================================================================

/**
 * Returns the QR code URL and name for a given member ID.
 *
 * @param {string} memberId
 * @returns {Object} { success: true, data: { qrUrl, name } }
 */
function getMemberQR(memberId) {
  const sheet = getSheet(SHEET_MEMBERS);
  const rows  = getDataRows(sheet);
  const row   = rows.find(r => String(r[COL_MEM.ID]).trim() === memberId.trim());

  if (!row) throw new Error("Member not found: " + memberId);

  return {
    success: true,
    data: {
      qrUrl: String(row[COL_MEM.QR_CODE] || "").trim(),
      name:  String(row[COL_MEM.NAME]    || "").trim()
    }
  };
}


// =============================================================================
//  NEW POST HANDLERS
// =============================================================================

/**
 * Re-sends the QR code email to a member.
 *
 * @param {Object} body - { memberId }
 * @returns {Object} { success: true } or throws on error
 */
function resendQR(body) {
  const { memberId } = body;
  if (!memberId) throw new Error("memberId is required");

  const sheet = getSheet(SHEET_MEMBERS);
  const rows  = getDataRows(sheet);
  const row   = rows.find(r => String(r[COL_MEM.ID]).trim() === memberId.trim());

  if (!row) throw new Error("Member not found: " + memberId);

  const email  = String(row[COL_MEM.EMAIL]   || "").trim();
  const name   = String(row[COL_MEM.NAME]    || "").trim();
  const qrUrl  = String(row[COL_MEM.QR_CODE] || "").trim();

  if (!email) throw new Error("No email address on file for member: " + memberId);

  sendQREmail(email, name, memberId, qrUrl);

  return { success: true, data: { message: "QR code resent to " + email } };
}


// =============================================================================
//  REPORT SENDER
// =============================================================================

/**
 * Sends a formatted attendance report email and logs it to the Reports sheet.
 *
 * @param {Object} body - { email, date, outreach, youth, ypro, mothers, fathers, children, newCount, others }
 * @returns {Object} { success: true, data: { total } }
 */
function sendReport(body) {
  var email = body.email;
  if (!email) return { success: false, error: 'No email configured' };

  var date     = body.date     || new Date().toISOString().split('T')[0];
  var occasion = body.occasion || 'Sunday Service';
  var outreach = body.outreach || 'STBC';
  var youth    = body.youth    || 0;
  var ypro     = body.ypro     || 0;
  var mothers  = body.mothers  || 0;
  var fathers  = body.fathers  || 0;
  var children = body.children || 0;
  var total    = youth + ypro + mothers + fathers + children;
  var newCount = body.newCount || 0;
  var others   = body.others   || '-';

  var subject  = 'JILGM Report - ' + occasion + ' - ' + date;
  var htmlBody =
    '<div style="font-family:Arial,sans-serif;max-width:400px;padding:20px">'
    + '<h2 style="color:#d4a843;margin-bottom:16px">JILGM Attendance Report</h2>'
    + '<p><strong>Date:</strong> ' + date + '</p>'
    + '<p><strong>Occasion:</strong> ' + occasion + '</p>'
    + '<p><strong>Outreach:</strong> ' + outreach + '</p>'
    + '<hr style="border:1px solid #eee;margin:12px 0">'
    + '<table style="width:100%;border-collapse:collapse">'
    + '<tr><td style="padding:6px 0">Youth</td><td style="text-align:right;font-weight:bold">' + youth + '</td></tr>'
    + '<tr><td style="padding:6px 0">YPro</td><td style="text-align:right;font-weight:bold">' + ypro + '</td></tr>'
    + '<tr><td style="padding:6px 0">Mothers</td><td style="text-align:right;font-weight:bold">' + mothers + '</td></tr>'
    + '<tr><td style="padding:6px 0">Fathers</td><td style="text-align:right;font-weight:bold">' + fathers + '</td></tr>'
    + '<tr><td style="padding:6px 0">Children</td><td style="text-align:right;font-weight:bold">' + children + '</td></tr>'
    + '<tr style="border-top:2px solid #333"><td style="padding:8px 0;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold;font-size:18px">' + total + '</td></tr>'
    + '</table>'
    + '<hr style="border:1px solid #eee;margin:12px 0">'
    + '<p><strong>New:</strong> ' + newCount + '</p>'
    + '<p><strong>Others:</strong> ' + others + '</p>'
    + '<hr style="border:1px solid #eee;margin:12px 0">'
    + '<p style="color:#888;font-size:12px">Sent from JILGM Attendance Tracker</p>'
    + '</div>';

  // Generate full spreadsheet backup as xlsx
  var token = ScriptApp.getOAuthToken();
  var xlsxUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/export?format=xlsx';
  var response = UrlFetchApp.fetch(xlsxUrl, {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true
  });
  var xlsxBlob = response.getBlob().setName('FlockTrack_Backup_' + date + '.xlsx');

  MailApp.sendEmail({
    to:       email,
    subject:  subject,
    htmlBody: htmlBody,
    attachments: [xlsxBlob]
  });

  // Log to Reports sheet
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Reports');
  if (!sheet) {
    sheet = ss.insertSheet('Reports');
    sheet.appendRow(['Date', 'Occasion', 'Outreach', 'Youth', 'YPro', 'Mothers', 'Fathers', 'Children', 'Total', 'New', 'Others', 'SentTo', 'Timestamp']);
    sheet.getRange(1, 1, 1, 13).setFontWeight('bold');
  }
  sheet.appendRow([date, occasion, outreach, youth, ypro, mothers, fathers, children, total, newCount, others, email, new Date()]);

  checkAndRunMonthlyBackup();
  return { success: true, data: { total: total } };
}


// =============================================================================
//  WEEKLY BACKUP
//  Schedule via Triggers > weeklyBackup > Time-driven > Week timer
// =============================================================================

/**
 * Creates a timestamped copy of the spreadsheet and emails it to ADMIN_EMAIL.
 * Set up as a weekly time-driven trigger from the Apps Script Triggers panel.
 */
function weeklyBackup() {
  try {
    const adminEmail = getConfigValue("ADMIN_EMAIL") || ADMIN_EMAIL;
    if (!adminEmail) {
      Logger.log("weeklyBackup: ADMIN_EMAIL is not configured. Skipping backup email.");
      return;
    }

    const ss         = SpreadsheetApp.openById(SHEET_ID);
    const churchName = getConfigValue("CHURCH_NAME") || "Church";
    const dateStr    = formatDate(new Date());
    const copyName   = churchName + " Attendance Backup - " + dateStr;

    // Duplicate the spreadsheet
    const file     = DriveApp.getFileById(SHEET_ID);
    const copyFile = file.makeCopy(copyName);
    const copyUrl  = copyFile.getUrl();

    // Email the admin with a link to the backup
    const subject = churchName + " - Weekly Attendance Backup (" + dateStr + ")";
    const body    =
      "<p>Hello,</p>" +
      "<p>Your weekly attendance sheet backup is ready.</p>" +
      "<p><strong>Backup name:</strong> " + copyName + "</p>" +
      "<p><a href='" + copyUrl + "'>Click here to open the backup in Google Sheets</a></p>" +
      "<p>This backup was generated automatically every week.</p>" +
      "<br><p>-- JILGM Attendance System</p>";

    MailApp.sendEmail({
      to:       adminEmail,
      subject:  subject,
      htmlBody: body
    });

    Logger.log("weeklyBackup: Backup created and emailed to " + adminEmail);

  } catch (err) {
    logError("weeklyBackup", err);
  }
}


// =============================================================================
//  EMAIL HELPER
// =============================================================================

/**
 * Sends the QR code welcome email to a newly registered member.
 * Fetches the QR image from the URL, attaches it, and embeds it in the HTML body.
 *
 * @param {string} toEmail   - Recipient email address
 * @param {string} name      - Member display name
 * @param {string} memberId  - Member ID (e.g. MEM-001)
 * @param {string} qrUrl     - URL of the QR code image
 */
function sendQREmail(toEmail, name, memberId, qrUrl) {
  try {
    const churchName = getConfigValue("CHURCH_NAME") || "JILGM";

    // Fetch QR image as a blob to attach
    let qrBlob = null;
    try {
      const response = UrlFetchApp.fetch(qrUrl);
      qrBlob = response.getBlob().setName(memberId + "_QR.png");
    } catch (fetchErr) {
      logError("sendQREmail - fetch QR blob", fetchErr);
    }

    const htmlBody =
      "<!DOCTYPE html>" +
      "<html><body style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;'>" +
      "<div style='background:#1a73e8;padding:20px;border-radius:8px 8px 0 0;text-align:center;'>" +
      "<h1 style='color:#ffffff;margin:0;'>" + churchName + "</h1>" +
      "<p style='color:#d0e4ff;margin:4px 0 0;'>Member Registration Confirmation</p>" +
      "</div>" +
      "<div style='border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px;'>" +
      "<p style='font-size:16px;'>Dear <strong>" + name + "</strong>,</p>" +
      "<p>Welcome to " + churchName + "! Your member registration is confirmed.</p>" +
      "<p><strong>Member ID:</strong> " + memberId + "</p>" +
      "<div style='text-align:center;margin:24px 0;'>" +
      "<img src='" + qrUrl + "' alt='QR Code' " +
      "style='width:220px;height:220px;border:4px solid #1a73e8;border-radius:8px;'/>" +
      "</div>" +
      "<div style='background:#f0f7ff;border-left:4px solid #1a73e8;padding:12px 16px;border-radius:4px;margin-bottom:16px;'>" +
      "<p style='margin:0;font-size:14px;'>" +
      "<strong>How to use your QR code:</strong><br>" +
      "Show this QR code at the church gate every Sunday for attendance check-in. " +
      "You can save this image or take a screenshot for easy access." +
      "</p>" +
      "</div>" +
      "<p style='font-size:13px;color:#666;'>If you have questions, please contact your D-Group Leader or the church office.</p>" +
      "<p style='font-size:13px;color:#666;'>God bless you!</p>" +
      "</div>" +
      "<p style='text-align:center;font-size:11px;color:#aaa;margin-top:16px;'>" +
      churchName + " Attendance System" +
      "</p>" +
      "</body></html>";

    const mailOptions = {
      to:       toEmail,
      subject:  "Your " + churchName + " Attendance QR Code",
      htmlBody: htmlBody
    };

    if (qrBlob) {
      mailOptions.attachments = [qrBlob];
    }

    MailApp.sendEmail(mailOptions);
    Logger.log("sendQREmail: Email sent to " + toEmail + " for " + memberId);

  } catch (err) {
    logError("sendQREmail", err);
  }
}


// =============================================================================
//  DRIVE HELPERS
// =============================================================================

/**
 * Finds an existing Google Drive folder by name or creates it if not found.
 *
 * @param {string} folderName
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function getOrCreateDriveFolder(folderName) {
  const iter = DriveApp.getFoldersByName(folderName);
  if (iter.hasNext()) return iter.next();
  return DriveApp.createFolder(folderName);
}


/**
 * Downloads the QR code image from the API and saves it to the
 * "JILGM_QR_Codes" Drive folder. Returns the file's download URL,
 * or an empty string if the save fails (non-fatal).
 *
 * @param {string} memberId
 * @param {string} qrUrl
 * @returns {string} Drive file download URL or empty string
 */
function saveQRToDrive(memberId, qrUrl) {
  try {
    const folder   = getOrCreateDriveFolder("JILGM_QR_Codes");
    const response = UrlFetchApp.fetch(qrUrl);
    const blob     = response.getBlob().setName(memberId + "_QR.png");
    const file     = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getDownloadUrl();
  } catch (err) {
    logError("saveQRToDrive", err);
    return "";
  }
}


// =============================================================================
//  CONFIG HELPER
// =============================================================================

/**
 * Reads a value from the Config sheet by key.
 * Returns null if the key is not found or the Config sheet does not exist.
 *
 * @param {string} key
 * @returns {string|null}
 */
function getConfigValue(key) {
  try {
    const sheet = getSheet(SHEET_CONFIG);
    const rows  = getDataRows(sheet);
    const row   = rows.find(r => String(r[0]).trim().toLowerCase() === key.toLowerCase());
    return row ? String(row[1] || "").trim() : null;
  } catch (err) {
    return null; // Config sheet may not exist in older setups
  }
}


// =============================================================================
//  DAILY BIRTHDAY CHECK
//  Schedule via Triggers > checkBirthdaysDaily > Time-driven > Day timer (6-7am)
// =============================================================================

function checkBirthdaysDaily() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_MEMBERS);
  if (!sheet) return;

  var rows = sheet.getDataRange().getValues();
  var today = new Date();
  var todayMonth = today.getMonth();
  var todayDate = today.getDate();

  var birthdayMembers = [];
  for (var i = 1; i < rows.length; i++) {
    var bday = rows[i][COL_MEM.BIRTHDAY];
    var status = String(rows[i][COL_MEM.STATUS] || "").toLowerCase().trim();
    if (!bday || status === "inactive") continue;

    var bdayDate = new Date(bday);
    if (bdayDate.getMonth() === todayMonth && bdayDate.getDate() === todayDate) {
      var name = rows[i][COL_MEM.NAME];
      var age = today.getFullYear() - bdayDate.getFullYear();
      birthdayMembers.push({ name: name, age: age });
    }
  }

  if (birthdayMembers.length === 0) return;

  // Collect emails from Devices sheet (app users only)
  var allEmails = [];
  try {
    var devSheet = getOrCreateDevicesSheet();
    var devRows = devSheet.getDataRange().getValues();
    for (var j = 1; j < devRows.length; j++) {
      var devStatus = String(devRows[j][2] || "").trim();
      var devEmail = String(devRows[j][4] || "").trim();
      if (devEmail && devStatus === "Approved") allEmails.push(devEmail);
    }
  } catch (err) {}

  var adminEmail = getConfigValue("ADMIN_EMAIL") || ADMIN_EMAIL;
  if (adminEmail && allEmails.indexOf(adminEmail) === -1) allEmails.push(adminEmail);

  if (allEmails.length === 0) {
    Logger.log("checkBirthdaysDaily: No app user emails to send to.");
    return;
  }

  var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), "MMMM d, yyyy");
  var subject = "Birthday Today - " + dateStr;
  var html = '<div style="font-family:Arial,sans-serif;max-width:400px;padding:20px">'
    + '<h2 style="color:#d4a843;margin-bottom:16px">Birthday Celebration!</h2>'
    + '<p style="color:#666">The following members have birthdays today (' + dateStr + '):</p>'
    + '<ul style="padding-left:20px">';

  birthdayMembers.forEach(function(m) {
    html += '<li style="padding:4px 0"><strong>' + m.name + '</strong> - turns ' + m.age + '</li>';
  });

  html += '</ul>'
    + '<hr style="border:1px solid #eee;margin:16px 0">'
    + '<p style="color:#888;font-size:12px">Sent from FlockTrack Attendance Tracker</p>'
    + '</div>';

  MailApp.sendEmail({
    to: allEmails.join(","),
    subject: subject,
    htmlBody: html
  });

  Logger.log("Birthday email sent to " + allEmails.length + " recipients for " + birthdayMembers.length + " member(s).");
}

// =============================================================================
//  SHEET PROTECTION
//  Run once manually: protectAllSheets()
//  This prevents anyone (including you) from editing sheets directly.
//  Only the script (deployed as "Execute as: Me") can write to them.
// =============================================================================

function protectAllSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var me = Session.getEffectiveUser();
  var lockSheets = ["Members", "Attendance", "Reports"];

  lockSheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) { Logger.log("Sheet not found: " + name); return; }
    var protection = sheet.protect().setDescription('Locked by FlockTrack - ' + name);
    var editors = protection.getEditors();
    protection.removeEditors(editors);
    protection.addEditor(me);
    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
    Logger.log("Locked (read-only): " + name);
  });

  Logger.log("Members, Attendance, and Reports are now read-only. Only the script can edit them.");
}

function protectAllSheetsStrict() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheets = ss.getSheets();
  var me = Session.getEffectiveUser();

  sheets.forEach(function(sheet) {
    var protection = sheet.protect().setDescription('Strict protection - ' + sheet.getName());
    var editors = protection.getEditors();
    protection.removeEditors(editors);
    protection.addEditor(me);
    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  });

  Logger.log("All sheets strictly protected. Only script owner can edit.");
}

// =============================================================================
//  MONTHLY BACKUP
// =============================================================================

function monthlyBackup() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var file = DriveApp.getFileById(SHEET_ID);
  var parentFolder = file.getParents().next();

  var backupFolder;
  var folders = parentFolder.getFoldersByName("Backup");
  if (folders.hasNext()) {
    backupFolder = folders.next();
  } else {
    backupFolder = parentFolder.createFolder("Backup");
  }

  var now = new Date();
  var monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var backupName = monthNames[now.getMonth()] + now.getFullYear() + "_" + ss.getName();

  var copy = file.makeCopy(backupName, backupFolder);
  Logger.log("Monthly backup created: " + backupName);
}

function checkAndRunMonthlyBackup() {
  var now = new Date();
  var lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  var nextSunday = now.getDate() + (7 - now.getDay());
  if (nextSunday > lastDayOfMonth) {
    var props = PropertiesService.getScriptProperties();
    var key = "backup_" + now.getFullYear() + "_" + (now.getMonth() + 1);
    if (!props.getProperty(key)) {
      monthlyBackup();
      props.setProperty(key, "done");
    }
  }
}

// =============================================================================
//  FORM SUBMIT DEDUP TRIGGER
//  Set up: Triggers > onFormSubmit > From spreadsheet > On form submit
// =============================================================================

function nameParts(name) {
  return String(name || "").toLowerCase().replace(/\s+/g, " ").trim().split(" ");
}

function namesMatch(a, b) {
  var partsA = nameParts(a);
  var partsB = nameParts(b);
  if (partsA.length < 2 || partsB.length < 2) return false;
  var shorter = partsA.length <= partsB.length ? partsA : partsB;
  var longer = partsA.length <= partsB.length ? partsB : partsA;
  if (shorter.length / longer.length < 0.6) return false;
  var lastA = partsA[partsA.length - 1];
  var lastB = partsB[partsB.length - 1];
  if (lastA !== lastB) return false;
  for (var i = 0; i < shorter.length; i++) {
    if (longer.indexOf(shorter[i]) === -1) return false;
  }
  return true;
}



// =============================================================================
//  END OF FILE
// =============================================================================

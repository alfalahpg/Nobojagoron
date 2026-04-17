/**
 * Google Apps Script for "নব জাগরণ সমিতি" Digital Ledger
 * 
 * Instructions:
 * 1. Open a Google Sheet.
 * 2. Create a sheet named "Ledger".
 * 3. Add headers in Row 1: ID, Member, Payment Type, Amount, Month, Date, Reference
 * 4. Go to Extensions > Apps Script.
 * 5. Replace the code with the content below.
 * 6. Deploy as a Web App (Execute as: Me, Access: Anyone).
 * 7. Copy the Web App URL and set it as VITE_APPS_SCRIPT_URL in your environment.
 */

const SHEET_NAME = "Ledger";
const MEMBERS_SHEET_NAME = "Members";

function getMembersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(MEMBERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(MEMBERS_SHEET_NAME);
    sheet.appendRow(["Name"]);
    // Initial members from the provided list
    const initialMembers = [
      'মো: মোজাফফর', 'মায়মুনা (মুজাফফর)', 'মো: রাশিদুল ইসলাম', 
      'মো: মঞ্জুরুল হক - ১', 'মো: মঞ্জুরুল হক - ২', 'মো: আবু রায়হান', 
      'মো: মাহমুদ হাসান', 'সাওদা আক্তার (মাহমুদ হাসান)', 'মো: রমজান - ১', 
      'মো: রমজান - ২', 'মোঃ বাইজিদ-১', 'মোঃ রিদওয়ান-১', 
      'মোঃজাহিদ -১', 'মোঃমাহমুদুল হাসান-১', 'মোঃনাহিদ-১'
    ];
    initialMembers.forEach(m => sheet.appendRow([m]));
  }
  return sheet;
}

function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ entries: [], members: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const entries = rows.map((row, index) => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header.toLowerCase().replace(/ /g, "")] = row[i];
      });
      // Ensure ID exists
      if (!obj.id) obj.id = index + 1;
      return obj;
    });
    
    // Reverse to show newest first
    entries.reverse();
    
    // Fetch members
    const membersSheet = getMembersSheet();
    const membersData = membersSheet.getDataRange().getValues();
    const members = membersData.slice(1).map(row => row[0]).filter(m => m);
    
    return ContentService.createTextOutput(JSON.stringify({ entries, members }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const action = params.action || 'create';

    if (action === 'create') {
      const newRow = [
        Date.now().toString(), // ID
        params.member,
        params.paymentType,
        params.amount,
        params.month,
        new Date(), // Date
        params.reference || "" // Reference
      ];
      sheet.appendRow(newRow);
    } else if (action === 'renameMember') {
      const oldName = params.oldName;
      const newName = params.newName;
      
      if (!oldName || !newName) throw new Error("Missing oldName or newName");
      
      // Update Ledger sheet
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][1].toString() === oldName.toString()) {
          sheet.getRange(i + 1, 2).setValue(newName); 
        }
      }
      
      // Update Members sheet
      const membersSheet = getMembersSheet();
      const membersData = membersSheet.getDataRange().getValues();
      for (let i = 1; i < membersData.length; i++) {
        if (membersData[i][0].toString() === oldName.toString()) {
          membersSheet.getRange(i + 1, 1).setValue(newName);
        }
      }
    } else if (action === 'addMember') {
      const name = params.name;
      if (!name) throw new Error("Missing name");
      const membersSheet = getMembersSheet();
      membersSheet.appendRow([name]);
    } else if (action === 'deleteMember') {
      const name = params.name;
      if (!name) throw new Error("Missing name");
      
      const membersSheet = getMembersSheet();
      const membersData = membersSheet.getDataRange().getValues();
      for (let i = membersData.length - 1; i >= 1; i--) {
        if (membersData[i][0].toString() === name.toString()) {
          membersSheet.deleteRow(i + 1);
        }
      }
    } else if (action === 'resetLedger') {
      const sheet = ss.getSheetByName(SHEET_NAME);
      if (sheet) {
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.deleteRows(2, lastRow - 1);
        }
      }
    } else if (action === 'update' || action === 'delete') {
      const data = sheet.getDataRange().getValues();
      const id = params.id;
      let rowIndex = -1;
      
      // Find row by ID (assuming ID is in column 1)
      for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString() === id.toString()) {
          rowIndex = i + 1; // 1-indexed for sheet
          break;
        }
      }
      
      if (rowIndex === -1) throw new Error("Entry not found with ID: " + id);
      
      if (action === 'update') {
        const updatedRow = [
          id,
          params.member,
          params.paymentType,
          params.amount,
          params.month,
          data[rowIndex-1][5], // Keep original date
          params.reference || "" // Reference
        ];
        sheet.getRange(rowIndex, 1, 1, 7).setValues([updatedRow]);
      } else if (action === 'delete') {
        sheet.deleteRow(rowIndex);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

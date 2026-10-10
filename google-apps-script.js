/**
 * ============================================================================
 * GOOGLE APPS SCRIPT FOR NEXTGENASTRO CONSULTATIONS & LEADS
 * ============================================================================
 * 
 * This script runs inside a Google Sheet. Whenever someone submits a 
 * consultation request on your website, this script will:
 * 1. Append a new row to your Google Sheet with all client details.
 * 2. Send an instant email alert to your Gmail address.
 * 
 * ----------------------------------------------------------------------------
 * HOW TO SET THIS UP (Takes 3-5 minutes):
 * ----------------------------------------------------------------------------
 * 1. Go to https://sheets.new to create a new Google Sheet (e.g. name it "NextGenAstro Inquiries").
 * 2. In the top menu of Google Sheets, click: Extensions > Apps Script
 * 3. Delete any default code in the editor, and paste this entire file content.
 * 4. Change RECIPIENT_EMAIL below to your email (e.g. indrajeetbhattacharya5@gmail.com).
 * 5. Click the "Save" icon (Floppy disk).
 * 6. Click the blue "Deploy" button at top right > "New deployment".
 * 7. Click the gear icon next to "Select type" and choose "Web app".
 * 8. Set the following settings:
 *      - Description: "NextGenAstro Webhook"
 *      - Execute as: "Me" (your Google account)
 *      - Who has access: "Anyone" (crucial so your app server can deliver data)
 * 9. Click "Deploy".
 * 10. Click "Authorize access", sign into your Google account, click "Advanced" > "Go to NextGenAstro (unsafe)" > "Allow".
 * 11. Copy the "Web app URL" (it looks like: https://script.google.com/macros/s/AKfycb.../exec).
 * 12. Add that URL to your environment variables or .env file as:
 *     GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
 * ============================================================================
 */

// Your notification email address
const RECIPIENT_EMAIL = 'indrajeetbhattacharya5@gmail.com';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No payload received' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'consultation') {
      // 1. Get or create "Consultations" sheet tab
      let sheet = ss.getSheetByName('Consultations');
      if (!sheet) {
        sheet = ss.insertSheet('Consultations');
        sheet.appendRow([
          'Reference ID',
          'Date & Time',
          'Name',
          'Email',
          'Phone',
          'Preferred Contact',
          'Topic',
          'Question',
          'Timezone',
          'Availability',
          'Birth Date',
          'Birth Time',
          'Birth Place',
          'Status'
        ]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, 14).setFontWeight('bold').setBackground('#f0f4f8');
      }

      // 2. Append client record
      sheet.appendRow([
        data.id || 'N/A',
        new Date().toLocaleString(),
        data.name || '',
        data.email || '',
        data.phone || '',
        data.contactMethod || 'email',
        data.topic || '',
        data.question || '',
        data.timezone || '',
        data.availability || '',
        data.birthDate || '',
        data.birthTime || '',
        data.birthPlace || '',
        'Pending'
      ]);

      // 3. Send email notification to you
      const subject = `[NextGenAstro] New Consultation Request from ${data.name} (#${data.id})`;
      const body = 
`Hello Indrajeet,

You have received a new consultation request on NextGenAstro!

---------------------------------------------------------
CLIENT DETAILS:
---------------------------------------------------------
• Reference ID: #${data.id}
• Name: ${data.name}
• Email: ${data.email}
• Phone: ${data.phone || 'Not provided'}
• Preferred Contact: ${data.contactMethod}
• Topic: ${data.topic}
• Client Timezone: ${data.timezone}
• Availability: ${data.availability || 'Not specified'}

---------------------------------------------------------
QUESTION / INQUIRY:
---------------------------------------------------------
${data.question}

---------------------------------------------------------
BIRTH DETAILS (FOR CHART READING):
---------------------------------------------------------
${data.shareBirthDetails ? `• Date: ${data.birthDate}\n• Time: ${data.birthTime}\n• Place: ${data.birthPlace}` : 'Client opted not to include chart details.'}

---------------------------------------------------------
You can reply directly to this email or to ${data.email}.
All requests are also stored in your Google Sheet and the website's Consultations Inbox.
`;

      MailApp.sendEmail({
        to: RECIPIENT_EMAIL,
        replyTo: data.email,
        subject: subject,
        body: body
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

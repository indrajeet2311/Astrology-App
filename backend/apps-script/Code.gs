const RECIPIENT = 'ibtnextgen@gmail.com';
const TOKEN_PROPERTY = 'CELESTIA_WEBHOOK_TOKEN';

/** Run once from the editor to grant this script permission to send mail. */
function authorizeEmailSending() {
  MailApp.getRemainingDailyQuota();
}

/** Public web-app entry point. The shared token is stored in Script Properties. */
function doPost(event) {
  const payload = JSON.parse(event.postData.contents || '{}');
  const expectedToken = PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);

  if (!expectedToken || !payload.token || payload.token !== expectedToken) {
    throw new Error('Unauthorized request.');
  }

  if (payload.type === 'consultation') {
    sendConsultation(payload);
  } else if (payload.type === 'chartLead') {
    sendChartLead(payload);
  } else {
    throw new Error('Unsupported email type.');
  }

  return ContentService.createTextOutput('OK');
}

function sendConsultation(request) {
  const topic = requiredText(request.topic, 'Guidance area', 100);
  const replyTo = requiredText(request.email, 'Email', 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) {
    throw new Error('Invalid reply email.');
  }

  const body = [
    'Private astrologer consultation request',
    '',
    'Name: ' + optionalText(request.name, 100, 'Not provided'),
    'Email: ' + replyTo,
    'Phone: ' + optionalText(request.phone, 40, 'Not provided'),
    'Preferred contact: ' + optionalText(request.contactMethod, 10, 'email'),
    'Guidance area: ' + topic,
    'Timezone: ' + optionalText(request.timezone, 80, 'Unknown'),
    'Availability: ' + optionalText(request.availability, 300, 'To be arranged'),
    '',
    'Question / context:',
    requiredText(request.question, 'Question', 2000),
  ];

  if (request.shareBirthDetails && request.birthDate) {
    body.push('', 'Birth chart: ' + optionalText(request.birthDate, 10, '') + ' '
      + optionalText(request.birthTime, 5, '') + ', '
      + optionalText(request.birthPlace, 200, ''));
  }

  MailApp.sendEmail({
    to: RECIPIENT,
    replyTo: replyTo,
    subject: 'Private consultation request: ' + topic,
    body: body.join('\n'),
  });
}

function sendChartLead(lead) {
  const body = [
    'A visitor just generated a birth chart on NextGenAstro.',
    '',
    'Name: ' + optionalText(lead.name, 100, 'Not provided'),
    'Date of birth: ' + optionalText(lead.date, 10, 'Unknown'),
    'Time of birth: ' + optionalText(lead.time, 5, 'Unknown'),
    'Birthplace: ' + optionalText(lead.placeName, 200, 'Unknown'),
    'Timezone: ' + optionalText(lead.timeZone, 80, 'Unknown'),
  ];
  MailApp.sendEmail({
    to: RECIPIENT,
    subject: 'New chart generated on NextGenAstro',
    body: body.join('\n'),
  });
}

function requiredText(value, label, maxLength) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text.length > maxLength) {
    throw new Error(label + ' is missing or too long.');
  }
  return text;
}

function optionalText(value, maxLength, fallback) {
  const text = String(value == null ? '' : value).trim();
  return text ? text.slice(0, maxLength) : fallback;
}

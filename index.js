const axios = require('axios');
const fs = require('fs');
const path = require('path');

const token = '';
const AUTH_TOKEN = 'L60sBO2';

const now = new Date();
const logFileName = `log_${now.toISOString().replace(/:/g, '-')}.txt`;
const logFilePath = path.join(__dirname, logFileName);
const auditServiceUrl = 'https://us-central1-jsd-clients.cloudfunctions.net/spend-limit-logs';

const accounts = [
  { id: '607292448134040', amount: 1 },
  { id: '657824556383965', amount: 1 }
];

// El resto del script permanece igual
async function auditAccountUpdate(accountId, lastStatus, errorMessage) {
  const data = {
    account_id: accountId,
    last_account_limit_updated: new Date().toISOString(),
    updated_by: 'root',
    error_message: errorMessage || '',
    last_status: lastStatus
  };

  try {
    await axios.post(auditServiceUrl, data, {
      headers: {
        'Authorization': 'Basic 6L60sBO2',  
        'Content-Type': 'application/json'
      }
    });
    logToFile(`Audit logged successfully for account ${accountId}`);
  } catch (error) {
    logToFile(`Error logging audit for account ${accountId}: ${error.message}`);
  }
}

function logToFile(message) {
  fs.appendFileSync(logFilePath, `${message}\n`, 'utf8');
  console.log(message);
}

async function setSpendCap(account) {
  try {
    const spendCapInDollars = account.amount;

    logToFile(`Account ID: ${account.id}`);
    logToFile(`Setting Spend Cap to: ${spendCapInDollars} dollars`);

    await axios.post(`https://graph.facebook.com/v20.0/act_${account.id}`, {
      spend_cap: spendCapInDollars 
    }, {
      params: {
        access_token: token
      }
    });

    logToFile(`Spend cap set to $${spendCapInDollars} for account ${account.id}.`);
    await auditAccountUpdate(account.id, 1, '');  
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
    await auditAccountUpdate(account.id, 0, errorMessage);  // Failed update
    if (error.response) {
      logToFile(`Error processing account ${account.id}: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      logToFile(`Error processing account ${account.id}: ${error.message}`);
    }
  }
}

async function processAccounts() {
  try {
    for (const account of accounts) {
      await setSpendCap(account); 
    }
  } catch (error) {
    logToFile(`Error processing accounts: ${error.message}`);
  }
}

processAccounts().then(() => {
  logToFile('All accounts processed.');
});

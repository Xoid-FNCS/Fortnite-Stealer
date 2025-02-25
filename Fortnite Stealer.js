import axios from 'axios';
import blessed from 'blessed';
import fs from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOKEN_URL = "https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token";
const DEVICE_AUTH_URL = "https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/deviceAuthorization";
const CLIENT_CREDENTIALS = "Basic OThmN2U0MmMyZTNhNGY4NmE3NGViNDNmYmI0MWVkMzk6MGEyNDQ5YTItMDAxYS00NTFlLWFmZWMtM2U4MTI5MDFjNGQ3";

const configFilePath = './config.json';
let config = {
  autoChangeName: false,
  newName: ''
};

if (fs.existsSync(configFilePath)) {
  config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
} else {
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
}

const screen = blessed.screen({
  smartCSR: true,
  title: 'Fortnite Tool'
});

const logBox = blessed.log({
  top: '0',
  left: '0',
  width: '100%',
  height: '95%',
  border: {
    type: 'line'
  },
  style: {
    fg: 'blue',
    border: {
      fg: 'blue'
    }
  },
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  vi: true
});

const titleArt = `
  ______         _         _ _          _____ _             _           
 |  ____|       | |       (_) |        / ____| |           | |          
 | |__ ___  _ __| |_ _ __  _| |_ ___  | (___ | |_ ___  __ _| | ___ _ __ 
 |  __/ _ \\| '__| __| '_ \\| | __/ _ \\  \\___ \\| __/ _ \\/ _\` | |/ _ \\ '__|
 | | | (_) | |  | |_| | | | | ||  __/  ____) | ||  __/ (_| | |  __/ |   
 |_|  \\___/|_|   \\__|_| |_|_|\__\\___| |_____/ \\__\\___|\\__,_|_|\\___|_|   
`;

const menuOptions = [
  'Generate Link',
  'Activate Auto Name Change',
  'Deactivate Auto Name Change',
  'Exit'
];

let currentSelection = 0;

screen.append(logBox);

const displayLog = (text) => {
  logBox.log(text);
  screen.render();
};

const waitForAuthorization = async (deviceCode) => {
  displayLog(chalk.yellow('│Waiting for confirm button to be pressed...'));
  let authorizationReceived = false;

  while (!authorizationReceived) {
    try {
      const tokenExchangeResponse = await axios.post(TOKEN_URL, `grant_type=device_code&device_code=${deviceCode}&token_type=eg1`, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": CLIENT_CREDENTIALS
        }
      });

      if (tokenExchangeResponse.status === 200) {
        const loggedInData = tokenExchangeResponse.data;

        if (loggedInData.access_token) {
          const userInfoResponse = await axios.get(`https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${loggedInData.account_id}`, {
            headers: { "Authorization": `Bearer ${loggedInData.access_token}` }
          });

          const userInfo = userInfoResponse.data;

          const exchangeResponse = await axios.get(`https://account-public-service-prod.ol.epicgames.com/account/api/oauth/exchange`, {
            headers: {
              "Authorization": `Bearer ${loggedInData.access_token}`
            }
          });

          const code = exchangeResponse.data.code;
          const loginLink = `https://www.epicgames.com/id/exchange?exchangeCode=${code}`;

          displayLog(chalk.cyan(`
          Display Name: ${userInfo.displayName}
          Email: ${userInfo.email}
          Country: ${userInfo.country}
          Full Name: ${userInfo.Name} ${userInfo.lastName}
          Preferred Language: ${userInfo.preferredLanguage}
          2FA Enabled: ${userInfo.tfaEnabled ? 'Yes' : 'No'}
          Email Verified: ${userInfo.emailVerified ? 'Yes' : 'No'}
          Display Name Changes: ${userInfo.numberOfDisplayNameChanges}
          Can Update Display Name: ${userInfo.canUpdateDisplayName ? 'Yes' : 'No'}
          Login Link: ${loginLink}
          `));

          if (config.autoChangeName) {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const newDisplayName = `${config.newName}${randomSuffix}`;

            try {
              const changeNameResponse = await axios.put(`https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${loggedInData.account_id}`,
                { displayName: newDisplayName },
                { headers: { "Authorization": `Bearer ${loggedInData.access_token}` } });

              if (changeNameResponse.status === 200) {
                displayLog(chalk.green(`Display name changed to: ${newDisplayName}`));
              } else {
                displayLog(chalk.red(`Failed to change display name.`));
              }
            } catch (error) {
              displayLog(chalk.red(`Error changing display name: ${error.message}`));
            }
          }

          authorizationReceived = true;
        }
      }
    } catch (error) {
      if (error.response && error.response.status !== 400) {
        displayLog(chalk.red(`Polling error: ${error.message}`));
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

const generateLinkAndPoll = async () => {
  displayLog(chalk.yellow('Please wait, generating link...'));
  try {
    const tokenResponse = await axios.post(TOKEN_URL, "grant_type=client_credentials", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": CLIENT_CREDENTIALS
      }
    });

    const accessToken = tokenResponse.data.access_token;

    const deviceAuthResponse = await axios.post(DEVICE_AUTH_URL, "prompt=login", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    const deviceCode = deviceAuthResponse.data.device_code;
    const verificationUrl = `https://www.epicgames.com/id/activate?userCode=${deviceAuthResponse.data.user_code}`;

    displayLog(chalk.blue(`Link: ${verificationUrl}`));

    await waitForAuthorization(deviceCode);

  } catch (error) {
    displayLog(chalk.red(`Error: ${error.message}`));
  }
};

const navigateMenu = (direction) => {
  currentSelection += direction;
  
  if (currentSelection < 0) currentSelection = 0;
  if (currentSelection >= menuOptions.length) currentSelection = menuOptions.length - 1;

  renderMenu();
};

const renderMenu = () => {
  logBox.setContent(titleArt + '\nSelect an option:\n' + 
    menuOptions.map((option, index) => (index === currentSelection ? `> ${option}` : `  ${option}`)).join('\n'));
  
  if (currentSelection === 0) {
    generateLinkAndPoll(); 
  }

  screen.render();
};

const handleSelection = async () => {
  switch (currentSelection) {
    case 1:
      openInputDialog();
      break;
    case 2:
      deactivateAutoNameChange();
      break;
    case 3:
      displayLog(chalk.green('Exiting...'));
      process.exit(0);
      break;
  }
};

const openInputDialog = () => {
  const inputBox = blessed.textbox({
    top: 'center',
    left: 'center',
    width: '50%',
    height: '10%',
    label: ' Enter New Display Name ',
    border: {
      type: 'line',
      fg: 'cyan'
    },
    style: {
      border: {
        fg: 'cyan'
      },
      fg: 'white',
      bg: 'black'
    },
    inputOnFocus: true
  });

  screen.append(inputBox);
  inputBox.focus();

  inputBox.on('submit', () => {
    const newName = inputBox.getValue().trim();

    if (!newName) {
      displayLog(chalk.red('No display name entered.'));
    } else {
      config.newName = newName;
      config.autoChangeName = true;
      fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
      displayLog(chalk.green(`Auto name change activated with prefix: ${config.newName}`));
    }

    screen.remove(inputBox);
    screen.render();
  });

  inputBox.on('cancel', () => {
    screen.remove(inputBox);
    screen.render();
  });

  screen.render();
};

const deactivateAutoNameChange = () => {
  config.autoChangeName = false;
  config.newName = '';
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
  displayLog(chalk.yellow('Auto name change deactivated.'));
};

const start = async () => {
  screen.append(logBox);
  renderMenu(); 

  screen.key(['w', 'up'], () => navigateMenu(-1));
  screen.key(['s', 'down'], () => navigateMenu(1));
  screen.key(['enter'], () => handleSelection());
  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

  screen.render();
};

start();

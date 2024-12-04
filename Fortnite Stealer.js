import axios from 'axios';
import readline from 'readline';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TOKEN_URL = "https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token";
const DEVICE_AUTH_URL = "https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/deviceAuthorization";
const CLIENT_CREDENTIALS = "Basic OThmN2U0MmMyZTNhNGY4NmE3NGViNDNmYmI0MWVkMzk6MGEyNDQ5YTItMDAxYS00NTFlLWFmZWMtM2U4MTI5MDFjNGQ3";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const displayHeader = () => {
    console.log(chalk.magenta(
        '  ______         _         _ _          _____ _             _           \n' +
        ' |  ____|       | |       (_) |        / ____| |           | |          \n' +
        ' | |__ ___  _ __| |_ _ __  _| |_ ___  | (___ | |_ ___  __ _| | ___ _ __ \n' +
        ' |  __/ _ \\| \'_  | __| \'_ \\| | __/ _ \\  \\___ \\| __/ _ \\/ _ | |/ _ \\ \'__|\n' +
        ' | | | (_) | |  | |_| | | | | ||  __/  ____) | ||  __/ (_| | |  __/ |   \n' +
        ' |_|  \\___/|_|   \\__|_| |_|_|\\__\\___| |_____/ \\__\\___|\\__,_|_|\\___|_|   \n' +
        '                                                                     '
    ));
};

async function generateLinkAndPoll() {
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
        const userCode = deviceAuthResponse.data.user_code;
        const verificationUrl = `https://www.epicgames.com/id/activate?userCode=${userCode}`;

        console.log(chalk.blue(`Link: ${verificationUrl}`));

        const startTime = Date.now();
        let authorizationReceived = false;

        let exchangeCode = null;

        let loginLink = null;

        while (!authorizationReceived && (Date.now() - startTime < 2 * 60 * 1000)) {
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
                        exchangeCode = loggedInData.exchangeCode;

                        const exchangeResponse = await axios.get(`https://account-public-service-prod.ol.epicgames.com/account/api/oauth/exchange`, {
                            headers: {
                                "Authorization": `Bearer ${loggedInData.access_token}`
                            }
                        });

                        const code = exchangeResponse.data.code;
                        loginLink = `https://www.epicgames.com/id/exchange?exchangeCode=${code}`;

                        console.log(formatUserInfo(userInfo, exchangeCode));
                        console.log(chalk.bgCyan(`${loginLink}`));

                        const fileName = `${userInfo.displayName}.json`;
                        const filePath = `${__dirname}/${fileName}`;
                        const data = {
                            displayName: userInfo.displayName,
                            loginLink: loginLink
                        };

                        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                        console.log(chalk.green(`Login link saved to ${fileName}`));

                        authorizationReceived = true;
                    }
                }
            } catch (error) {
                if (error.response && error.response.status !== 400) {
                    console.error(chalk.red(`Polling error: ${error.message}`));
                }
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (!authorizationReceived) {
            console.log(chalk.yellow("Authorization timeout"));
        }

        await generateLinkAndPoll();
    } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
    }
}

const formatUserInfo = (userInfo, exchangeCode) => {
    return chalk.cyan(`
    Display Name: ${userInfo.displayName}
    Email: ${userInfo.email}
    Country: ${userInfo.country}
    Full Name: ${userInfo.name} ${userInfo.lastName}
    Preferred Language: ${userInfo.preferredLanguage}
    2FA Enabled: ${userInfo.tfaEnabled ? 'Yes' : 'No'}
    Email Verified: ${userInfo.emailVerified ? 'Yes' : 'No'}
    Display Name Changes: ${userInfo.numberOfDisplayNameChanges}
    Can Update Display Name: ${userInfo.canUpdateDisplayName ? 'Yes' : 'No'}
    `);
};

async function start() {
    displayHeader();
    await generateLinkAndPoll();
}

start();

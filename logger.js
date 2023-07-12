/*
    Caleb, KO4UYJ
    Send DVMFNE2 audio to a webpage in a fancy xtl format
*/
function getUTCDateTimeString() {
    const now = new Date();
    return now.toISOString();
}

function log(level, message) {
    const timestamp = getUTCDateTimeString();
    const formattedMessage = `[${level.toUpperCase()}] [${timestamp}] ${message}`;

    console.log(formattedMessage);
}

const logger = {
    debug: (message) => log('debug', message),
    warn: (message) => log('warn', message),
    error: (message) => log('error', message),
    info: (message) => log('info', message)
};

export default logger;
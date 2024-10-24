const ngrok = require('ngrok');

let ngrokUrl;

const startNgrokClient = async (localPort) => {
    try {
        ngrokUrl = await ngrok.connect(localPort);
        return ngrokUrl;
    } catch (error) {
        console.error(`Failed to start ngrok: ${error.message}`);
        throw error;
    }
};

const stopNgrokClient = async () => {
    try {
        await ngrok.disconnect();
        await ngrok.kill();
        console.log('ngrok tunnel stopped.');
    } catch (error) {
        console.error(`Failed to stop ngrok: ${error.message}`);
    }
};

module.exports = { startNgrokClient, stopNgrokClient };
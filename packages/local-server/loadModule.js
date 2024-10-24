module.exports = function loadModule(handlerPath) {
    if (!handlerPath) {
        throw new Error('Handler path is required');
    }
    // Clear the require cache to ensure the latest version of the handler module is loaded
    delete require.cache[require.resolve(handlerPath)];
    const handlerModule = require(handlerPath);

    return handlerModule;
};  
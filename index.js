// Wrap in IIFE for proper execution
(async () => {
    try {
        await main();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();